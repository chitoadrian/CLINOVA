import type{Patient,RecordEntry,User,UserInput,PatientInput}from'./core/model';
export type{Patient,RecordEntry,User,Role}from'./core/model';
const native='__TAURI_INTERNALS__'in window;let token='';
export const engine=native?'SQLite':'IndexedDB';
const channel=typeof BroadcastChannel!=='undefined'&&typeof document!=='undefined'?new BroadcastChannel('clinova-shared-data'):null;
export function notifyDataChanged(kind:'local'|'synced'){
 window.dispatchEvent(new Event('clinova-data-changed'));
 if(kind==='local')window.dispatchEvent(new Event('clinova-local-change'));
 channel?.postMessage({kind});
}
if(channel)channel.onmessage=event=>{
 if(!token||!['local','synced'].includes(event.data?.kind))return;
 window.dispatchEvent(new Event('clinova-data-changed'));
 if(event.data.kind==='local')window.dispatchEvent(new Event('clinova-local-change'));
 void me().catch(()=>{});
};
export async function request<T>(op:string,payload:unknown={}):Promise<T>{
 const requestToken=token;
 try{
  let value:T;
  if(native){const{invoke}=await import('@tauri-apps/api/core');value=await invoke<T>('clinic_request',{op,payload,token:requestToken});}
  else{const{webRequest}=await import('./core/web');value=await webRequest(op,payload,requestToken);}
  if(requestToken===token&&/_(save|delete)$/.test(op))notifyDataChanged('local');
  return value;
 }catch(e){const message=e instanceof Error?e.message:String(e);if(message==='SESSION_EXPIRED'&&requestToken===token){token='';window.dispatchEvent(new Event('clinova-session-expired'));}throw new Error(message);}
}
export const status=()=>request<{initialized:boolean;engine:string;schema:number}>('status');
export const bootstrap=(data:{name:string;username:string;password:string})=>request('bootstrap',data);
export async function login(username:string,password:string){const result=await request<{token:string;user:User}>('login',{username,password});token=result.token;return result.user;}
export async function logout(){try{await request('logout');}finally{token='';}}
export const me=()=>request<User>('me');export const touch=()=>request<User>('touch');
export const getData=()=>request<{patients:Patient[];records:RecordEntry[]}>('data');
export const listUsers=()=>request<User[]>('users');
export const saveUser=(data:UserInput)=>request<User>('user_save',data);
export const deleteUser=(id:string,version:number)=>request('user_delete',{id,version});
export const savePatient=(data:PatientInput)=>request<Patient>('patient_save',data);
export const deletePatient=(id:string,version:number)=>request('patient_delete',{id,version});
export const saveRecord=(data:Pick<RecordEntry,'patientId'|'kind'|'values'>&{id?:string;version?:number})=>request<RecordEntry>('record_save',data);
export async function importDesktopLegacy(){if(native){const{legacySnapshot}=await import('./core/web');await request('legacy_import',await legacySnapshot());}}

export const deleteRecord=(id:string,version:number)=>request('record_delete',{id,version});
