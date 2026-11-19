import type {IDBPDatabase} from 'idb';
import team from './team-accounts.json';
import {stamp} from './model';

// Configuración académica solicitada para esta entrega. No reestablece claves al recargar.
export async function installTeamAccounts(db:IDBPDatabase){
 if(!team.enabled)return;
 const tx=db.transaction(['meta','users','credentials'],'readwrite');
 const installed=await tx.objectStore('meta').get(team.revision);
 if(!installed)for(const account of team.accounts){
  const old=await tx.objectStore('users').index('username').get(account.username);
  const user={...(old??stamp()),id:old?.id??account.id,username:account.username,name:account.name,role_id:account.role_id,active:true,deleted_at:null,updated_at:new Date().toISOString(),version:old?old.version+1:1};
  await tx.objectStore('users').put(user);
  await tx.objectStore('credentials').put({user_id:user.id,password_hash:account.password_hash,salt:account.salt,iterations:account.iterations,failed_attempts:0,locked_until:0});
 }
 if(!installed){
  await tx.objectStore('meta').put(true,'initialized');
  await tx.objectStore('meta').put({applied_at:new Date().toISOString()},team.revision);
 }
 // Aplica una rotación individual una sola vez, sin restablecer otras cuentas.
 for(const account of team.accounts){
  const revision='credential_revision'in account?account.credential_revision:null;
  if(!revision||await tx.objectStore('meta').get(revision))continue;
  const user=await tx.objectStore('users').index('username').get(account.username);
  if(installed&&user){
   await tx.objectStore('credentials').put({user_id:user.id,password_hash:account.password_hash,salt:account.salt,iterations:account.iterations,failed_attempts:0,locked_until:0});
   await tx.objectStore('users').put({...user,updated_at:new Date().toISOString(),version:user.version+1});
  }
  await tx.objectStore('meta').put({applied_at:new Date().toISOString()},revision);
 }
 await tx.done;
}
