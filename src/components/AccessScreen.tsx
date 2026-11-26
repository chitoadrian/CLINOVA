import {useEffect,useState,type FormEvent} from 'react';
import {Eye,EyeOff,LockKeyhole,ShieldCheck,HeartPulse,Activity,Cloud,UserRound,Wallet} from 'lucide-react';
import {status,bootstrap,login,type User} from '../db';
import './AccessScreen.css';
import ThemeToggle from './ThemeToggle';

export default function AccessScreen({onLogin}:{onLogin:(u:User,password:string)=>void}){
 const [initialized,setInitialized]=useState<boolean|null>(null),[name,setName]=useState(''),[username,setUsername]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[visible,setVisible]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{
  let active=true;
  status().then(s=>{if(active)setInitialized(s.initialized);}).catch(e=>{if(active)setError(String(e));});
  const blocked=()=>setError('Cierra las otras pestañas de CLINOVA para completar la actualización.');
  window.addEventListener('clinova-db-blocked',blocked);
  return()=>{active=false;window.removeEventListener('clinova-db-blocked',blocked);};
 },[]);
 async function submit(e:FormEvent){
  e.preventDefault();if(busy)return;setError('');setBusy(true);
  try{
   if(!initialized){if(password!==confirm)throw new Error('Las contraseñas no coinciden.');await bootstrap({name,username,password});setInitialized(true);}
   const user=await login(username,password);onLogin(user,password);setPassword('');setConfirm('');
  }catch(e){setError(e instanceof Error?e.message:String(e));setPassword('');setConfirm('');}
  finally{setBusy(false);}
 }
 return <div className="auth-page">
  <header className="auth-header"><div className="auth-brand"><img src="./clinova-logo-transparent.png" alt="CLINOVA"/></div><span className="auth-header-label">SISTEMA DE GESTIÓN CLÍNICA</span><ThemeToggle/></header>
  <main className="auth-layout">
   <section className="auth-intro" aria-label="Bienvenida a CLINOVA">
    <span className="auth-eyebrow"><span/> ATENCIÓN INTEGRAL</span>
    <h1>Un equipo conectado.<br/><em>Una atención más cercana.</em></h1>
    <p>La información que tu equipo necesita, organizada en un solo espacio de trabajo.</p>
    <div className="auth-services"><div><HeartPulse size={22}/><span><strong>Enfermería</strong><small>Registro y seguimiento clínico</small></span></div><div><Activity size={22}/><span><strong>Fisioterapia</strong><small>Evaluación y rehabilitación</small></span></div><div><Wallet size={22}/><span><strong>Contabilidad</strong><small>Cargos, cobros y pagos internos</small></span></div></div>
    <div className="auth-connection"><Cloud size={18}/><span>Trabaja sin conexión. Los registros clínicos se sincronizan al volver.</span></div>
   </section>
   <section className="auth-card" aria-labelledby="access-title">
    <div className="auth-card-top"><span className="auth-lock"><LockKeyhole size={22}/></span><span>ACCESO DEL PERSONAL</span></div>
    <h2 id="access-title">{initialized===false?'Configurar acceso':'Iniciar sesión'}</h2>
    <p className="auth-description">{initialized===false?'Crea la cuenta del primer administrador.':'Ingresa tus credenciales para acceder a tu espacio clínico.'}</p>
    {initialized===null?<p className="auth-loading" role="status">Preparando tu acceso…</p>:<form onSubmit={submit} aria-label="Acceso a CLINOVA">
     {!initialized&&<label className="auth-field"><span>Nombre completo</span><input value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={80} required autoComplete="name" disabled={busy}/></label>}
     <label className="auth-field"><span>Usuario</span><div className="auth-input"><UserRound size={18}/><input value={username} onChange={e=>setUsername(e.target.value)} minLength={3} maxLength={32} required autoComplete="username" placeholder="Tu nombre de usuario" autoCapitalize="none" spellCheck={false} disabled={busy}/></div></label>
     <label className="auth-field"><span>Contraseña</span><div className="auth-input"><LockKeyhole size={18}/><input aria-label="Contraseña" value={password} onChange={e=>setPassword(e.target.value)} type={visible?'text':'password'} required minLength={initialized?undefined:10} maxLength={128} autoComplete={initialized?'current-password':'new-password'} placeholder="Ingresa tu contraseña" disabled={busy}/><button className="auth-reveal" type="button" aria-label={visible?'Ocultar contraseña':'Mostrar contraseña'} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
     {!initialized&&<label className="auth-field"><span>Confirmar contraseña</span><input value={confirm} onChange={e=>setConfirm(e.target.value)} type={visible?'text':'password'} required minLength={10} maxLength={128} autoComplete="new-password" disabled={busy}/></label>}
     {error&&<p className="auth-error" role="alert">{error}</p>}
     <button className="auth-submit" disabled={busy} type="submit"><span>{busy?'Validando acceso…':initialized?'Ingresar a CLINOVA':'Crear administrador'}</span><ShieldCheck size={19}/></button>
    </form>}
    {initialized===null&&error&&<p className="auth-error" role="alert">{error}</p>}
    <div className="auth-security"><ShieldCheck size={17}/><p>Acceso personal protegido.<br/><span>La información disponible depende de tu rol.</span></p></div>
   </section>
  </main>
  <footer className="auth-footer"><span>CLINOVA · Gestión clínica y rehabilitación</span><span>Unidad Educativa Montepiedra · Grupo 3</span></footer>
 </div>;
}
