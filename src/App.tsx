import { useEffect, useState, useRef, type ReactNode } from 'react';
import { Activity, ArrowRight, CalendarDays, Check, ChevronRight, ClipboardList, Database, HeartPulse, LayoutDashboard, LockKeyhole, LogOut, Search, ShieldCheck, Stethoscope, Users, Wifi, WifiOff } from 'lucide-react';
import { getData, logout, me, touch, engine, importDesktopLegacy, type Patient, type RecordEntry, type User } from './db';
import ThemeToggle from './components/ThemeToggle';
import AuthScreen from './components/AccessScreen';
import Management from './components/Management';
import { useOfflineStatus } from './offline';
import ClinicalModule from './components/ClinicalModule';
import SyncPanel,{SyncBadge} from './components/SyncPanel';
import {startSync} from './sync';

type View = 'dashboard' | 'nursing' | 'physio' | 'patients' | 'users' | 'sync';

function Brand({ light = false }: { light?: boolean }) { return <div className={`brand ${light ? 'light' : ''}`}><img src="./clinova-logo-transparent.png" alt="CLINOVA · Clínica y rehabilitación" /></div>; }

export default function App() {
  const offlineStatus=useOfflineStatus();
  const [user, setUser] = useState<User | null>(null);
  const role = user?.role ?? null;
  const isCoordinator = role === 'Administrador' && user?.username === 'jeshua';
  const isDataLead = role === 'Administrador' && user?.username === 'wilson';
  const showNursing = role !== 'Fisioterapeuta' && !isDataLead;
  const showPhysio = role !== 'Enfermero' && !isDataLead;
  const showUsers = role === 'Administrador' && !isCoordinator;
  const loginPassword=useRef('');
  const activeUser=useRef<string|null>(null);activeUser.current=user?.id??null;
  const [view, setView] = useState<View>('dashboard');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [selected, setSelected] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {

    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  async function refresh() { const id=user?.id; const data=await getData(); if(activeUser.current!==id)return; setPatients(data.patients); setRecords(data.records); }
  function clearSession() { loginPassword.current='';activeUser.current=null;setUser(null); setPatients([]); setRecords([]); setError(''); setNotice(''); setView('dashboard'); }
  useEffect(() => { if(!user)return; setLoading(true); (async()=>{if(user.role==='Administrador')await importDesktopLegacy();await refresh();})().catch(e=>setError(e.message)).finally(()=>setLoading(false)); }, [user?.id]);
  useEffect(() => {
    if(!user)return;
    const expire=()=>clearSession(); window.addEventListener('clinova-session-expired',expire);
    const check=setInterval(()=>{void me().catch(()=>clearSession());},30_000);
    let last=0; const activity=()=>{if(Date.now()-last>60_000){last=Date.now();void touch().catch(()=>clearSession());}};
    window.addEventListener('pointerdown',activity);window.addEventListener('keydown',activity);
    return()=>{clearInterval(check);window.removeEventListener('clinova-session-expired',expire);window.removeEventListener('pointerdown',activity);window.removeEventListener('keydown',activity);};
  },[user?.id]);
  useEffect(()=>{if(!user)return;const stop=startSync(user,loginPassword.current);loginPassword.current='';const update=()=>void refresh().catch(e=>setError(e.message));window.addEventListener('clinova-data-changed',update);return()=>{stop();window.removeEventListener('clinova-data-changed',update);};},[user?.id]);
  function go(next: View) {
    if((next==='patients'||next==='users')&&role!=='Administrador')return;
    if(next==='users'&&!showUsers)return;
    if(next==='nursing'&&!showNursing)return;
    if(next==='physio'&&!showPhysio)return;
    if ((next === 'nursing' && role === 'Fisioterapeuta') || (next === 'physio' && role === 'Enfermero')) return;
    setView(next); setNotice(''); setQuery('');
    if (next === 'nursing' || next === 'physio') setSelected(patients.find(p => p.area === (next === 'nursing' ? 'Enfermería' : 'Fisioterapia'))?.id ?? '');
  }
  const accessible = patients.filter(p => role === 'Administrador' || p.area === (role === 'Enfermero' ? 'Enfermería' : 'Fisioterapia'));
  const visibleRecords = records.filter(r => accessible.some(p => p.id === r.patientId));
  const dashboardTitle = isCoordinator ? 'Coordinación' : isDataLead ? 'Datos y acceso' : 'Vista general';
  const title = view === 'dashboard' ? dashboardTitle : view === 'nursing' ? 'Enfermería' : view==='patients' ? 'Pacientes' : view==='users' ? 'Usuarios' : view==='sync'?'Sincronización':'Fisioterapia';

  if (!role || !user) return <AuthScreen onLogin={(u,password)=>{loginPassword.current=password;setUser(u);setView('dashboard');}}/>;

  return <div className="app-shell"><aside className="sidebar"><Brand/><div className="workspace-label">ESPACIO CLÍNICO</div><nav aria-label="Navegación principal"><button className={view === 'dashboard' ? 'nav-item active' : 'nav-item'} onClick={() => go('dashboard')}><LayoutDashboard size={20}/> {dashboardTitle}</button>{showNursing && <button className={view === 'nursing' ? 'nav-item active' : 'nav-item'} onClick={() => go('nursing')}><HeartPulse size={20}/> Enfermería</button>}{showPhysio && <button className={view === 'physio' ? 'nav-item active' : 'nav-item'} onClick={() => go('physio')}><Activity size={20}/> Fisioterapia</button>}{role==='Administrador'&&<><button className={view==='patients'?'nav-item active':'nav-item'} onClick={()=>go('patients')}><Users size={20}/> Pacientes</button>{showUsers&&<button className={view==='users'?'nav-item active':'nav-item'} onClick={()=>go('users')}><ShieldCheck size={20}/> Usuarios</button>}</>}<button className={view==='sync'?'nav-item active':'nav-item'} onClick={()=>go('sync')}><Database size={20}/> Sincronización</button></nav><div className="sidebar-card"><span className="small-icon"><Database size={21}/></span><strong>{isCoordinator?'Coordinación de áreas':isDataLead?'Gestión de datos':'Tu trabajo, aquí.'}</strong><p>Los registros se conservan localmente en este dispositivo.</p><span className="local-tag"><span/> {engine} activo</span><p className="offline-status">{offlineStatus}</p></div><div className="sidebar-bottom"><div className="avatar">{user.name.split(' ').map(w => w[0]).join('')}</div><div><strong>{user.name}</strong><small>{isCoordinator?'Administrador · Coordinación':isDataLead?'Administrador · Datos':role}</small></div><button title="Cerrar sesión" aria-label="Cerrar sesión" onClick={()=>{void logout().finally(clearSession);}}><LogOut size={19}/></button></div></aside>
    <div className="main-shell"><header className="topbar"><div>Espacio de trabajo <ChevronRight size={14}/> <strong>{title}</strong></div><div className="connection">{online ? <Wifi size={16}/> : <WifiOff size={16}/>} {online ? 'Red disponible' : 'Sin conexión'} <span className="separator"/> <SyncBadge open={()=>go('sync')}/><ThemeToggle/></div></header>
      <main><div className="page-heading"><div><div className="eyebrow">CLINOVA</div><h1>{title}</h1><p>{view === 'dashboard' ? isCoordinator?'Supervisa las áreas clínicas y el avance del equipo.':isDataLead?'Administra las fichas, las cuentas y el intercambio de datos.':'Cada atención cuenta. Así está tu espacio de trabajo.' : view === 'nursing' ? 'Un cuidado atento empieza con un registro claro.' : view==='patients' ? 'Administra las fichas del directorio local.' : view==='users' ? 'Gestiona las cuentas y sus permisos.' : view==='sync'?'Consulta pendientes, confirmaciones y conflictos.' : 'Acompaña el progreso, sesión a sesión.'}</p></div><span className="date-chip"><CalendarDays size={17}/>{new Intl.DateTimeFormat('es-EC', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</span></div>
      <div className="demo-banner"><ShieldCheck size={17}/><span>Entorno académico · Datos locales y sincronización protegida</span><span className="version">v0.4 / Semana 4</span></div>
      {error && <p className="alert error" role="alert">{error}</p>}{notice && <p className="alert success" role="status"><Check size={17}/>{notice}</p>}{loading ? <p className="panel">Abriendo almacenamiento local…</p> : view === 'dashboard' ? <>
        <section className="stats"><Stat label="Pacientes registrados" value={accessible.length} detail="En tu área de trabajo" icon={<Users/>}/><Stat label="En atención" value={accessible.filter(p => p.status === 'En atención').length} detail="Estado del directorio local" icon={<Stethoscope/>}/><Stat label="Registros guardados" value={visibleRecords.length} detail="Persistencia en este equipo" icon={<ClipboardList/>}/><Stat label="Áreas disponibles" value={role === 'Administrador' ? 2 : 1} detail="Según tu perfil de acceso" icon={<Activity/>}/></section>
        <section className="module-grid">{isDataLead?<><button className="module-card data-card" onClick={()=>go('patients')}><div><span className="module-icon"><Database size={27}/></span><span className="eyebrow">BASE LOCAL</span><h2>Pacientes</h2><p>Consulta y organiza las fichas de ambas áreas.</p><strong>Abrir directorio <ArrowRight size={17}/></strong></div><div className="module-art"><Database size={120} strokeWidth={.8}/></div></button><button className="module-card data-card users-card" onClick={()=>go('users')}><div><span className="module-icon"><ShieldCheck size={27}/></span><span className="eyebrow">ACCESO Y ROLES</span><h2>Usuarios</h2><p>Administra las cuentas del equipo y sus permisos.</p><strong>Abrir usuarios <ArrowRight size={17}/></strong></div><div className="module-art"><ShieldCheck size={120} strokeWidth={.8}/></div></button></>:<>{showNursing && <button className="module-card nursing-card" onClick={() => go('nursing')}><div><span className="module-icon"><HeartPulse size={27}/></span><span className="eyebrow">ATENCIÓN INTEGRAL</span><h2>Enfermería</h2><p>Signos vitales y triage en un mismo espacio.</p><strong>Abrir módulo <ArrowRight size={17}/></strong></div><div className="module-art"><HeartPulse size={120} strokeWidth={.8}/></div></button>}{showPhysio && <button className="module-card physio-card" onClick={() => go('physio')}><div><span className="module-icon"><Activity size={27}/></span><span className="eyebrow">MOVIMIENTO Y BIENESTAR</span><h2>Fisioterapia</h2><p>Evaluación inicial y registro de rehabilitación.</p><strong>Abrir módulo <ArrowRight size={17}/></strong></div><div className="module-art"><Activity size={120} strokeWidth={.8}/></div></button>}</>}</section>
        <section className="panel"><div className="panel-title"><div><h2>Pacientes del espacio</h2><p>{isDataLead?'Fichas disponibles para revisar en el directorio.':'Pacientes disponibles para iniciar una atención.'}</p></div><SearchBox query={query} setQuery={setQuery}/></div><div className="table-wrap"><table><thead><tr><th>Paciente</th><th>Área</th><th>Motivo de atención</th><th>Estado</th><th><span className="sr-only">Acción</span></th></tr></thead><tbody>{accessible.filter(p => `${p.name} ${p.id}`.toLowerCase().includes(query.toLowerCase())).map(p => <tr key={p.id}><td><div className="patient-cell"><span className="patient-avatar">{p.name.charAt(0)}</span><div><strong>{p.name}</strong><small>{p.id} · {p.age} años</small></div></div></td><td>{p.area}</td><td>{p.reason}</td><td><span className={`status ${p.status === 'En atención' ? 'green' : ''}`}>{p.status}</span></td><td><button className="icon-button" aria-label={`Abrir ${p.name}`} onClick={() => {if(isDataLead){go('patients');return;}go(p.area === 'Enfermería' ? 'nursing' : 'physio');setSelected(p.id);}}><ArrowRight size={18}/></button></td></tr>)}</tbody></table>{!accessible.some(p => `${p.name} ${p.id}`.toLowerCase().includes(query.toLowerCase())) && <p className="empty">No hay pacientes que coincidan con la búsqueda.</p>}</div></section>
      </> : view==='sync'?<SyncPanel user={user}/>: (view==='patients'||view==='users') && role==='Administrador' && (view!=='users'||showUsers) ? <Management key={view} mode={view} onChange={refresh} currentUser={user}/> : <ClinicalModule key={view} area={view==='nursing'?'Enfermería':'Fisioterapia'} user={user} patients={patients} records={records} initialPatient={selected} onChange={refresh}/>}
      <footer className="page-footer"><span>CLINOVA · Cuidar también es organizar.</span><span>Montepiedra / 3.º Bachillerato / Grupo 3</span></footer></main></div></div>;
}
function Stat({ label, value, detail, icon }: { label: string; value: number; detail: string; icon: ReactNode }) { return <article className="stat"><div><span>{label}</span><span className="stat-icon">{icon}</span></div><strong>{String(value).padStart(2, '0')}</strong><small>{detail}</small></article>; }
function SearchBox({ query, setQuery }: { query: string; setQuery: (q: string) => void }) { return <label className="search"><Search size={17}/><input aria-label="Buscar paciente" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar paciente…"/></label>; }
