// Ejecutar contra Vite en un puerto de ensayo. Navegador nuevo, datos y servidor ficticios.
// PLAYWRIGHT_MODULE puede señalar una instalación existente de playwright.
import {createRequire} from 'node:module';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {pbkdf2Sync,randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.CLINOVA_QA_URL||'http://127.0.0.1:1424';
if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin))throw Error('Solo se permite un servidor local de ensayo.');
const output=new URL('../../evidencias/',import.meta.url);mkdirSync(output,{recursive:true});
const fixture=JSON.parse(readFileSync(new URL('../src/core/team-accounts.json',import.meta.url),'utf8'));
const password='Acceso ficticio para QA Semana 4';
for(const a of fixture.accounts){const salt=randomBytes(16).toString('hex');Object.assign(a,{salt,password_hash:pbkdf2Sync(password,Buffer.from(salt,'hex'),600000,32,'sha256').toString('hex')});}
const roles={'presentacion@clinova.example':'Administrador','wilson@clinova.example':'Administrador','enfermero@clinova.example':'Enfermero','fisioterapeuta@clinova.example':'Fisioterapeuta'};
const emailUsers={'presentacion@clinova.example':'jeshua','wilson@clinova.example':'wilson','enfermero@clinova.example':'adrian','fisioterapeuta@clinova.example':'matias'};
const remote=new Map();let sequence=0,unavailable=false,linkDown=false,requests=0;
const errors=[],results=[],exchanges=[];
const browser=await chromium.launch({channel:'msedge',headless:true});
async function context(){
 const ctx=await browser.newContext({viewport:{width:1440,height:960}});
 await ctx.route('**/src/core/team-accounts.json*',r=>r.fulfill({contentType:'application/javascript',body:'export default '+JSON.stringify(fixture)}));
 await ctx.route('https://gcsodpalqwwpsiodeeil.supabase.co/**',async route=>{
  requests++;if(linkDown)return route.abort('internetdisconnected');
  const req=route.request(),url=new URL(req.url());
  const send=(obj,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(obj)});
  if(unavailable)return send({error:'Servidor de ensayo temporalmente indisponible'},503);
  if(url.pathname.includes('/auth/v1/token')){
   const {email}=req.postDataJSON(),account=fixture.accounts.find(a=>a.username===emailUsers[email]);
   if(!account)return send({error:'invalid_credentials'},400);
   const exp=Math.floor(Date.now()/1000)+3600;
   const payload={sub:account.id,email,exp,role:'authenticated'};
   const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify(payload)).toString('base64url')+'.'+Buffer.from('firma-ficticia').toString('base64url');
   return send({access_token:token,refresh_token:'refresh-ficticio-qa',token_type:'bearer',expires_in:3600,expires_at:exp,user:{id:account.id,email,role:'authenticated',aud:'authenticated',created_at:new Date().toISOString()}});
  }
  if(url.pathname.includes('/auth/v1/logout'))return route.fulfill({status:204});
  if(url.pathname.includes('/functions/v1/clinova-api')){
   const token=req.headers().authorization?.split(' ')[1];
   if(!token)return send({error:'Sin sesión'},401);
   const {email}=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()),role=roles[email],body=req.postDataJSON();
   if(body.action==='profile')return send({role,active:true});
   if(body.action==='sync'){
    exchanges.push({email,pending:body.pending.length,cursor:body.cursor});
    const acknowledgements=[];
    for(const op of body.pending){const doc={...op.doc,revision:(remote.get(op.id)?.revision??0)+1,sequence:++sequence};remote.set(op.id,doc);acknowledgements.push({id:op.id,op_id:op.op_id,status:'applied',document:doc});}
    const changes=[...remote.values()].filter(d=>d.sequence>body.cursor&&(role==='Administrador'||d.area===(role==='Enfermero'?'Enfermería':'Fisioterapia')));
    return send({acknowledgements,changes,cursor:sequence,has_more:false});
   }
  }
  return send({error:'Ruta no preparada en el servidor ficticio'},404);
 });
 return ctx;
}
async function login(page,username){
 await page.goto(origin);
 await page.getByLabel('Usuario',{exact:true}).fill(username);
 await page.getByLabel('Contraseña',{exact:true}).fill(password);
 await page.getByRole('button',{name:'Ingresar a CLINOVA'}).click();
 await page.getByRole('button',{name:'Cerrar sesión'}).waitFor();
 await untilSync(page,'completado');
}
async function untilSync(page,phase){
 const deadline=Date.now()+30000;let current;
 while(Date.now()<deadline){current=await page.evaluate(async()=> (await import('/src/sync-engine.ts')).getSyncState());if(current.phase===phase)return current;await page.waitForTimeout(150);}
 throw Error('Estado esperado '+phase+', obtenido '+JSON.stringify(current));
}
try{
 const ctx=await context(),page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 for(const [username,role] of [['jeshua','Administrador'],['wilson','Administrador'],['adrian','Enfermero'],['matias','Fisioterapeuta']]){
  await login(page,username);
  const buttons=await page.locator('aside button').allTextContents();
  assert.equal(buttons.some(x=>x.trim()==='Usuarios'),role==='Administrador');
  assert.equal(buttons.some(x=>x.trim()==='Enfermería'),role!=='Fisioterapeuta');
  assert.equal(buttons.some(x=>x.trim()==='Fisioterapia'),role!=='Enfermero');
  results.push({case:'Acceso y navegación '+username,result:'correcto',role});
  await page.getByRole('button',{name:'Cerrar sesión'}).click();
 }
 await login(page,'adrian');
 linkDown=true;await ctx.setOffline(true);
 await page.waitForFunction(()=>navigator.onLine===false);
 const load=await page.evaluate(async()=>{
  const db=await import('/src/db.ts');const begin=performance.now();
  for(let i=0;i<250;i++)await db.savePatient({name:'Paciente QA '+String(i).padStart(3,'0'),age:30,area:'Enfermería',reason:'Ensayo local ficticio',status:'En espera'});
  const data=await db.getData();return{count:data.patients.length,milliseconds:Math.round(performance.now()-begin),pending:(await db.request('sync_snapshot')).pending_count};
 });
 assert.equal(load.count,250);assert.equal(load.pending,250);results.push({case:'250 altas sin red en IndexedDB real',result:'correcto',...load});
 await page.locator('aside').getByRole('button',{name:'Enfermería',exact:true}).click();
 await page.getByRole('button',{name:'Registrar / editar pacientes'}).click();
 await page.getByLabel('Buscar en directorio').fill('Paciente QA 000');
 await page.getByRole('button',{name:'Editar Paciente QA 000',exact:true}).click();
 await page.getByLabel('Motivo de atención',{exact:true}).fill('Edición offline Semana 4');
 await page.getByRole('button',{name:'Guardar cambios'}).click();
 await page.getByText('Cambios guardados en este dispositivo.',{exact:true}).waitFor();
 await page.screenshot({path:new URL('07_guardado_offline.png',output).pathname.replace(/^\/([A-Za-z]:)/,'$1'),fullPage:true});
 await page.getByRole('button',{name:'Cerrar sesión'}).click();
 await page.getByLabel('Usuario',{exact:true}).fill('adrian');await page.getByLabel('Contraseña',{exact:true}).fill(password);
 await page.getByRole('button',{name:'Ingresar a CLINOVA'}).click();await page.getByRole('button',{name:'Cerrar sesión'}).waitFor();
 const kept=await page.evaluate(async()=> (await (await import('/src/db.ts')).getData()).patients.find(p=>p.name==='Paciente QA 000').reason);
 assert.equal(kept,'Edición offline Semana 4');results.push({case:'Edición por formulario y reingreso offline',result:'correcto'});
 unavailable=true;linkDown=false;await ctx.setOffline(false);
 await untilSync(page,'error');
 const failed=await page.evaluate(async()=> (await import('/src/sync-engine.ts')).getSyncState());assert.equal(failed.pending,250);
 results.push({case:'HTTP 503 conserva 250 pendientes',result:'correcto'});
 unavailable=false;
 await page.evaluate(()=>window.dispatchEvent(new Event('online')));
 await untilSync(page,'completado');
 assert.equal(remote.size,250,JSON.stringify({exchanges,state:await page.evaluate(async()=> (await import('/src/sync-engine.ts')).getSyncState())}));assert.equal([...remote.values()].find(p=>p.payload.name==='Paciente QA 000').payload.reason,'Edición offline Semana 4');
 await page.locator('aside').getByRole('button',{name:'Sincronización',exact:true}).click();
 await page.screenshot({path:new URL('08_recuperacion_sincronizacion.png',output).pathname.replace(/^\/([A-Za-z]:)/,'$1'),fullPage:true});
 results.push({case:'Recuperación y envío a API ficticia',result:'correcto',records:remote.size});
 const receiver=await context(),other=await receiver.newPage();await login(other,'wilson');
 const received=await other.evaluate(async()=> (await (await import('/src/db.ts')).getData()).patients);
 assert.equal(received.length,250);assert.equal(received.find(p=>p.name==='Paciente QA 000').reason,'Edición offline Semana 4');
 results.push({case:'Recepción en segundo contexto IndexedDB independiente',result:'correcto',records:received.length});
 await other.getByRole('button',{name:'Activar modo oscuro'}).click();
 await other.setViewportSize({width:615,height:900});
 const width=await other.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
 assert.ok(width.scroll<=width.client);results.push({case:'Modo oscuro y vista estrecha',result:'correcto',...width});
 assert.deepEqual(errors,[]);
 writeFileSync(new URL('09_resultado_navegador.json',output),JSON.stringify({date:'2026-11-17',browser:await browser.version(),scope:'Edge headless, IndexedDB real, cuatro roles con claves ficticias; API interceptada, sin tráfico ni datos en Supabase real',requests,results,errors},null,2));
 console.log(JSON.stringify({passed:results.length,results,errors},null,2));
}finally{await browser.close();}
