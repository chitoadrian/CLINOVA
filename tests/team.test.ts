import 'fake-indexeddb/auto';
import {webcrypto} from 'node:crypto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openDB} from 'idb';
import team from '../src/core/team-accounts.json';
import {installTeamAccounts} from '../src/core/team';
Object.defineProperty(globalThis,'crypto',{value:webcrypto,configurable:true});
(globalThis as any).window=new EventTarget();

test('cuentas del grupo, roles y configuración que no restablece contraseñas',async()=>{
 const {hashPassword}=await import('../src/core/password');
 // Sustituye únicamente las fixtures en memoria, nunca las claves publicadas.
 for(const a of team.accounts)Object.assign(a,await hashPassword('Cuenta de prueba segura '+a.username));
 const {webRequest:q}=await import('../src/core/web');
 assert.equal((await q('status')).initialized,true);
 for(const a of team.accounts){
  if('credential_revision'in a){
   await assert.rejects(q('login',{username:a.username,password:a.username+'1234'}));
  }
  const session=await q('login',{username:a.username,password:'Cuenta de prueba segura '+a.username});
  assert.equal(session.user.role,a.role);
  if(a.role!=='Administrador')await assert.rejects(q('users',{},session.token));
  await q('logout',{},session.token);
 }
 const session=await q('login',{username:'jeshua',password:'Cuenta de prueba segura jeshua'});
 const users=await q('users',{},session.token),adrian=users.find((u:any)=>u.username==='adrian');
 await q('user_save',{...adrian,password:'Nueva clave privada de prueba'},session.token);
 const db=await openDB('clinova-v1',3);
 await installTeamAccounts(db);
 const updated=await q('login',{username:'adrian',password:'Nueva clave privada de prueba'});
 assert.equal(updated.user.id,adrian.id);
 assert.equal((await db.getAll('users')).length,4);
 assert.ok((await db.getAll('credentials')).every(c=>!('password'in c)&&c.iterations===600000));
 db.close();
});

test('la rotación de las cuatro cuentas conserva roles, pacientes y claves posteriores',async()=>{
 const {hashPassword}=await import('../src/core/password');
 const db=await openDB('clinova-rotation-test',1,{upgrade(db){
  db.createObjectStore('meta');
  db.createObjectStore('credentials',{keyPath:'user_id'});
  db.createObjectStore('users',{keyPath:'id'}).createIndex('username','username',{unique:true});
  db.createObjectStore('patients',{keyPath:'id'});
 }});
 await db.put('meta',true,team.revision);
 for(const a of team.accounts){
  await db.put('users',{id:a.id,username:a.username,name:a.name,role_id:a.role_id,active:true,version:7,updated_at:'2026-01-01'});
  await db.put('credentials',{user_id:a.id,password_hash:'previous-'+a.username});
 }
 await db.put('patients',{id:'preserved',name:'Paciente de ensayo'});
 await installTeamAccounts(db);
 for(const a of team.accounts){
  const u=await db.get('users',a.id);
  assert.equal(u.role_id,a.role_id);
  assert.equal(u.name,a.name);
  assert.equal(u.version,8);
  assert.equal((await db.get('credentials',a.id)).password_hash,a.password_hash);
 }
 const a=team.accounts.find(a=>a.username==='matias')!;
 assert.equal((await db.get('credentials',a.id)).password_hash,a.password_hash);
 assert.equal((await db.get('users',a.id)).version,8);
 assert.equal((await db.get('patients','preserved')).name,'Paciente de ensayo');
 const custom={...(await hashPassword('Clave posterior solo de prueba')),user_id:a.id,failed_attempts:0,locked_until:0};
 await db.put('credentials',custom);
 await installTeamAccounts(db);
 assert.deepEqual(await db.get('credentials',a.id),custom);
 db.close();
});
