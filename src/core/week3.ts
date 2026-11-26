import type {IDBPDatabase,IDBPTransaction} from 'idb';
import {stamp,canArea,fail,type User,type Area} from './model';
import {documentOf,validateDocument,type SyncDoc,type RemoteDoc,type Pending,type ClinicalItem,type Conflict} from './clinical';
export const extraStores=['clinical_items','sync_outbox','sync_state','sync_conflicts','sync_archive'];
const stores=['patients_v2','encounters','vital_signs','triage','evaluations','rehabilitation_plans',...extraStores,'meta'];
type Tx=IDBPTransaction<any,any,'readwrite'>;
const updated=(old:any,values:any)=>({...old,...values,updated_at:new Date().toISOString(),version:old.version+1});
function itemDoc(item:ClinicalItem){return documentOf(item.kind,item);}
async function record(tx:any,e:any){
 let values:Record<string,string>;
 if(e.kind==='Enfermería'){const v=await tx.objectStore('vital_signs').index('encounter_id').get(e.id),t=await tx.objectStore('triage').index('encounter_id').get(e.id);values={temperatura:String(v.temperature),pulso:String(v.pulse),sistolica:String(v.systolic),diastolica:String(v.diastolic),saturacion:String(v.spo2),triage:t.priority,observaciones:t.notes};}
 else{const v=await tx.objectStore('evaluations').index('encounter_id').get(e.id),r=await tx.objectStore('rehabilitation_plans').index('encounter_id').get(e.id);values={region:v.region,lado:v.side,movimiento:v.movement,grados:String(v.degrees),daniels:String(v.daniels),dolor:String(v.pain),plan:r.objective};}
 return{...e,patientId:e.patient_id,createdAt:e.created_at,author:e.author_name,values};
}
async function queue(tx:Tx,doc:SyncDoc){const state=await tx.objectStore('sync_state').get(doc.id);await tx.objectStore('sync_outbox').put({id:doc.id,op_id:crypto.randomUUID(),doc,base_revision:state?.revision??0,created_at:new Date().toISOString()});}
export async function initialize3(db:IDBPDatabase){const tx=db.transaction(stores,'readwrite');if(!await tx.objectStore('meta').get('week3-migration')){for(const p of await tx.objectStore('patients_v2').getAll())await queue(tx,documentOf('patient',p));for(const e of await tx.objectStore('encounters').getAll())await queue(tx,documentOf('encounter',await record(tx,e)));await tx.objectStore('meta').put({version:3,applied_at:new Date().toISOString()},'week3-migration');}await tx.done;}
async function localDoc(tx:any,kind:string,id:string):Promise<SyncDoc|undefined>{if(kind==='patient'){const p=await tx.objectStore('patients_v2').get(id);return p?documentOf('patient',p):undefined;}if(kind==='encounter'){const e=await tx.objectStore('encounters').get(id);return e?documentOf('encounter',await record(tx,e)):undefined;}const p=await tx.objectStore('clinical_items').get(id);return p?itemDoc(p):undefined;}
async function related(tx:any,doc:SyncDoc){
 const p=doc.payload;
 if(doc.patient_id){const patient=await tx.objectStore('patients_v2').get(doc.patient_id);if(!patient||patient.deleted_at||patient.area!==doc.area)fail('Paciente no disponible en esta área.');}
 const items:ClinicalItem[]=await tx.objectStore('clinical_items').getAll();
 if(doc.kind==='bed'){
  if(items.some(i=>i.kind==='bed'&&!i.deleted_at&&i.id!==doc.id&&i.values.code.trim().toLowerCase()===p.values.code.trim().toLowerCase()))fail('Ese código de cama ya existe.');
  if((p.deleted_at||p.values.state==='Mantenimiento')&&items.some(i=>i.kind==='admission'&&!i.deleted_at&&!i.values.discharged_at&&i.reference_id===doc.id))fail('Da de alta al paciente antes de retirar la cama.');
 }
 if(doc.kind==='admission'&&!p.deleted_at){const bed=items.find(i=>i.id===doc.reference_id&&i.kind==='bed'&&!i.deleted_at);if(!bed||bed.values.state==='Mantenimiento')fail('Cama no disponible.');if(!p.values.discharged_at&&items.some(i=>i.kind==='admission'&&!i.deleted_at&&!i.values.discharged_at&&i.id!==doc.id&&(i.reference_id===doc.reference_id||i.patient_id===doc.patient_id)))fail('La cama o el paciente ya tiene un ingreso activo.');}
 if(doc.kind==='routine'&&doc.reference_id){const e=await tx.objectStore('encounters').get(doc.reference_id);if(!e||e.deleted_at||e.kind!=='Fisioterapia'||e.patient_id!==doc.patient_id)fail('Evaluación relacionada inválida.');}
 if(doc.kind==='evolution'){const plan=items.find(i=>i.id===doc.reference_id&&i.kind==='routine'&&!i.deleted_at);if(!plan||plan.patient_id!==doc.patient_id)fail('Selecciona un plan del mismo paciente.');}
 if(doc.kind==='patient'&&p.deleted_at&&items.some(i=>i.kind==='admission'&&!i.deleted_at&&!i.values.discharged_at&&i.patient_id===doc.id))fail('Registra el alta hospitalaria antes de dar de baja al paciente.');
}
async function apply(tx:any,doc:SyncDoc,actor:User,remote=false){
 const p=doc.payload;
 if(doc.kind==='patient'){await tx.objectStore('patients_v2').put(p);return;}
 if(doc.kind!=='encounter'){await tx.objectStore('clinical_items').put(p);return;}
 const old=await tx.objectStore('encounters').get(doc.id),v=p.values;
 const e={id:p.id,created_at:p.created_at,updated_at:p.updated_at,deleted_at:p.deleted_at,version:p.version,patient_id:doc.patient_id,kind:doc.area,author_id:old?.author_id??actor.id,author_name:p.author};
 await tx.objectStore('encounters').put(e);
 const child=async(name:string,fields:any)=>{const prior=await tx.objectStore(name).index('encounter_id').get(doc.id);const value={...(prior??stamp()),...fields,encounter_id:doc.id,updated_at:p.updated_at,deleted_at:p.deleted_at,version:prior?prior.version+1:1};await tx.objectStore(name).put(value);return value;};
 if(doc.area==='Enfermería'){const vit=await child('vital_signs',{temperature:+v.temperatura,pulse:+v.pulso,systolic:+v.sistolica,diastolic:+v.diastolica,spo2:+v.saturacion});await child('triage',{vital_id:vit.id,priority:v.triage,notes:v.observaciones??''});}
 else{const ev=await child('evaluations',{region:v.region,side:v.lado,movement:v.movimiento,degrees:+v.grados,daniels:+v.daniels,pain:+v.dolor});await child('rehabilitation_plans',{evaluation_id:ev.id,objective:v.plan});}
}
async function conflict(tx:any,pending:Pending,remote:RemoteDoc,reason:string){await tx.objectStore('sync_conflicts').put({id:pending.id,local:pending.doc,remote,reason,created_at:new Date().toISOString()});await tx.objectStore('sync_outbox').put({...pending,blocked:true});}
export async function week3Request(db:IDBPDatabase,op:string,p:any,actor:User):Promise<any>{
 const tx=db.transaction(stores,'readwrite');
 try{
 let result:any;
 if(op==='clinical_data'){const patients=await tx.objectStore('patients_v2').getAll();result=(await tx.objectStore('clinical_items').getAll()).filter((i:ClinicalItem)=>!i.deleted_at&&canArea(actor.role,i.area)&&(!i.patient_id||patients.some(x=>x.id===i.patient_id&&!x.deleted_at)));}
 else if(['patient_save','patient_delete','record_save','record_delete','item_save','item_delete'].includes(op)){
  const kind=op.startsWith('patient')?'patient':op.startsWith('record')?'encounter':p.kind;
  if(actor.role==='Administrador'&&kind!=='patient')fail('La atención clínica corresponde a Enfermería o Fisioterapia.');
  const old=p.id?await localDoc(tx,kind,p.id):undefined;
  if(p.id&&(!old||old.payload.deleted_at||old.payload.version!==p.version))fail('Registro modificado o inexistente. Recarga la ficha.');
  if(old&&!canArea(actor.role,old.area))fail('No tienes permiso para este registro.');
  if(old&&old.kind!==kind)fail('Tipo de registro inmutable.');
  const deleting=op.endsWith('_delete');let fields:any;
  if(deleting){if(!old)fail('Registro inexistente.');fields={deleted_at:new Date().toISOString()};}
  else if(kind==='patient')fields={name:p.name.trim(),age:p.age,area:p.area,reason:p.reason.trim(),status:p.status};
  else if(kind==='encounter')fields={patientId:p.patientId,kind:p.kind,author:old?.payload.author??actor.name,values:p.values};
  else fields={kind:p.kind,area:p.area,patient_id:p.patient_id??null,reference_id:p.reference_id??null,values:p.values,author:old?.payload.author??actor.name};
  const value=old?updated(old.payload,fields):{...stamp(),...fields};if(kind==='encounter')value.createdAt=value.created_at;
  const doc=documentOf(kind,value);validateDocument(doc,actor.role);
  if(old&&(old.area!==doc.area||old.patient_id!==doc.patient_id))fail('Conserva el área y paciente originales; crea una ficha nueva para otra área.');
  await related(tx,doc);await apply(tx,doc,actor);await queue(tx,doc);result=value;
 }
 else if(op==='sync_snapshot'){
  const pending:Pending[]=(await tx.objectStore('sync_outbox').getAll()).filter(x=>canArea(actor.role,x.doc.area));
  result={pending:pending.filter(x=>!x.blocked).sort((a,b)=>{const rank=(x:Pending)=>x.doc.payload.deleted_at&&x.base_revision>0&&['patient','bed'].includes(x.doc.kind)?9:x.doc.kind==='patient'?0:x.doc.kind==='bed'?1:x.doc.kind==='encounter'?2:x.doc.kind==='routine'?3:4;return rank(a)-rank(b)||a.created_at.localeCompare(b.created_at);}).slice(0,50),pending_count:pending.length,conflicts:(await tx.objectStore('sync_conflicts').getAll()).filter(x=>canArea(actor.role,x.local.area)),cursor:await tx.objectStore('meta').get('cursor:'+actor.id)??0,last_sync:await tx.objectStore('meta').get('last-sync:'+actor.id)??null};
 }
 else if(op==='sync_apply'){
  for(const ack of p.acknowledgements??[]){const pending:Pending|undefined=await tx.objectStore('sync_outbox').get(ack.id);if(!pending||!canArea(actor.role,pending.doc.area))continue;const remote:RemoteDoc=ack.document;
   if(ack.status==='conflict'){await conflict(tx,pending,remote,ack.reason??'Ediciones simultáneas');continue;}
   await tx.objectStore('sync_state').put({id:ack.id,revision:remote.revision});
   if(pending.op_id===ack.op_id)await tx.objectStore('sync_outbox').delete(ack.id);else await tx.objectStore('sync_outbox').put({...pending,base_revision:remote.revision});
  }
  for(const remote of (p.changes??[]) as RemoteDoc[]){if(!canArea(actor.role,remote.area))fail('Respuesta de servidor fuera de tu área.');validateDocument(remote,actor.role);const state=await tx.objectStore('sync_state').get(remote.id);if(state&&state.revision>=remote.revision)continue;
   const pending:Pending|undefined=await tx.objectStore('sync_outbox').get(remote.id);
   if(pending){if(pending.base_revision!==remote.revision)await conflict(tx,pending,remote,'El servidor y este equipo tienen cambios.');continue;}
   const old=await localDoc(tx,remote.kind,remote.id);if(old)await tx.objectStore('sync_archive').add({id:crypto.randomUUID(),document:old,reason:'Recepción remota',at:new Date().toISOString()});
   const value={...remote,payload:{...remote.payload,version:old?old.payload.version+1:remote.payload.version}};await apply(tx,value,actor,true);await tx.objectStore('sync_state').put({id:remote.id,revision:remote.revision});
  }
  await tx.objectStore('meta').put(p.cursor,'cursor:'+actor.id);await tx.objectStore('meta').put(new Date().toISOString(),'last-sync:'+actor.id);result={ok:true};
 }
 else if(op==='sync_resolve'){
  const c:Conflict|undefined=await tx.objectStore('sync_conflicts').get(p.id);if(!c||!canArea(actor.role,c.local.area))fail('Conflicto no disponible.');
  const pending:Pending|undefined=await tx.objectStore('sync_outbox').get(p.id);if(!pending)fail('Cambio pendiente no disponible.');
  await tx.objectStore('sync_archive').add({...c,id:crypto.randomUUID(),record_id:c.id,local:pending.doc,resolution:p.choice,at:new Date().toISOString()});
  await tx.objectStore('sync_state').put({id:p.id,revision:c.remote.revision});
  if(p.choice==='server'){await apply(tx,{...c.remote,payload:{...c.remote.payload,version:pending.doc.payload.version+1}},actor,true);await tx.objectStore('sync_outbox').delete(p.id);}
  else if(p.choice==='local'){const doc={...pending.doc,payload:updated(pending.doc.payload,{})};await related(tx,doc);await apply(tx,doc,actor);await queue(tx,doc);}
  else fail('Elige una resolución.');
  await tx.objectStore('sync_conflicts').delete(p.id);result={ok:true};
 }
 else fail('Operación no admitida.');
 await tx.done;return result;
 }catch(error){try{tx.abort();}catch{}await tx.done.catch(()=>{});throw error;}
}
