import 'fake-indexeddb/auto';
import {webcrypto} from 'node:crypto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openDB} from 'idb';
import team from '../src/core/team-accounts.json';
team.enabled=false; // Aislar los datos clínicos de la configuración del grupo.
Object.defineProperty(globalThis,'crypto',{value:webcrypto,configurable:true});
(globalThis as any).window=new EventTarget();
test('Semana 3: módulos, cola atómica y conflictos conservados',async()=>{
 const {webRequest:q}=await import('../src/core/web');
 await q('bootstrap',{name:'Admin prueba',username:'admin',password:'Contraseña de prueba 2026'});
 const a=(await q('login',{username:'admin',password:'Contraseña de prueba 2026'})).token;
 await q('user_save',{name:'Enfermero prueba',username:'nurse',password:'Contraseña de prueba 2026',role:'Enfermero',active:true},a);
 const n=(await q('login',{username:'nurse',password:'Contraseña de prueba 2026'})).token;
 const p=await q('patient_save',{name:'Paciente de prueba',age:40,area:'Enfermería',reason:'Control',status:'En atención'},n);
 const bed=await q('item_save',{kind:'bed',area:'Enfermería',values:{code:'A-01',ward:'Sala A',state:'Disponible'}},n);
 await assert.rejects(q('item_save',{kind:'bed',area:'Enfermería',values:{code:'A-01',ward:'Sala A',state:'Disponible'}},n));
 let admission=await q('item_save',{kind:'admission',area:'Enfermería',patient_id:p.id,reference_id:bed.id,values:{admitted_at:'2026-11-07T10:00',reason:'Observación',discharged_at:''}},n);
 await assert.rejects(q('item_save',{kind:'admission',area:'Enfermería',patient_id:p.id,reference_id:bed.id,values:admission.values},n));
 await assert.rejects(q('item_delete',{id:bed.id,version:bed.version,kind:'bed'},n));
 let card=await q('item_save',{kind:'kardex',area:'Enfermería',patient_id:p.id,values:{medication:'Ejemplo ficticio',dose:'Según indicación',route:'Oral',frequency:'Cada 24 horas',scheduled_at:'2026-11-07T12:00',state:'Pendiente'}},n);
 card=await q('item_save',{...card,values:{...card.values,state:'Administrado',administered_at:'2026-11-07T12:01'}},n);assert.equal(card.version,2);
 await q('item_delete',{id:card.id,kind:'kardex',version:card.version},n);
 admission=await q('item_save',{...admission,values:{...admission.values,discharged_at:'2026-11-07T16:00'}},n);
 await q('item_delete',{id:bed.id,kind:'bed',version:bed.version},n);
 let record=await q('record_save',{patientId:p.id,kind:'Enfermería',values:{temperatura:'36.5',pulso:'72',sistolica:'120',diastolica:'80',saturacion:'98',triage:'Verde',observaciones:'Inicial'}},n);
 record=await q('record_save',{...record,values:{...record.values,observaciones:'Actualizada'}},n);assert.equal(record.version,2);
 assert.equal((await q('data',{},n)).records[0].version,2);
 await q('record_delete',{id:record.id,version:record.version},n);
 const fp=await q('patient_save',{name:'Paciente fisio',age:30,area:'Fisioterapia',reason:'Rodilla',status:'En atención'},a);
 const evaluation=await q('record_save',{patientId:fp.id,kind:'Fisioterapia',values:{region:'Rodilla',lado:'Derecha',movimiento:'Flexión',grados:'95',daniels:'3',dolor:'5',plan:'Mejorar movilidad'}},a);
 const plan=await q('item_save',{kind:'routine',area:'Fisioterapia',patient_id:fp.id,reference_id:evaluation.id,values:{objective:'Objetivo de prueba',exercises:'Ejercicio supervisado: 2 series de 8',frequency:'2 sesiones por semana',start_date:'2026-11-07',end_date:'2026-11-21',state:'Activo'}},a);
 const evolution=await q('item_save',{kind:'evolution',area:'Fisioterapia',patient_id:fp.id,reference_id:plan.id,values:{session_date:'2026-11-07',pain:'3',degrees:'100',daniels:'4',progress:'Mejor tolerancia'}},a);
 await assert.rejects(q('item_save',{...evolution,values:{...evolution.values,pain:'20'}},a));
 await assert.rejects(q('item_save',{...plan,values:plan.values},n));
 const snap=await q('sync_snapshot',{},a);assert.ok(snap.pending_count>=9);
 const mutation=snap.pending.find((x:any)=>x.id===p.id);const remote={...mutation.doc,payload:{...mutation.doc.payload,name:'Servidor'},revision:1,sequence:1};
 await q('sync_apply',{acknowledgements:[{id:p.id,op_id:mutation.op_id,status:'conflict',document:remote}],changes:[],cursor:0},a);
 assert.equal((await q('sync_snapshot',{},a)).conflicts.length,1);
 await q('sync_resolve',{id:p.id,choice:'local'},a);
 const newer=(await q('sync_snapshot',{},a)).pending.find((x:any)=>x.id===p.id);assert.equal(newer.base_revision,1);assert.notEqual(newer.op_id,mutation.op_id);
 // La confirmación de una versión antigua no borra un cambio hecho durante el envío.
 const edited=await q('patient_save',{...(await q('data',{},a)).patients.find((x:any)=>x.id===p.id),name:'Cambio durante envío'},a);
 await q('sync_apply',{acknowledgements:[{id:p.id,op_id:newer.op_id,status:'applied',document:{...newer.doc,revision:2,sequence:2}}],changes:[],cursor:2},a);
 const remaining=(await q('sync_snapshot',{},a)).pending.find((x:any)=>x.id===p.id);assert.equal(remaining.doc.payload.name,edited.name);assert.equal(remaining.base_revision,2);
 const db=await openDB('clinova-v1',3);assert.equal((await db.getAll('sync_archive')).length,1);assert.ok((await db.getAll('clinical_items')).length>=5);db.close();
 const realNow=Date.now;try{Date.now=()=>realNow()+840000;await q('sync_snapshot',{},a);await q('data',{},a);Date.now=()=>realNow()+901000;await assert.rejects(q('me',{},a),/SESSION_EXPIRED/);}finally{Date.now=realNow;}
});
