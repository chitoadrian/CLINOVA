-- CLINOVA / PostgreSQL. Aplicar solo al proyecto CLINOVA.
-- El API de escritura es la Edge Function autenticada; sus RPC son service_role.
CREATE SCHEMA IF NOT EXISTS clinova;
REVOKE ALL ON SCHEMA clinova FROM public, anon, authenticated;
GRANT USAGE ON SCHEMA clinova TO service_role;
CREATE TABLE clinova.roles(name text PRIMARY KEY CHECK(name IN ('Administrador','Enfermero','Fisioterapeuta')));
INSERT INTO clinova.roles VALUES ('Administrador'),('Enfermero'),('Fisioterapeuta');
CREATE TABLE clinova.members(
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 local_user_id uuid NOT NULL UNIQUE,
 role text NOT NULL REFERENCES clinova.roles(name),
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE clinova.invitations(
 token_hash text PRIMARY KEY CHECK(length(token_hash)=64),
 role text NOT NULL REFERENCES clinova.roles(name),
 email text,
 local_user_id uuid,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days',
 used_at timestamptz,
 created_by uuid REFERENCES auth.users(id)
);
CREATE TABLE clinova.records(
 id uuid PRIMARY KEY,
 kind text NOT NULL CHECK(kind IN ('patient','encounter','kardex','bed','admission','routine','evolution')),
 area text NOT NULL CHECK(area IN ('Enfermería','Fisioterapia')),
 patient_id uuid REFERENCES clinova.records(id) DEFERRABLE INITIALLY DEFERRED,
 reference_id uuid REFERENCES clinova.records(id) DEFERRABLE INITIALLY DEFERRED,
 payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
 revision bigint NOT NULL CHECK(revision>0),
 sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 updated_by uuid NOT NULL REFERENCES auth.users(id),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((kind IN ('patient','bed') AND patient_id IS NULL) OR (kind NOT IN ('patient','bed') AND patient_id IS NOT NULL)),
 CHECK(payload->>'id'=id::text),
 CHECK(kind NOT IN ('admission','evolution') OR reference_id IS NOT NULL)
);
CREATE INDEX records_patient_idx ON clinova.records(patient_id);
CREATE INDEX records_reference_idx ON clinova.records(reference_id);
CREATE INDEX records_area_sequence_idx ON clinova.records(area,sequence);
CREATE INDEX members_role_idx ON clinova.members(role);
CREATE TABLE clinova.revisions(
 record_id uuid NOT NULL REFERENCES clinova.records(id),
 revision bigint NOT NULL,
 document jsonb NOT NULL,
 actor_id uuid NOT NULL REFERENCES auth.users(id),
 recorded_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(record_id,revision)
);
CREATE TABLE clinova.receipts(
 operation_id uuid PRIMARY KEY,
 actor_id uuid NOT NULL REFERENCES auth.users(id),
 request jsonb NOT NULL,
 response jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX receipts_actor_idx ON clinova.receipts(actor_id);
CREATE INDEX revisions_actor_idx ON clinova.revisions(actor_id);
CREATE INDEX records_updated_by_idx ON clinova.records(updated_by);
CREATE INDEX invitations_created_by_idx ON clinova.invitations(created_by);
CREATE INDEX invitations_role_idx ON clinova.invitations(role);
ALTER TABLE clinova.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinova.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinova.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinova.records ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinova.revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinova.receipts ENABLE ROW LEVEL SECURITY;
-- No se concede acceso anon/authenticated a este esquema privado.
-- Las políticas son defensa adicional para futuras consultas autenticadas.
CREATE POLICY own_membership ON clinova.members FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()) AND active);
CREATE POLICY permitted_records ON clinova.records FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM clinova.members m WHERE m.user_id=(SELECT auth.uid()) AND m.active AND (m.role='Administrador' OR (m.role='Enfermero' AND area='Enfermería') OR (m.role='Fisioterapeuta' AND area='Fisioterapia'))));
GRANT ALL ON ALL TABLES IN SCHEMA clinova TO service_role;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA clinova TO service_role;

CREATE FUNCTION public.clinova_profile(p_user uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT to_jsonb(m) FROM clinova.members m WHERE m.user_id=p_user AND m.active;
$$;
CREATE FUNCTION public.clinova_invite(p_user uuid,p_hash text,p_role text,p_email text,p_local uuid) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM clinova.members WHERE user_id=p_user AND role='Administrador' AND active) THEN RAISE EXCEPTION 'Solo el administrador puede invitar'; END IF;
 INSERT INTO clinova.invitations(token_hash,role,email,local_user_id,created_by) VALUES(p_hash,p_role,lower(p_email),p_local,p_user);
 RETURN true;
END $$;
CREATE FUNCTION public.clinova_accept_invite(p_hash text,p_user uuid,p_local uuid,p_email text) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE i clinova.invitations;
BEGIN
 SELECT * INTO i FROM clinova.invitations WHERE token_hash=p_hash FOR UPDATE;
 IF i.token_hash IS NULL OR i.used_at IS NOT NULL OR i.expires_at<now() OR (i.email IS NOT NULL AND i.email<>lower(p_email)) OR (i.local_user_id IS NOT NULL AND i.local_user_id<>p_local) THEN RAISE EXCEPTION 'Invitación inválida o vencida'; END IF;
 INSERT INTO clinova.members(user_id,local_user_id,role) VALUES(p_user,p_local,i.role);
 UPDATE clinova.invitations SET used_at=now() WHERE token_hash=p_hash;
 RETURN jsonb_build_object('role',i.role,'local_user_id',p_local);
END $$;
CREATE FUNCTION clinova.document(r clinova.records) RETURNS jsonb LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT jsonb_build_object('id',r.id,'kind',r.kind,'area',r.area,'patient_id',r.patient_id,'reference_id',r.reference_id,'payload',r.payload,'revision',r.revision,'sequence',r.sequence);
$$;
CREATE FUNCTION public.clinova_exchange(p_user uuid,p_local uuid,p_pending jsonb,p_cursor bigint) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE m clinova.members; old clinova.records; r clinova.records; parent clinova.records;
 change jsonb; d jsonb; receipt clinova.receipts; answer jsonb; acks jsonb='[]'; incoming jsonb; last_seq bigint; entity uuid; expected bigint; op uuid; more boolean;
BEGIN
 SELECT * INTO m FROM clinova.members WHERE user_id=p_user AND active;
 IF m.user_id IS NULL THEN RAISE EXCEPTION 'Cuenta no vinculada o desactivada'; END IF;
 IF jsonb_typeof(p_pending)<>'array' OR jsonb_array_length(p_pending)>50 OR p_cursor<0 THEN RAISE EXCEPTION 'Lote inválido'; END IF;
 -- Serializa escrituras y lectura del cursor para no saltar transacciones sin confirmar.
 PERFORM pg_advisory_xact_lock(731026);
 FOR change IN SELECT * FROM jsonb_array_elements(p_pending) LOOP
  d=change->'doc'; entity=(d->>'id')::uuid; expected=(change->>'base_revision')::bigint; op=(change->>'op_id')::uuid;
  IF expected<0 OR (change->>'id')::uuid<>entity THEN RAISE EXCEPTION 'Operación inválida'; END IF;
  IF NOT (m.role='Administrador' OR (m.role='Enfermero' AND d->>'area'='Enfermería') OR (m.role='Fisioterapeuta' AND d->>'area'='Fisioterapia')) THEN RAISE EXCEPTION 'Área no autorizada'; END IF;
  SELECT * INTO receipt FROM clinova.receipts WHERE operation_id=op;
  IF FOUND THEN
   IF receipt.actor_id<>p_user OR receipt.request<>change THEN RAISE EXCEPTION 'Identificador de operación reutilizado'; END IF;
   acks=acks||jsonb_build_array(receipt.response); CONTINUE;
  END IF;
  SELECT * INTO old FROM clinova.records WHERE id=entity;
  IF old.id IS NOT NULL AND (old.kind<>d->>'kind' OR old.area<>d->>'area' OR old.patient_id IS DISTINCT FROM (d->>'patient_id')::uuid) THEN RAISE EXCEPTION 'Tipo, área y paciente inmutables'; END IF;
  IF (old.id IS NOT NULL AND old.revision<>expected) OR (old.id IS NULL AND expected<>0) THEN
   IF old.id IS NULL THEN RAISE EXCEPTION 'No existe la versión base'; END IF;
   answer=jsonb_build_object('id',entity,'op_id',op,'status','conflict','reason','La versión del servidor cambió','document',clinova.document(old));
  ELSE
   IF d->>'patient_id' IS NOT NULL THEN
    SELECT * INTO parent FROM clinova.records WHERE id=(d->>'patient_id')::uuid;
    IF parent.id IS NULL OR parent.kind<>'patient' OR parent.area<>d->>'area' THEN RAISE EXCEPTION 'Paciente remoto no disponible'; END IF;
   END IF;
   IF d->>'kind'='bed' THEN
    IF EXISTS(SELECT 1 FROM clinova.records x WHERE x.kind='bed' AND x.id<>entity AND x.payload->>'deleted_at' IS NULL AND lower(x.payload#>>'{values,code}')=lower(d#>>'{payload,values,code}')) THEN RAISE EXCEPTION 'Código de cama duplicado'; END IF;
    IF (d#>>'{payload,deleted_at}' IS NOT NULL OR d#>>'{payload,values,state}'='Mantenimiento') AND EXISTS(SELECT 1 FROM clinova.records x WHERE x.kind='admission' AND x.reference_id=entity AND x.payload->>'deleted_at' IS NULL AND coalesce(x.payload#>>'{values,discharged_at}','')='') THEN RAISE EXCEPTION 'Cama con ingreso activo'; END IF;
   END IF;
   IF d->>'kind'='patient' AND d#>>'{payload,deleted_at}' IS NOT NULL AND EXISTS(SELECT 1 FROM clinova.records x WHERE x.kind='admission' AND x.patient_id=entity AND x.payload->>'deleted_at' IS NULL AND coalesce(x.payload#>>'{values,discharged_at}','')='') THEN RAISE EXCEPTION 'Paciente hospitalizado: registrar alta'; END IF;
   IF d->>'reference_id' IS NOT NULL THEN
    SELECT * INTO parent FROM clinova.records WHERE id=(d->>'reference_id')::uuid;
    IF parent.id IS NULL OR parent.area<>d->>'area' THEN RAISE EXCEPTION 'Referencia no disponible'; END IF;
    IF (d->>'kind'='admission' AND (parent.kind<>'bed' OR (coalesce(d#>>'{payload,values,discharged_at}','')='' AND d#>>'{payload,deleted_at}' IS NULL AND (parent.payload#>>'{values,state}'='Mantenimiento' OR parent.payload->>'deleted_at' IS NOT NULL)))) OR (d->>'kind'='routine' AND (parent.kind<>'encounter' OR parent.patient_id IS DISTINCT FROM (d->>'patient_id')::uuid)) OR (d->>'kind'='evolution' AND (parent.kind<>'routine' OR parent.patient_id IS DISTINCT FROM (d->>'patient_id')::uuid)) THEN RAISE EXCEPTION 'Relación clínica inválida'; END IF;
   END IF;
   IF d->>'kind'='admission' AND d#>>'{payload,deleted_at}' IS NULL AND coalesce(d#>>'{payload,values,discharged_at}','')='' AND EXISTS(SELECT 1 FROM clinova.records x WHERE x.kind='admission' AND x.id<>entity AND x.payload->>'deleted_at' IS NULL AND coalesce(x.payload#>>'{values,discharged_at}','')='' AND (x.reference_id=(d->>'reference_id')::uuid OR x.patient_id=(d->>'patient_id')::uuid)) THEN RAISE EXCEPTION 'Cama o paciente ya ocupado en servidor; cambia la cama o registra el alta'; END IF;
   IF old.id IS NULL THEN
    INSERT INTO clinova.records(id,kind,area,patient_id,reference_id,payload,revision,updated_by) VALUES(entity,d->>'kind',d->>'area',(d->>'patient_id')::uuid,(d->>'reference_id')::uuid,d->'payload',1,p_user) RETURNING * INTO r;
   ELSE
    UPDATE clinova.records SET payload=d->'payload',reference_id=(d->>'reference_id')::uuid,revision=revision+1,sequence=DEFAULT,updated_by=p_user,updated_at=now() WHERE id=entity RETURNING * INTO r;
   END IF;
   INSERT INTO clinova.revisions(record_id,revision,document,actor_id) VALUES(entity,r.revision,clinova.document(r),p_user);
   answer=jsonb_build_object('id',entity,'op_id',op,'status','applied','document',clinova.document(r));
  END IF;
  INSERT INTO clinova.receipts(operation_id,actor_id,request,response) VALUES(op,p_user,change,answer);
  acks=acks||jsonb_build_array(answer);
 END LOOP;
 SELECT coalesce(jsonb_agg(clinova.document(x) ORDER BY sequence),'[]'::jsonb),max(sequence) INTO incoming,last_seq FROM (SELECT * FROM clinova.records WHERE sequence>p_cursor AND (m.role='Administrador' OR (m.role='Enfermero' AND area='Enfermería') OR (m.role='Fisioterapeuta' AND area='Fisioterapia')) ORDER BY sequence LIMIT 200) x;
 more=jsonb_array_length(incoming)=200;
 WITH RECURSIVE selected AS (SELECT x.* FROM clinova.records x WHERE x.id IN (SELECT (j->>'id')::uuid FROM jsonb_array_elements(incoming) j) UNION SELECT ancestor.* FROM clinova.records ancestor JOIN selected child ON ancestor.id=child.patient_id OR ancestor.id=child.reference_id) SELECT coalesce(jsonb_agg(clinova.document(x) ORDER BY CASE kind WHEN 'patient' THEN 0 WHEN 'bed' THEN 1 WHEN 'encounter' THEN 2 WHEN 'routine' THEN 3 ELSE 4 END, sequence),'[]'::jsonb) INTO incoming FROM selected x;
 RETURN jsonb_build_object('acknowledgements',acks,'changes',incoming,'cursor',coalesce(last_seq,p_cursor),'has_more',more);
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA clinova FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA clinova TO service_role;
REVOKE ALL ON FUNCTION public.clinova_profile(uuid),public.clinova_invite(uuid,text,text,text,uuid),public.clinova_accept_invite(text,uuid,uuid,text),public.clinova_exchange(uuid,uuid,jsonb,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.clinova_profile(uuid),public.clinova_invite(uuid,text,text,text,uuid),public.clinova_accept_invite(text,uuid,uuid,text),public.clinova_exchange(uuid,uuid,jsonb,bigint) TO service_role;

CREATE FUNCTION public.clinova_check_invite(p_hash text,p_email text,p_local uuid) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM clinova.invitations WHERE token_hash=p_hash AND used_at IS NULL AND expires_at>now() AND (email IS NULL OR email=lower(p_email)) AND (local_user_id IS NULL OR local_user_id=p_local)) THEN RAISE EXCEPTION 'Invitación inválida o vencida'; END IF;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.clinova_check_invite(text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.clinova_check_invite(text,text,uuid) TO service_role;
