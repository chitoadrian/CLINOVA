import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
import {validateDocument,uuid} from './clinical.ts';
const url=Deno.env.get('SUPABASE_URL')!;
const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
const allowed=new Set(['https://orange-seal-508462.hostingersite.com','https://clinova-montepiedra-grupo3.cosmiccompass2.chatgpt.site','http://127.0.0.1:1420','http://localhost:1420','http://127.0.0.1:4174','http://localhost:4174','http://127.0.0.1:4175','http://localhost:4175','tauri://localhost','http://tauri.localhost','https://tauri.localhost',...(Deno.env.get('CLINOVA_ALLOWED_ORIGINS')??'').split(',').filter(Boolean)]);
const sha=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
async function rpc(name:string,args:Record<string,unknown>){const{data,error}=await admin.rpc(name,args);if(error)throw new Error(error.message);return data;}
Deno.serve(async(req)=>{
 const origin=req.headers.get('origin')??'';
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':origin||'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
 const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!allowed.has(origin))return response({error:'Origen no autorizado'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return response({error:'Método no admitido'},405);
 try{
  const text=await req.text();if(text.length>1_000_000)return response({error:'Lote demasiado grande'},413);
  const body=JSON.parse(text);
  if(body.action==='register'){
   if(typeof body.invitation!=='string'||body.invitation.length!==64||!uuid(body.local_user_id)||typeof body.email!=='string'||!/^\S+@\S+\.\S+$/.test(body.email)||typeof body.password!=='string'||body.password.length<10||body.password.length>128)throw new Error('Completa correo, contraseña e invitación.');
   const hash=await sha(body.invitation);
   await rpc('clinova_check_invite',{p_hash:hash,p_email:body.email,p_local:body.local_user_id});
   const created=await admin.auth.admin.createUser({email:body.email,password:body.password,email_confirm:true});
   if(created.error)throw new Error('No se pudo crear la cuenta. Usa otro correo o inicia sesión.');
   try{await rpc('clinova_accept_invite',{p_hash:hash,p_user:created.data.user.id,p_local:body.local_user_id,p_email:body.email});}
   catch(e){await admin.auth.admin.deleteUser(created.data.user.id);throw e;}
   return response({ok:true});
  }
  // Verificación explícita en cada petición; nunca confiar en claims enviados por el cliente.
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
  if(!token)return response({error:'Inicia sesión en la nube'},401);
  const auth=await admin.auth.getUser(token);
  if(auth.error||!auth.data.user)return response({error:'Sesión cloud inválida o vencida'},401);
  const member=await rpc('clinova_profile',{p_user:auth.data.user.id});
  if(!member)return response({error:'Cuenta sin acceso a CLINOVA'},403);
  if(body.action==='profile')return response(member);
  if(body.action==='invite'){
   if(member.role!=='Administrador'||!['Administrador','Enfermero','Fisioterapeuta'].includes(body.role)||!/^\S+@\S+\.\S+$/.test(body.email??'')||!uuid(body.local_user_id))return response({error:'Invitación no autorizada o incompleta'},403);
   const invitation=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join('');
   await rpc('clinova_invite',{p_user:auth.data.user.id,p_hash:await sha(invitation),p_role:body.role,p_email:body.email,p_local:body.local_user_id});
   return response({invitation,expires_in:'7 días'});
  }
  if(body.action==='sync'){
   if(!Array.isArray(body.pending)||body.pending.length>50||!Number.isSafeInteger(body.cursor)||body.cursor<0||!uuid(body.local_user_id))throw new Error('Lote inválido.');
   for(const change of body.pending){if(!uuid(change.op_id)||!Number.isSafeInteger(change.base_revision)||change.base_revision<0)throw new Error('Operación inválida.');validateDocument(change.doc,member.role);}
   return response(await rpc('clinova_exchange',{p_user:auth.data.user.id,p_local:body.local_user_id,p_pending:body.pending,p_cursor:body.cursor}));
  }
  return response({error:'Acción desconocida'},400);
 }catch(e){return response({error:e instanceof Error?e.message:'Operación fallida'},400);}
});
