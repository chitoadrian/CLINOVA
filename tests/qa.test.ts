import 'fake-indexeddb/auto';
import {webcrypto} from 'node:crypto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openDB,unwrap} from 'idb';
import {performance} from 'node:perf_hooks';
import team from '../src/core/team-accounts.json';
team.enabled=false;
Object.defineProperty(globalThis,'crypto',{value:webcrypto,configurable:true});
(globalThis as any).window=new EventTarget();

test('QA Semana 4: carga local, concurrencia y recuperación tras fallos',async t=>{
 const {webRequest:q}=await import('../src/core/web');
 const password='Credencial exclusiva del ensayo QA';
 await q('bootstrap',{name:'QA Administrador',username:'qa.admin',password});
 const a=(await q('login',{username:'qa.admin',password})).token;
 await q('user_save',{name:'QA Enfermero',username:'qa.nurse',password,role:'Enfermero',active:true},a);
 const n=(await q('login',{username:'qa.nurse',password})).token;
 const db=await openDB('clinova-v1',3);
 const input=(i:number)=>({name:'Paciente QA '+i,age:30,area:'Enfermería',reason:'Datos ficticios',status:'En espera'});
 let first:any;
 await t.test('500 altas con ráfagas de 20 escrituras; UUID únicos y cola completa',async()=>{
  const start=performance.now();const patients:any[]=[];
  for(let i=0;i<500;i+=20)patients.push(...await Promise.all(Array.from({length:20},(_,j)=>q('patient_save',input(i+j),n))));
  first=patients[0];assert.equal(new Set(patients.map(p=>p.id)).size,500);
  assert.equal((await q('data',{},n)).patients.length,500);
  assert.equal((await q('sync_snapshot',{},n)).pending_count,500);
  assert.equal(await db.count('patients_v2'),await db.count('sync_outbox'));
  console.log(JSON.stringify({metric:'500 altas',milliseconds:Math.round(performance.now()-start),environment:'Node + fake-indexeddb, no servidor real'}));
 });
 await t.test('dos ediciones simultáneas: una confirma y la obsoleta se rechaza',async()=>{
  const results=await Promise.allSettled(['A','B'].map(reason=>q('patient_save',{...first,reason},n)));
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(results.filter(x=>x.status==='rejected').length,1);
  first=(await q('data',{},n)).patients.find((p:any)=>p.id===first.id);
  assert.equal(first.version,2);
 });
 await t.test('fallo al escribir la cola: se revierte también el paciente',async()=>{
  const proto=Object.getPrototypeOf(unwrap(db).transaction('sync_outbox','readwrite').objectStore('sync_outbox'));
  const original=proto.put;const before=await db.count('patients_v2');
  try{
   proto.put=function(...args:any[]){if(this.name==='sync_outbox')throw new DOMException('Cuota agotada de prueba','QuotaExceededError');return original.apply(this,args);};
   await assert.rejects(q('patient_save',input(9999),n),/Cuota agotada/);
  }finally{proto.put=original;}
  assert.equal(await db.count('patients_v2'),before);
  assert.equal((await q('sync_snapshot',{},n)).pending_count,500);
 });
 await t.test('respuesta remota no autorizada: rollback de ACK y cursor',async()=>{
  const snap=await q('sync_snapshot',{},n),op=snap.pending[0];
  await assert.rejects(q('sync_apply',{acknowledgements:[{id:op.id,op_id:op.op_id,status:'applied',document:{...op.doc,revision:1,sequence:1}}],changes:[{...op.doc,area:'Fisioterapia',revision:2,sequence:2}],cursor:2},n));
  const after=await q('sync_snapshot',{},n);assert.equal(after.pending_count,500);assert.equal(after.cursor,snap.cursor);
 });
 await t.test('dos ingresos concurrentes no ocupan la misma cama',async()=>{
  const bed=await q('item_save',{kind:'bed',area:'Enfermería',values:{code:'QA-01',ward:'Sala QA',state:'Disponible'}},n);
  const pats=(await q('data',{},n)).patients.slice(0,2);
  const results=await Promise.allSettled(pats.map((p:any)=>q('item_save',{kind:'admission',area:'Enfermería',patient_id:p.id,reference_id:bed.id,values:{admitted_at:'2026-11-17T10:00',reason:'Ensayo de concurrencia',discharged_at:''}},n)));
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(results.filter(x=>x.status==='rejected').length,1);
 });
 await t.test('cola de 502 entidades en lotes de 50 y ACK repetido sin duplicación',async()=>{
  let seq=0,batches=0;
  for(;;){const snap=await q('sync_snapshot',{},n);if(!snap.pending.length)break;
   assert.ok(snap.pending.length<=50);batches++;
   const acknowledgements=snap.pending.map((op:any)=>({id:op.id,op_id:op.op_id,status:'applied',document:{...op.doc,revision:1,sequence:++seq}}));
   const response={acknowledgements,changes:[],cursor:seq};
   await q('sync_apply',response,n);await q('sync_apply',response,n);
  }
  assert.equal(seq,502);assert.equal(batches,11);assert.equal((await q('sync_snapshot',{},n)).pending_count,0);
  assert.equal((await q('data',{},n)).patients.length,500);
  console.log(JSON.stringify({metric:'cola procesada',entities:seq,batches,server:'ACK simulados; no prueba de carga cloud'}));
 });
 await t.test('50 lecturas completas conservan pacientes y separación de roles',async()=>{
  const start=performance.now();
  await q('patient_save',{...input(600),area:'Fisioterapia'},a);
  for(let i=0;i<50;i++)assert.equal((await q('data',{},n)).patients.length,500);
  assert.equal((await q('data',{},a)).patients.length,501);
  console.log(JSON.stringify({metric:'50 lecturas de 500 fichas',milliseconds:Math.round(performance.now()-start)}));
 });
 db.close();
});
