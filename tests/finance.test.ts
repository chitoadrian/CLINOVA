import 'fake-indexeddb/auto';
import {webcrypto} from 'node:crypto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import team from '../src/core/team-accounts.json';
Object.defineProperty(globalThis,'crypto',{value:webcrypto,configurable:true});
(globalThis as any).window=new EventTarget();

test('cuatro perfiles distintos y contabilidad aislada con saldos validados',async()=>{
 const {hashPassword}=await import('../src/core/password');
 for(const a of team.accounts)Object.assign(a,await hashPassword('Clave de prueba '+a.username));
 const {webRequest:q}=await import('../src/core/web');
 const sessions=new Map<string,any>();
 for(const a of team.accounts){const session=await q('login',{username:a.username,password:'Clave de prueba '+a.username});assert.equal(session.user.role,a.role);sessions.set(a.username,session);}
 const j=sessions.get('jeshua').token,w=sessions.get('wilson').token,a=sessions.get('adrian').token,m=sessions.get('matias').token;
 const nursing=await q('patient_save',{name:'Paciente Enfermería',age:29,area:'Enfermería',reason:'Control',status:'En espera'},j);
 const physio=await q('patient_save',{name:'Paciente Fisioterapia',age:32,area:'Fisioterapia',reason:'Rehabilitación',status:'En espera'},j);
 assert.equal((await q('data',{},w)).patients.length,2);
 assert.equal((await q('data',{},a)).patients.length,1);
 assert.equal((await q('data',{},m)).patients.length,1);
 await assert.rejects(q('item_save',{kind:'bed',area:'Enfermería',values:{code:'ADMIN-01',ward:'Sala',state:'Disponible'}},j));
 await assert.rejects(q('users',{},w));
 await assert.rejects(q('finance_list',{},j));
 await assert.rejects(q('finance_list',{},a));
 await assert.rejects(q('finance_list',{},m));
 const input={kind:'cargo',patient_id:nursing.id,concept:'Atención de enfermería',amount_cents:2500,method:'Efectivo',occurred_at:'2026-11-26',reference:''};
 const charge=await q('finance_save',input,w);
 assert.equal((await q('finance_list',{},w)).length,1);
 await assert.rejects(q('finance_save',{...input,kind:'cobro',amount_cents:2600},w));
 const payment=await q('finance_save',{...input,kind:'cobro',amount_cents:1500},w);
 await assert.rejects(q('finance_delete',{id:charge.id,version:charge.version},w));
 await q('finance_save',{...input,kind:'cargo',patient_id:physio.id,concept:'Sesión de fisioterapia',amount_cents:3000},w);
 await q('finance_delete',{id:payment.id,version:payment.version},w);
 assert.equal((await q('finance_list',{},w)).length,2);
 assert.equal((await q('data',{},w)).records.length,0);
});
