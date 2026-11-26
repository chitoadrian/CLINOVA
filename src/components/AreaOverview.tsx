import {useState} from 'react';
import {Activity,ClipboardList,FileDown,HeartPulse,Users} from 'lucide-react';
import type {Area,Patient,RecordEntry} from '../core/model';
import {exportAreaSummaryPdf} from '../pdf-export';

export default function AreaOverview({area,patients,records,onOpen}:{area:Area;patients:Patient[];records:RecordEntry[];onOpen:()=>void}){
 const [error,setError]=useState('');
 const areaPatients=patients.filter(p=>p.area===area);
 const areaRecords=records.filter(r=>r.kind===area);
 const waiting=areaPatients.filter(p=>p.status==='En espera').length;
 const inCare=areaPatients.filter(p=>p.status==='En atención').length;
 const recent=[...areaRecords].sort((a,b)=>(b.created_at??b.createdAt).localeCompare(a.created_at??a.createdAt)).slice(0,5);
 const name=new Map(areaPatients.map(p=>[p.id,p.name]));
 const nurse=area==='Enfermería';
 return <div className={`area-overview ${nurse?'area-nurse':'area-physio'}`}>
  <section className="area-hero"><div><span>{nurse?'CUIDADO Y SEGUIMIENTO':'MOVIMIENTO Y REHABILITACIÓN'}</span><h2>{nurse?'Atención de Enfermería':'Espacio de Fisioterapia'}</h2><p>{nurse?'Registra la valoración, organiza medicamentos y controla ingresos y camas de tus pacientes.':'Documenta mediciones, planes, rutinas y evolución de tus pacientes.'}</p><div className="area-hero-actions"><button onClick={onOpen}>{nurse?<HeartPulse size={16}/>:<Activity size={16}/>} Abrir módulo</button><button onClick={()=>void exportAreaSummaryPdf(area,areaPatients,areaRecords).catch(e=>setError(String(e)))}><FileDown size={16}/> Resumen del área PDF</button></div></div><span className="area-hero-icon">{nurse?<HeartPulse size={96}/>:<Activity size={96}/>}</span></section>
  {error&&<p className="alert error" role="alert">{error}</p>}
  <section className="area-kpis"><article><Users size={21}/><strong>{areaPatients.length}</strong><span>Pacientes de mi área</span></article><article><ClipboardList size={21}/><strong>{areaRecords.length}</strong><span>Atenciones guardadas</span></article><article><HeartPulse size={21}/><strong>{inCare}</strong><span>En atención</span></article><article><Activity size={21}/><strong>{waiting}</strong><span>En espera</span></article></section>
  <div className="area-bottom"><section className="panel"><div className="panel-title"><div><h2>Pacientes para continuar</h2><p>Abre el módulo para entrar a su ficha.</p></div></div><div className="area-list">{areaPatients.filter(p=>p.status!=='Alta').slice(0,6).map(p=><button key={p.id} onClick={onOpen}><span className="patient-avatar">{p.name.charAt(0)}</span><span><strong>{p.name}</strong><small>{p.reason}</small></span><em>{p.status}</em></button>)}{!areaPatients.some(p=>p.status!=='Alta')&&<p className="empty">No hay pacientes activos. Puedes registrar uno en el módulo.</p>}</div></section>
  <section className="panel"><div className="panel-title"><div><h2>Atenciones recientes</h2><p>Últimos registros locales de {area}.</p></div></div><div className="area-history">{recent.map(r=><div key={r.id}><span className="history-dot"/><div><strong>{name.get(r.patientId)??'Paciente'}</strong><small>{r.author} · {new Date(r.created_at??r.createdAt).toLocaleDateString('es-EC')}</small></div></div>)}{!recent.length&&<p className="empty">Todavía no hay atenciones registradas.</p>}</div></section></div>
 </div>;
}
