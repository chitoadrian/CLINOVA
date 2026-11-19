import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {useSyncExternalStore} from 'react';
import {request,notifyDataChanged,type User} from './db';
import type {Pending,Conflict} from './core/clinical';

export const CLOUD_URL='https://gcsodpalqwwpsiodeeil.supabase.co';
export const CLOUD_KEY='sb_publishable_rkL5cTU1Jxfx1fNClNpeUQ_UZQRoRcu';
const aliases:Record<string,string>={jeshua:'presentacion@clinova.example',wilson:'wilson@clinova.example',adrian:'enfermero@clinova.example',matias:'fisioterapeuta@clinova.example'};
type State={phase:'pendiente'|'sincronizando'|'completado'|'error';pending:number;conflicts:Conflict[];last:string|null;connected:boolean;email:string;message:string};
type Snapshot={pending:Pending[];pending_count:number;conflicts:Conflict[];cursor:number;last_sync:string|null};
type Context={user:User;client:SupabaseClient|null;password:string;closed:boolean;busy:boolean;again:boolean;connecting:Promise<void>|null;connection:number;failures:number;nextAttempt:number;abort:AbortController};
const initial:State={phase:'pendiente',pending:0,conflicts:[],last:null,connected:false,email:'',message:'Inicia sesión para conectar tu equipo.'};
let state={...initial},current:Context|null=null;
const listeners=new Set<()=>void>();
const active=(ctx:Context)=>current===ctx&&!ctx.closed;
function set(ctx:Context,patch:Partial<State>){if(active(ctx)){state={...state,...patch};listeners.forEach(f=>f());}}
export function getSyncState(){return state;}
export function useSyncState(){return useSyncExternalStore(f=>{listeners.add(f);return()=>{listeners.delete(f);};},getSyncState);}
function dispose(client:SupabaseClient|null){if(!client)return;client.auth.stopAutoRefresh();void client.auth.signOut({scope:'local'}).catch(()=>{});}
function fail(ctx:Context,error:unknown){if(!active(ctx))return;ctx.failures++;ctx.nextAttempt=Date.now()+Math.min(60_000,2000*2**Math.min(ctx.failures,5));set(ctx,{phase:navigator.onLine?'error':'pendiente',message:(navigator.onLine?(error instanceof Error?error.message:String(error)):'Sin conexión.')+' Los cambios permanecen guardados.'});}

async function api(body:any,ctx:Context,client=ctx.client,authenticated=true){
 const headers:Record<string,string>={'Content-Type':'application/json',apikey:CLOUD_KEY};
 if(authenticated){const session=await client?.auth.getSession();if(!session?.data.session)throw new Error('Conecta tu cuenta de sincronización.');headers.Authorization='Bearer '+session.data.session.access_token;}
 const response=await fetch(CLOUD_URL+'/functions/v1/clinova-api',{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.any([ctx.abort.signal,AbortSignal.timeout(20_000)])});
 const data=await response.json();if(!response.ok)throw new Error(data.error??'No se pudo contactar al servidor.');return data;
}
export async function cloudCall(body:any,authenticated=true){if(!current)throw new Error('Inicia sesión.');return api(body,current,current.client,authenticated);}

async function connect(ctx:Context,identifier:string,password:string,invitation=''){
 if(ctx.connecting)return ctx.connecting;
 const revision=++ctx.connection;
 const email=invitation?identifier.trim().toLowerCase():aliases[identifier.trim().toLowerCase()]??identifier.trim().toLowerCase();
 if(aliases[ctx.user.username]&&email!==aliases[ctx.user.username])throw new Error('Usa la cuenta de sincronización asignada a tu usuario.');
 const client=createClient(CLOUD_URL,CLOUD_KEY,{auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'clinova-session-'+crypto.randomUUID()},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.any([ctx.abort.signal,AbortSignal.timeout(15_000),...(init?.signal?[init.signal]:[])])})}});
 const task=(async()=>{
  try{
   set(ctx,{phase:'sincronizando',message:'Conectando tu perfil y actualizando la información…'});
   if(invitation)await api({action:'register',email,password,invitation,local_user_id:ctx.user.id},ctx,null,false);
   const result=await client.auth.signInWithPassword({email,password});
   if(result.error){if(result.error.status&&result.error.status<500&&result.error.status!==429)ctx.password='';throw new Error('No se pudo conectar tu cuenta. Revisa el acceso en Sincronización.');}
   const profile=await api({action:'profile'},ctx,client);
   if(!active(ctx)||ctx.connection!==revision){dispose(client);return;}
   if(profile.role!==ctx.user.role){ctx.password='';throw new Error('El rol de sincronización debe coincidir con tu rol local.');}
   const previous=ctx.client;ctx.client=client;dispose(previous);ctx.password='';ctx.failures=0;ctx.nextAttempt=0;
   set(ctx,{connected:true,email,message:'Perfil conectado. Actualizando registros compartidos…'});
  }catch(error){dispose(client);throw error;}
 })();
 ctx.connecting=task;
 try{await task;}finally{if(ctx.connecting===task)ctx.connecting=null;}
}
export async function connectCloud(identifier:string,password:string,invitation=''){
 const ctx=current;if(!ctx)throw new Error('Inicia sesión local.');
 try{await connect(ctx,identifier,password,invitation);if(active(ctx))await synchronize(true);}
 catch(e){fail(ctx,e);throw e;}
}
export async function disconnectCloud(){
 const ctx=current;if(!ctx)return;
 ctx.connection++;ctx.password='';const client=ctx.client;ctx.client=null;dispose(client);
 set(ctx,{connected:false,email:'',phase:'pendiente',message:'Sincronización desconectada. Los datos locales se conservan.'});
}
async function snapshot(ctx:Context){const result=await request<Snapshot>('sync_snapshot');set(ctx,{pending:result.pending_count,conflicts:result.conflicts,last:result.last_sync});return result;}
export async function refreshSync(){if(current)return snapshot(current);}
export async function synchronize(force=false){
 const ctx=current;if(!ctx||ctx.closed)return;
 if(ctx.busy){ctx.again=true;return;}
 if(!force&&Date.now()<ctx.nextAttempt)return;
 const run=async()=>{
  if(!active(ctx)||ctx.busy)return;ctx.busy=true;ctx.again=false;
  try{
   let snap=await snapshot(ctx);if(!active(ctx))return;
   if(!navigator.onLine){set(ctx,{phase:'pendiente',message:'Sin conexión. Los cambios se enviarán al recuperar internet.'});return;}
   if(ctx.connecting)await ctx.connecting;
   if(!ctx.client&&ctx.password)await connect(ctx,ctx.user.username,ctx.password);
   if(!active(ctx))return;
   if(!ctx.client){if(!ctx.failures)set(ctx,{phase:'pendiente',message:'Conecta tu cuenta para compartir los cambios con el equipo.'});return;}
   const connection=ctx.connection,client=ctx.client;
   if(snap.pending_count>0||!snap.last_sync||force)set(ctx,{phase:'sincronizando',message:'Enviando pendientes y recibiendo cambios del equipo…'});
   for(let page=0;page<20;page++){
    const result=await api({action:'sync',pending:snap.pending,cursor:snap.cursor,local_user_id:ctx.user.id},ctx,client);
    if(!active(ctx)||connection!==ctx.connection)return;
    await request('sync_apply',result);
    if(!active(ctx))return;
    snap=await snapshot(ctx);
    if(!result.has_more&&!snap.pending.length)break;
   }
   ctx.failures=0;ctx.nextAttempt=0;
   set(ctx,{phase:snap.conflicts.length?'error':snap.pending_count?'pendiente':'completado',message:snap.conflicts.length?'Hay versiones diferentes. Revisa los conflictos.':snap.pending_count?'Quedan cambios por enviar.':'Información actualizada con el equipo.'});
   notifyDataChanged('synced');
  }catch(error){fail(ctx,error);}
  finally{ctx.busy=false;if(ctx.again&&active(ctx)){ctx.again=false;queueMicrotask(()=>void synchronize());}}
 };
 if(navigator.locks)await navigator.locks.request('clinova-sync',{ifAvailable:true},lock=>lock?run():Promise.resolve());else await run();
}
export function startSync(user:User,password=''){
 const ctx:Context={user,client:null,password:aliases[user.username]?password:'',closed:false,busy:false,again:false,connecting:null,connection:0,failures:0,nextAttempt:0,abort:new AbortController()};
 current=ctx;state={...initial};set(ctx,{message:'Preparando la información de tu perfil…'});
 const trigger=()=>{ctx.nextAttempt=0;void synchronize();};
 const focus=()=>{if(document.visibilityState==='visible')trigger();};
 const timer=setInterval(()=>void synchronize(),5000);
 window.addEventListener('online',trigger);window.addEventListener('offline',trigger);window.addEventListener('clinova-local-change',trigger);
 if(typeof document!=='undefined')document.addEventListener('visibilitychange',focus);
 void synchronize();
 return()=>{
  ctx.closed=true;ctx.password='';ctx.abort.abort();dispose(ctx.client);ctx.client=null;clearInterval(timer);
  window.removeEventListener('online',trigger);window.removeEventListener('offline',trigger);window.removeEventListener('clinova-local-change',trigger);
  if(typeof document!=='undefined')document.removeEventListener('visibilitychange',focus);
  if(current===ctx)current=null;
 };
}
export async function resolveConflict(id:string,choice:'local'|'server'){
 await request('sync_resolve',{id,choice});await refreshSync();notifyDataChanged('local');await synchronize(true);
}
