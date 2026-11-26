import {useEffect,useState} from 'react';
import {Activity,ArrowRight,ClipboardList,FileDown,HeartPulse,ShieldCheck,Users} from 'lucide-react';
import {listUsers,type Patient,type RecordEntry,type User} from '../db';
import {exportAdminReportPdf} from '../pdf-export';

type Destination='patients'|'users'|'sync';
export default function AdminOverview({patients,records,onOpen}:{patients:Patient[];records:RecordEntry[];onOpen:(view:Destination)=>void}){
 const [users,setUsers]=useState<User[]>([]),[error,setError]=useState('');
 useEffect(()=>{let active=true;const refresh=()=>void listUsers().then(v=>{if(active)setUsers(v);}).catch(e=>{if(active)setError(String(e));});refresh();window.addEventListener('clinova-data-changed',refresh);return()=>{active=false;window.removeEventListener('clinova-data-changed',refresh);};},[]);
 const nursing=patients.filter(p=>p.area==='Enfermería');
 const physio=patients.filter(p=>p.area==='Fisioterapia');
 const waiting=patients.filter(p=>p.status==='En espera').length;
 const inCare=patients.filter(p=>p.status==='En atención').length;
 const discharged=patients.filter(p=>p.status==='Alta').length;
 const recent=[...records].sort((a,b)=>(b.created_at??b.createdAt).localeCompare(a.created_at??a.createdAt)).slice(0,5);
 const patientName=new Map(patients.map(p=>[p.id,p.name]));
 const active=users.filter(u=>u.active).length;
 const percent=(n:number)=>patients.length&&n?`${Math.max(3,Math.round(n/patients.length*100))}%`:'0%';
 return <div className="admin-overview">
  <section className="admin-hero"><div><span className="admin-kicker">CENTRO DE COORDINACIÓN</span><h2>Una vista clara de la clínica.</h2><p>Consulta el movimiento de ambas áreas, administra cuentas y prepara un resumen para presentar. Los registros clínicos se editan en las cuentas de cada profesional.</p><div className="admin-hero-actions"><button onClick={()=>onOpen('patients')}>Ver pacientes <ArrowRight size={16}/></button><button onClick={()=>void exportAdminReportPdf(patients,records,users).catch(e=>setError(String(e)))}><FileDown size={16}/> Informe de coordinación PDF</button></div></div><div className="admin-hero-symbol"><span><HeartPulse size={62}/></span><i/><i/></div></section>
  {error&&<p className="alert error" role="alert">{error}</p>}
  <section className="admin-metrics" aria-label="Resumen de coordinación">
   <article><span><Users size={20}/> Pacientes</span><strong>{patients.length}</strong><small>Fichas locales de ambas áreas</small></article>
   <article><span><HeartPulse size={20}/> Enfermería</span><strong>{nursing.length}</strong><small>{nursing.filter(p=>p.status==='En atención').length} en atención</small></article>
   <article><span><Activity size={20}/> Fisioterapia</span><strong>{physio.length}</strong><small>{physio.filter(p=>p.status==='En atención').length} en atención</small></article>
   <article><span><ShieldCheck size={20}/> Equipo activo</span><strong>{active}</strong><small>{users.length} cuentas locales</small></article>
  </section>
  <div className="admin-columns"><section className="panel admin-flow"><div className="panel-title"><div><h2>Estado de pacientes</h2><p>Distribución de las fichas registradas en este equipo.</p></div></div><div className="admin-flow-body">{[['En espera',waiting],['En atención',inCare],['Alta',discharged]].map(([label,count])=><div className="admin-flow-row" key={label}><div><strong>{label}</strong><span>{count}</span></div><div className="admin-track"><span style={{width:percent(Number(count))}}/></div></div>)}<p className="admin-caption">Estas cifras describen el almacenamiento local. La sincronización tiene su propio estado.</p></div></section>
  <section className="panel admin-quick"><div className="panel-title"><div><h2>Herramientas de coordinación</h2><p>Accesos y seguimiento sin modificar la historia clínica.</p></div></div><div className="admin-quick-list"><button onClick={()=>onOpen('users')}><span><ShieldCheck size={20}/></span><div><strong>Usuarios y permisos</strong><small>Crear, editar, activar o dar de baja cuentas.</small></div><ArrowRight size={17}/></button><button onClick={()=>onOpen('patients')}><span><Users size={20}/></span><div><strong>Directorio general</strong><small>Consultar y organizar pacientes de ambas áreas.</small></div><ArrowRight size={17}/></button><button onClick={()=>onOpen('sync')}><span><Activity size={20}/></span><div><strong>Sincronización clínica</strong><small>Ver pendientes, errores y conflictos del equipo.</small></div><ArrowRight size={17}/></button></div></section></div>
  <section className="panel admin-recent"><div className="panel-title"><div><h2>Actividad clínica reciente</h2><p>Últimos registros visibles en este dispositivo, sin mostrar sus valores clínicos.</p></div><ClipboardList size={22}/></div><div className="admin-recent-list">{recent.map(r=><div key={r.id}><span className={r.kind==='Enfermería'?'admin-dot nurse':'admin-dot physio'}/><div><strong>{patientName.get(r.patientId)??'Paciente'}</strong><small>{r.kind} · {r.author}</small></div><time>{new Date(r.created_at??r.createdAt).toLocaleDateString('es-EC')}</time></div>)}{!recent.length&&<p className="empty">No hay actividad clínica guardada todavía.</p>}</div></section>
 </div>;
}
