import{extraStores,initialize3,week3Request}from'./week3';
import{installTeamAccounts}from'./team';
import{openDB,type IDBPDatabase}from'idb';
import{ROLES,stamp,canArea,canReadPatient,fail,validateFinance,validatePatient,validateUser,validateRecord,type User,type Patient,type Credential,type UserInput,type RecordEntry,type Area,type FinanceEntry,type FinanceInput}from'./model';
import{hashPassword,verifyPassword,dummyPassword}from'./password';
const STORES=['roles','users','credentials','patients_v2','encounters','vital_signs','triage','medications','medication_orders','evaluations','rehabilitation_plans','legacy_records','financial_entries','meta',...extraStores];
const opening=openDB('clinova-v1',4,{upgrade(db){
 for(const name of ['patients','records'])if(!db.objectStoreNames.contains(name))db.createObjectStore(name,{keyPath:'id'});
 if(!db.objectStoreNames.contains('meta'))db.createObjectStore('meta');
 for(const name of STORES)if(name!=='meta'&&!db.objectStoreNames.contains(name)){const s=db.createObjectStore(name,{keyPath:name==='credentials'?'user_id':'id'});if(name==='users')s.createIndex('username','username',{unique:true});if(name==='patients_v2')s.createIndex('legacy_id','legacy_id',{unique:true});if(['vital_signs','triage','evaluations','rehabilitation_plans'].includes(name))s.createIndex('encounter_id','encounter_id',{unique:true});if(name==='encounters')s.createIndex('patient_id','patient_id');}
},blocked(){window.dispatchEvent(new Event('clinova-db-blocked'));},blocking(){void opening.then(db=>db.close());}});
async function initialize(){const db=await opening;const tx=db.transaction([...STORES,'patients','records'],'readwrite');if(!await tx.objectStore('meta').get('week2-migration')){for(const role of ROLES)await tx.objectStore('roles').put(role);const old=await tx.objectStore('patients').getAll();const map=new Map<string,string>();for(const p of old){const item={...stamp(),name:p.name,age:p.age,area:p.area,reason:p.reason,status:p.status,legacy_id:p.id};map.set(p.id,item.id);await tx.objectStore('patients_v2').put(item);}for(const r of await tx.objectStore('records').getAll())await tx.objectStore('legacy_records').put({...r,id:crypto.randomUUID(),patient_id:map.get(r.patientId)??null,source_id:r.id});await tx.objectStore('meta').put({version:2,applied_at:new Date().toISOString(),legacy_patients:old.length},'week2-migration');}await tx.done;await initialize3(db);await installTeamAccounts(db);return db;}
const ready=initialize();
const sessions=new Map<string,{user_id:string;last:number;created:number;version:number}>();
function publicUser(u:any):User{return{...u,active:!!u.active,role:ROLES.find(r=>r.id===u.role_id)!.name};}
function admin(u:User){if(u.role!=='Administrador')fail('No tienes permiso para esta operación.');}
function invalidate(id:string){for(const[t,s]of sessions)if(s.user_id===id)sessions.delete(t);}
function updated(old:any,values:any){return{...old,...values,updated_at:new Date().toISOString(),version:old.version+1};}
const authError=()=>fail('Usuario o contraseña incorrectos, cuenta inactiva o bloqueo temporal.');
async function authorized(db:IDBPDatabase,token:string,touch=true){const s=sessions.get(token);const now=Date.now();if(!s||now-s.last>900_000||now-s.created>28_800_000){sessions.delete(token);fail('SESSION_EXPIRED');}const u=await db.get('users',s.user_id);if(!u||!u.active||u.deleted_at||u.version!==s.version){sessions.delete(token);fail('SESSION_EXPIRED');}if(touch)s.last=now;return publicUser(u);}
export async function webRequest(op:string,p:any={},token=''):Promise<any>{
 const db=await ready;
 if(op==='status')return{initialized:!!await db.get('meta','initialized'),engine:'IndexedDB',schema:4};
 if(op==='bootstrap'){const data:UserInput={...p,username:String(p.username).trim().toLowerCase(),active:true,role:'Administrador'};validateUser(data);const hash=await hashPassword(data.password??'');const tx=db.transaction(['meta','users','credentials'],'readwrite');if(await tx.objectStore('meta').get('initialized')){await tx.done;fail('El administrador inicial ya existe.');}const u={...stamp(),username:data.username,name:data.name.trim(),role_id:ROLES[0].id,active:true};await tx.objectStore('users').add(u);await tx.objectStore('credentials').add({...hash,user_id:u.id,failed_attempts:0,locked_until:0});await tx.objectStore('meta').put(true,'initialized');await tx.done;return{ok:true};}
 if(op==='login'){
  const username=String(p.username??'').trim().toLowerCase(),password=String(p.password??'');if(password.length>128)authError();
  const u=await db.getFromIndex('users','username',username);const credential:Credential|undefined=u?await db.get('credentials',u.id):undefined;
  if(!u||!credential||!u.active||u.deleted_at||credential.locked_until>Date.now()){await dummyPassword(password);authError();}
  const valid=await verifyPassword(password,credential!);const tx=db.transaction(['users','credentials'],'readwrite');const fresh=await tx.objectStore('credentials').get(u.id),current=await tx.objectStore('users').get(u.id);
  if(!current?.active||current.deleted_at||fresh.password_hash!==credential!.password_hash||fresh.locked_until>Date.now()){await tx.done;authError();}
  if(!valid){const attempts=(fresh.locked_until>0?0:fresh.failed_attempts)+1;await tx.objectStore('credentials').put({...fresh,failed_attempts:attempts,locked_until:attempts>=5?Date.now()+300_000:0});await tx.done;authError();}
  await tx.objectStore('credentials').put({...fresh,failed_attempts:0,locked_until:0});await tx.done;const t=crypto.randomUUID();sessions.set(t,{user_id:u.id,last:Date.now(),created:Date.now(),version:current.version});return{token:t,user:publicUser(current)};
 }
 if(op==='logout'){sessions.delete(token);return{ok:true};}
 const actor=await authorized(db,token,!['me','data','clinical_data','users','sync_snapshot','sync_apply'].includes(op));
 if(op==='me'||op==='touch')return actor;
 if(op==='finance_list'){
  if(actor.role!=='Contable')fail('Solo Contabilidad puede consultar movimientos.');
  return (await db.getAll('financial_entries') as FinanceEntry[]).filter(x=>!x.deleted_at).sort((a,b)=>b.occurred_at.localeCompare(a.occurred_at)||b.created_at.localeCompare(a.created_at));
 }
 if(op==='finance_save'){
  if(actor.role!=='Contable')fail('Solo Contabilidad puede registrar movimientos.');
  const input=p as FinanceInput;validateFinance(input);
  const tx=db.transaction(['financial_entries','patients_v2'],'readwrite');
  try{
   const old=input.id?await tx.objectStore('financial_entries').get(input.id):null;
   if(input.id&&(!old||old.deleted_at||old.version!==input.version))fail('Movimiento modificado o inexistente. Recarga.');
   if(old&&(old.kind!==input.kind||old.patient_id!==input.patient_id))fail('Conserva el tipo y paciente originales.');
   if(input.kind!=='gasto'){
    const patient=await tx.objectStore('patients_v2').get(input.patient_id!);
    if(!patient||patient.deleted_at)fail('Selecciona un paciente activo.');
   }
   const all=await tx.objectStore('financial_entries').getAll() as FinanceEntry[];
   const related=all.filter(x=>!x.deleted_at&&x.id!==input.id&&x.patient_id===input.patient_id);
   const cargos=related.filter(x=>x.kind==='cargo').reduce((n,x)=>n+x.amount_cents,0)+(input.kind==='cargo'?input.amount_cents:0);
   const cobros=related.filter(x=>x.kind==='cobro').reduce((n,x)=>n+x.amount_cents,0)+(input.kind==='cobro'?input.amount_cents:0);
   if(input.kind!=='gasto'&&cobros>cargos)fail('El cobro no puede superar el saldo pendiente del paciente.');
   const values={kind:input.kind,patient_id:input.patient_id,concept:input.concept.trim(),amount_cents:input.amount_cents,method:input.method,occurred_at:input.occurred_at,reference:input.reference.trim(),author_id:old?.author_id??actor.id,author_name:old?.author_name??actor.name};
   const row=old?updated(old,values):{...stamp(),...values};
   await tx.objectStore('financial_entries').put(row);await tx.done;return row;
  }catch(e){try{tx.abort();}catch{}await tx.done.catch(()=>{});throw e;}
 }
 if(op==='finance_delete'){
  if(actor.role!=='Contable')fail('Solo Contabilidad puede dar de baja movimientos.');
  const tx=db.transaction('financial_entries','readwrite');
  try{
   const old=await tx.store.get(p.id) as FinanceEntry|undefined;
   if(!old||old.deleted_at||old.version!==p.version)fail('Movimiento modificado o inexistente. Recarga.');
   if(old.kind==='cargo'){
    const all=await tx.store.getAll() as FinanceEntry[];
    const related=all.filter(x=>!x.deleted_at&&x.id!==old.id&&x.patient_id===old.patient_id);
    const cargos=related.filter(x=>x.kind==='cargo').reduce((n,x)=>n+x.amount_cents,0);
    const cobros=related.filter(x=>x.kind==='cobro').reduce((n,x)=>n+x.amount_cents,0);
    if(cobros>cargos)fail('Primero ajusta los cobros asociados; la baja dejaría un saldo negativo.');
   }
   await tx.store.put(updated(old,{deleted_at:new Date().toISOString()}));await tx.done;return{ok:true};
  }catch(e){try{tx.abort();}catch{}await tx.done.catch(()=>{});throw e;}
 }
 if(['patient_save','patient_delete','record_save','record_delete','item_save','item_delete','clinical_data','sync_snapshot','sync_apply','sync_resolve'].includes(op))return week3Request(db,op,p,actor);
 if(op==='users'){admin(actor);return(await db.getAll('users')).filter(u=>!u.deleted_at).map(publicUser);}
 if(op==='user_save'){
  admin(actor);const input:UserInput={...p,username:String(p.username).trim().toLowerCase()};validateUser(input);const hash=input.password?await hashPassword(input.password):null;
  const tx=db.transaction(['users','credentials'],'readwrite');const all=await tx.objectStore('users').getAll(),old=input.id?await tx.objectStore('users').get(input.id):null;
  if(input.id&&(!old||old.deleted_at||old.version!==input.version)){await tx.done;fail('Usuario modificado o inexistente. Recarga.');}
  if(all.some(u=>u.username===input.username&&u.id!==input.id)){await tx.done;fail('Ese nombre de usuario ya está reservado.');}
  if(!old&&!hash){await tx.done;fail('La contraseña es obligatoria.');}
  if(old?.id===actor.id&&(!input.active||input.role!=='Administrador')){await tx.done;fail('No puedes desactivar o degradar tu propia cuenta.');}
  if(old?.role_id===ROLES[0].id&&old.active&&(!input.active||input.role!=='Administrador')&&all.filter(u=>u.active&&!u.deleted_at&&u.role_id===ROLES[0].id).length<=1){await tx.done;fail('Debe existir un administrador activo.');}
  const fields={username:input.username,name:input.name.trim(),role_id:ROLES.find(r=>r.name===input.role)!.id,active:input.active};const user=old?updated(old,fields):{...stamp(),...fields};await tx.objectStore('users').put(user);if(hash)await tx.objectStore('credentials').put({...hash,user_id:user.id,failed_attempts:0,locked_until:0});await tx.done;if(old&&(hash||old.role_id!==user.role_id||!user.active))invalidate(user.id);return publicUser(user);
 }
 if(op==='user_delete'){admin(actor);if(p.id===actor.id)fail('No puedes eliminar tu propia cuenta.');const tx=db.transaction('users','readwrite'),u=await tx.store.get(p.id);if(!u||u.deleted_at||u.version!==p.version){await tx.done;fail('Usuario modificado o inexistente.');}if(u.role_id===ROLES[0].id&&u.active&&(await tx.store.getAll()).filter(x=>x.active&&!x.deleted_at&&x.role_id===ROLES[0].id).length<=1){await tx.done;fail('Debe existir un administrador activo.');}await tx.store.put(updated(u,{active:false,deleted_at:new Date().toISOString()}));await tx.done;invalidate(u.id);return{ok:true};}
 if(op==='patient_save'){admin(actor);validatePatient(p);const tx=db.transaction('patients_v2','readwrite'),old=p.id?await tx.store.get(p.id):null;if(p.id&&(!old||old.deleted_at||old.version!==p.version)){await tx.done;fail('Paciente modificado o inexistente. Recarga.');}const fields={name:p.name.trim(),age:p.age,area:p.area,reason:p.reason.trim(),status:p.status};const patient=old?updated(old,fields):{...stamp(),...fields};await tx.store.put(patient);await tx.done;return patient;}
 if(op==='patient_delete'){admin(actor);const tx=db.transaction('patients_v2','readwrite'),old=await tx.store.get(p.id);if(!old||old.deleted_at||old.version!==p.version){await tx.done;fail('Paciente modificado o inexistente.');}await tx.store.put(updated(old,{deleted_at:new Date().toISOString()}));await tx.done;return{ok:true};}
 if(op==='record_save'){
  const kind:Area=p.kind;validateRecord(kind,p.values);if(!canArea(actor.role,kind))fail('No tienes permiso para esta área.');
  const tx=db.transaction(['patients_v2','users','encounters','vital_signs','triage','evaluations','rehabilitation_plans'],'readwrite');const patient=await tx.objectStore('patients_v2').get(p.patientId),user=await tx.objectStore('users').get(actor.id);
  if(!patient||patient.deleted_at||patient.area!==kind||!user?.active||user.deleted_at||user.role_id!==actor.role_id){await tx.done;fail('Paciente o permiso no disponible.');}
  const e={...stamp(),patient_id:patient.id,author_id:actor.id,author_name:actor.name,kind},v=p.values;await tx.objectStore('encounters').add(e);
  if(kind==='Enfermería'){const vit={...stamp(),encounter_id:e.id,temperature:+v.temperatura,pulse:+v.pulso,systolic:+v.sistolica,diastolic:+v.diastolica,spo2:+v.saturacion};await tx.objectStore('vital_signs').add(vit);await tx.objectStore('triage').add({...stamp(),encounter_id:e.id,vital_id:vit.id,priority:v.triage,notes:v.observaciones??''});}
  else{const ev={...stamp(),encounter_id:e.id,region:v.region,side:v.lado,movement:v.movimiento,degrees:+v.grados,daniels:+v.daniels,pain:+v.dolor};await tx.objectStore('evaluations').add(ev);await tx.objectStore('rehabilitation_plans').add({...stamp(),encounter_id:e.id,evaluation_id:ev.id,objective:v.plan});}
  await tx.done;return{id:e.id,patientId:patient.id,kind,createdAt:e.created_at,author:actor.name,values:v};
 }
 if(op==='data'){
  const tx=db.transaction(['patients_v2','encounters','vital_signs','triage','evaluations','rehabilitation_plans','legacy_records']);const patients:Patient[]=(await tx.objectStore('patients_v2').getAll()).filter(p=>!p.deleted_at&&canReadPatient(actor.role,p.area));const ids=new Set(patients.map(p=>p.id)),records:RecordEntry[]=[];
  for(const e of await tx.objectStore('encounters').getAll())if(!e.deleted_at&&ids.has(e.patient_id)&&canArea(actor.role,e.kind)){let values:Record<string,string>;
   if(e.kind==='Enfermería'){const v=await tx.objectStore('vital_signs').index('encounter_id').get(e.id),t=await tx.objectStore('triage').index('encounter_id').get(e.id);values={temperatura:String(v.temperature),pulso:String(v.pulse),sistolica:String(v.systolic),diastolica:String(v.diastolic),saturacion:String(v.spo2),triage:t.priority,observaciones:t.notes};}
   else{const v=await tx.objectStore('evaluations').index('encounter_id').get(e.id),r=await tx.objectStore('rehabilitation_plans').index('encounter_id').get(e.id);values={region:v.region,lado:v.side,movimiento:v.movement,grados:String(v.degrees),daniels:String(v.daniels),dolor:String(v.pain),plan:r.objective};}records.push({...e,patientId:e.patient_id,kind:e.kind,createdAt:e.created_at,author:e.author_name,values});}
  for(const r of await tx.objectStore('legacy_records').getAll())if(ids.has(r.patient_id)&&canArea(actor.role,r.kind))records.push({...r,patientId:r.patient_id});await tx.done;return{patients,records};
 }
 fail('Operación no admitida.');
}
export async function legacySnapshot(){const db=await ready;return{patients:await db.getAll('patients'),records:await db.getAll('records')};}
