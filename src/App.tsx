import {useEffect,useRef,useState,type ReactNode} from 'react';
import {Activity,ArrowRight,CalendarDays,ClipboardList,Database,FileDown,HeartPulse,LayoutDashboard,LogOut,Search,ShieldCheck,Stethoscope,Users,Wallet,Wifi,WifiOff} from 'lucide-react';
import {getData,logout,me,touch,engine,importDesktopLegacy,type Patient,type RecordEntry,type User} from './db';
import ThemeToggle from './components/ThemeToggle';
import AuthScreen from './components/AccessScreen';
import Management from './components/Management';
import ClinicalModule from './components/ClinicalModule';
import FinanceModule from './components/FinanceModule';
import SyncPanel,{SyncBadge} from './components/SyncPanel';
import {startSync} from './sync';
import {useOfflineStatus} from './offline';
import {exportDirectoryPdf} from './pdf-export';

type View='dashboard'|'nursing'|'physio'|'patients'|'users'|'sync';
const Brand=()=> <div className="brand"><img src="./clinova-logo-transparent.png" alt="CLINOVA"/></div>;
const descriptions:Record<View,string>={
 dashboard:'Tu trabajo y los datos que corresponden a tu perfil.',
 nursing:'Atención, signos vitales, triage, medicamentos y hospitalización.',
 physio:'Evaluaciones, goniometría, fuerza, planes y evolución.',
 patients:'Consulta y organización del directorio de pacientes.',
 users:'Cuentas, roles y permisos del equipo.',
 sync:'Estado de los cambios locales y del servidor.'
};

export default function App(){
 const offlineStatus=useOfflineStatus();
 const [user,setUser]=useState<User|null>(null);
 const [view,setView]=useState<View>('dashboard');
 const [patients,setPatients]=useState<Patient[]>([]);
 const [records,setRecords]=useState<RecordEntry[]>([]);
 const [selected,setSelected]=useState('');
 const [query,setQuery]=useState('');
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [online,setOnline]=useState(navigator.onLine);
 const loginPassword=useRef('');
 const activeUser=useRef<string|null>(null);
 activeUser.current=user?.id??null;
 const role=user?.role;
 const accountant=role==='Contable';
 const admin=role==='Administrador';
 const nursing=role==='Enfermero';
 const physio=role==='Fisioterapeuta';
 const dashboardTitle=accountant?'Contabilidad':admin?'Coordinación':'Mi área';
 const title=view==='dashboard'?dashboardTitle:view==='nursing'?'Enfermería':view==='physio'?'Fisioterapia':view==='patients'?'Pacientes':view==='users'?'Usuarios':'Sincronización';
 const accessible=patients.filter(p=>admin||accountant||p.area===(role==='Enfermero'?'Enfermería':'Fisioterapia'));
 const visibleRecords=records.filter(r=>accessible.some(p=>p.id===r.patientId));
 useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};},[]);
 async function refresh(){const id=user?.id;const data=await getData();if(activeUser.current!==id)return;setPatients(data.patients);setRecords(data.records);}
 function clearSession(){loginPassword.current='';activeUser.current=null;setUser(null);setPatients([]);setRecords([]);setError('');setView('dashboard');}
 useEffect(()=>{if(!user)return;setLoading(true);(async()=>{if(user.role==='Administrador')await importDesktopLegacy();await refresh();})().catch(e=>setError(e.message)).finally(()=>setLoading(false));},[user?.id]);
 useEffect(()=>{if(!user)return;const expire=()=>clearSession();window.addEventListener('clinova-session-expired',expire);const check=setInterval(()=>{void me().catch(clearSession);},30000);let last=0;const activity=()=>{if(Date.now()-last>60000){last=Date.now();void touch().catch(clearSession);}};window.addEventListener('pointerdown',activity);window.addEventListener('keydown',activity);return()=>{clearInterval(check);window.removeEventListener('clinova-session-expired',expire);window.removeEventListener('pointerdown',activity);window.removeEventListener('keydown',activity);};},[user?.id]);
 useEffect(()=>{if(!user)return;const stop=accountant?()=>{}:startSync(user,loginPassword.current);loginPassword.current='';const update=()=>void refresh().catch(e=>setError(e.message));window.addEventListener('clinova-data-changed',update);return()=>{stop();window.removeEventListener('clinova-data-changed',update);};},[user?.id]);
 function go(next:View){
  if(next==='nursing'&&!nursing||next==='physio'&&!physio||next==='users'&&!admin||next==='patients'&&!admin&&!accountant||next==='sync'&&accountant)return;
  setView(next);setQuery('');
  if(next==='nursing'||next==='physio')setSelected(patients.find(p=>p.area===(next==='nursing'?'Enfermería':'Fisioterapia'))?.id??'');
 }
 if(!user)return <AuthScreen onLogin={(u,password)=>{loginPassword.current=password;setUser(u);setView('dashboard');}}/>;
 const nav=(target:View,label:string,icon:ReactNode)=><button className={view===target?'nav-item active':'nav-item'} onClick={()=>go(target)}>{icon}{label}</button>;
 return <div className={`app-shell role-${role?.toLowerCase()??'sin-rol'}`}>
  <aside className="sidebar"><Brand/><div className="workspace-label">ESPACIO DE {accountant?'CONTABILIDAD':admin?'COORDINACIÓN':role==='Enfermero'?'ENFERMERÍA':'FISIOTERAPIA'}</div>
   <nav aria-label="Navegación principal">
    {nav('dashboard',dashboardTitle,accountant?<Wallet size={20}/>:<LayoutDashboard size={20}/>)}
    {nursing&&nav('nursing','Enfermería',<HeartPulse size={20}/>)}
    {physio&&nav('physio','Fisioterapia',<Activity size={20}/>)}
    {(admin||accountant)&&nav('patients','Pacientes',<Users size={20}/>)}
    {admin&&nav('users','Usuarios',<ShieldCheck size={20}/>)}
    {!accountant&&nav('sync','Sincronización',<Database size={20}/>)}
   </nav>
   <div className="sidebar-card"><span className="small-icon">{accountant?<Wallet size={21}/>:<Database size={21}/>}</span><strong>{accountant?'Movimientos y saldos':admin?'Coordinación de áreas':role==='Enfermero'?'Atención de enfermería':'Rehabilitación'}</strong><p>{accountant?'Los movimientos contables se guardan en este dispositivo.':'Los registros se conservan localmente y pueden sincronizarse.'}</p><span className="local-tag"><span/>{engine} activo</span><p className="offline-status">{offlineStatus}</p></div>
   <div className="sidebar-bottom"><div className="avatar">{user.name.split(' ').map(w=>w[0]).join('')}</div><div><strong>{user.name}</strong><small>{role}</small></div><button title="Cerrar sesión" aria-label="Cerrar sesión" onClick={()=>{void logout().finally(clearSession);}}><LogOut size={19}/></button></div>
  </aside>
  <div className="main-shell"><header className="topbar"><div>CLINOVA <span className="separator"/> <strong>{title}</strong></div><div className="connection">{online?<Wifi size={16}/>:<WifiOff size={16}/>} {online?'Red disponible':'Sin conexión'}<span className="separator"/>{!accountant&&<SyncBadge open={()=>go('sync')}/>}<ThemeToggle/></div></header>
   <main><div className="page-heading"><div><div className="eyebrow">{role?.toUpperCase()}</div><h1>{title}</h1><p>{accountant&&view==='dashboard'?'Cargos, cobros y pagos de las dos áreas clínicas.':descriptions[view]}</p></div><div className="action-group">{admin&&<button className="secondary" onClick={()=>void exportDirectoryPdf(accessible).catch(e=>setError(String(e)))}><FileDown size={16}/> Exportar directorio PDF</button>}<span className="date-chip"><CalendarDays size={17}/>{new Intl.DateTimeFormat('es-EC',{day:'numeric',month:'long',year:'numeric'}).format(new Date())}</span></div></div>
    <div className="demo-banner"><ShieldCheck size={17}/><span>Proyecto académico · {accountant?'Contabilidad local':'Datos locales y sincronización Supabase'}</span><span className="version">CLINOVA</span></div>
    {error&&<p className="alert error" role="alert">{error}</p>}
    {loading?<p className="panel">Abriendo almacenamiento local…</p>:
     accountant&&view==='dashboard'?<FinanceModule patients={accessible} mode="ledger"/>:
     accountant&&view==='patients'?<FinanceModule patients={accessible} mode="patients"/>:
     view==='dashboard'?<>
      <section className="stats"><Stat label="Pacientes registrados" value={accessible.length} detail={admin?'Ambas áreas':'Tu área'} icon={<Users/>}/><Stat label="En atención" value={accessible.filter(p=>p.status==='En atención').length} detail="Estado actual" icon={<Stethoscope/>}/><Stat label="Registros guardados" value={visibleRecords.length} detail="Almacenamiento local" icon={<ClipboardList/>}/><Stat label="Áreas disponibles" value={admin?2:1} detail="Según tu rol" icon={<Activity/>}/></section>
      <section className="module-grid">
       {nursing&&<button className="module-card nursing-card" onClick={()=>go('nursing')}><div><span className="module-icon"><HeartPulse size={27}/></span><span className="eyebrow">CUIDADO CLÍNICO</span><h2>Enfermería</h2><p>Signos, triage, Kardex, hospitalización y camas.</p><strong>Abrir área <ArrowRight size={17}/></strong></div><div className="module-art"><HeartPulse size={120} strokeWidth={.8}/></div></button>}
       {physio&&<button className="module-card physio-card" onClick={()=>go('physio')}><div><span className="module-icon"><Activity size={27}/></span><span className="eyebrow">REHABILITACIÓN</span><h2>Fisioterapia</h2><p>Evaluación, planes, rutinas y seguimiento.</p><strong>Abrir área <ArrowRight size={17}/></strong></div><div className="module-art"><Activity size={120} strokeWidth={.8}/></div></button>}
       {admin&&<button className="module-card data-card" onClick={()=>go('users')}><div><span className="module-icon"><ShieldCheck size={27}/></span><span className="eyebrow">COORDINACIÓN</span><h2>Usuarios y roles</h2><p>Gestiona el acceso individual del equipo.</p><strong>Abrir gestión <ArrowRight size={17}/></strong></div></button>}
       {admin&&<button className="module-card physio-card" onClick={()=>go('patients')}><div><span className="module-icon"><Users size={27}/></span><span className="eyebrow">DIRECTORIO GENERAL</span><h2>Pacientes</h2><p>Organiza las fichas de las dos áreas clínicas.</p><strong>Abrir directorio <ArrowRight size={17}/></strong></div></button>}
      </section>
      <section className="panel"><div className="panel-title"><div><h2>Pacientes de {admin?'la clínica':'tu área'}</h2><p>{admin?'Organiza las fichas generales de ambas áreas.':'Abre una ficha para continuar su atención.'}</p></div><SearchBox query={query} setQuery={setQuery}/></div><div className="table-wrap"><table><thead><tr><th>Paciente</th><th>Área</th><th>Motivo</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{accessible.filter(p=>`${p.name} ${p.id}`.toLowerCase().includes(query.toLowerCase())).map(p=><tr key={p.id}><td><div className="patient-cell"><span className="patient-avatar">{p.name.charAt(0)}</span><div><strong>{p.name}</strong><small>{p.id} · {p.age} años</small></div></div></td><td>{p.area}</td><td>{p.reason}</td><td><span className={`status ${p.status==='En atención'?'green':''}`}>{p.status}</span></td><td>{admin?<button className="icon-button" aria-label={`Ver ${p.name} en directorio`} onClick={()=>go('patients')}><ArrowRight size={18}/></button>:<button className="icon-button" aria-label={`Abrir ${p.name}`} onClick={()=>{go(p.area==='Enfermería'?'nursing':'physio');setSelected(p.id);}}><ArrowRight size={18}/></button>}</td></tr>)}</tbody></table>{!accessible.length&&<p className="empty">Todavía no hay pacientes en esta área.</p>}</div></section>
     </>:
     view==='sync'?<SyncPanel user={user}/>:
     view==='patients'||view==='users'?<Management key={view} mode={view} onChange={refresh} currentUser={user}/>:
     <ClinicalModule key={view} area={view==='nursing'?'Enfermería':'Fisioterapia'} user={user} patients={patients} records={records} initialPatient={selected} onChange={refresh}/>}
    <footer className="page-footer"><span>CLINOVA · Cuidar también es organizar.</span><span>Montepiedra / 3.º Bachillerato / Grupo 3</span></footer>
   </main></div>
 </div>;
}
function Stat({label,value,detail,icon}:{label:string;value:number;detail:string;icon:ReactNode}){return <article className="stat"><div><span>{label}</span><span className="stat-icon">{icon}</span></div><strong>{String(value).padStart(2,'0')}</strong><small>{detail}</small></article>;}
function SearchBox({query,setQuery}:{query:string;setQuery:(q:string)=>void}){return <label className="search"><Search size={17}/><input aria-label="Buscar paciente" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar paciente…"/></label>;}
