-- Aplicada exclusivamente al proyecto CLINOVA (gcsodpalqwwpsiodeeil).
-- Limita el perfil cloud de Wilson al nuevo rol; los movimientos contables
-- permanecen locales mientras no exista un flujo cloud de finanzas.
ALTER TABLE clinova.roles DROP CONSTRAINT roles_name_check;
ALTER TABLE clinova.roles ADD CONSTRAINT roles_name_check
  CHECK (name IN ('Administrador','Enfermero','Fisioterapeuta','Contable'));
INSERT INTO clinova.roles(name) VALUES ('Contable') ON CONFLICT (name) DO NOTHING;
UPDATE clinova.members SET role='Contable'
  WHERE local_user_id='dd67991b-598d-4e57-b410-dd7d422181f6'
    AND role='Administrador';
