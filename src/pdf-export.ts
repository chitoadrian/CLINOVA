import type {Area,Patient,RecordEntry,FinanceEntry} from './core/model';
import type {ClinicalItem} from './core/clinical';

const titles:Record<string,string>={encounter:'Atención y evaluación',kardex:'Kardex de medicamentos',bed:'Cama',admission:'Hospitalización',routine:'Plan y rutina de rehabilitación',evolution:'Evolución'};
const names:Record<string,string>={temperatura:'Temperatura (°C)',pulso:'Pulso (lpm)',sistolica:'Presión sistólica (mmHg)',diastolica:'Presión diastólica (mmHg)',saturacion:'Saturación de oxígeno (%)',triage:'Triage',observaciones:'Observaciones',region:'Región',lado:'Lado',movimiento:'Movimiento',grados:'Goniometría (grados)',daniels:'Escala Daniels (0-5)',dolor:'Dolor (0-10)',plan:'Valoración inicial',medication:'Medicamento',dose:'Dosis',route:'Vía',frequency:'Frecuencia',scheduled_at:'Programado',administered_at:'Administrado',state:'Estado',notes:'Notas',admitted_at:'Ingreso',discharged_at:'Alta',reason:'Motivo',objective:'Objetivo',exercises:'Ejercicios, series y repeticiones',start_date:'Inicio',end_date:'Fin previsto',session_date:'Fecha de sesión',pain:'Dolor (0-10)',degrees:'Goniometría (grados)',progress:'Evolución y actividades'};
const clean=(v:unknown)=>String(v??'').replace(/[\x00-\x1f\x7f]/g,' ').trim();
const file=(name:string)=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,55);

type Entry={kind:string;date:string;author:string;values:Record<string,string>};
async function createPdf(title:string,patient:Patient,entries:Entry[],filename:string){
 const {jsPDF}=await import('jspdf');
 const doc=new jsPDF({unit:'mm',format:'a4'});const width=210,margin=18,right=192;let y=22,page=1;
 const header=()=>{doc.setFillColor(17,57,80);doc.rect(0,0,width,14,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('CLINOVA  /  CLÍNICA SANPICHITO',margin,9);doc.setTextColor(32,55,67);};
 const footer=()=>{doc.setDrawColor(201,221,227);doc.line(margin,279,right,279);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(92,111,123);doc.text('Documento académico generado desde registros locales · Revisar antes de compartir',margin,284);doc.text(String(page),right,284,{align:'right'});doc.setTextColor(32,55,67);};
 const next=(height=10)=>{if(y+height>271){footer();doc.addPage();page++;header();y=23;}};
 const line=(label:string,value:unknown)=>{const text=clean(value)||'—';doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(26,74,90);next(7);doc.text(clean(label),margin,y);y+=4.5;doc.setFont('helvetica','normal');doc.setTextColor(32,55,67);const lines=doc.splitTextToSize(text,right-margin);next(lines.length*4.4+4);doc.text(lines,margin,y);y+=lines.length*4.4+3;};
 header();doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text(clean(title),margin,y);y+=8;
 doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(92,111,123);doc.text('Generado: '+new Date().toLocaleString('es-EC'),margin,y);y+=9;
 doc.setFillColor(234,246,248);doc.roundedRect(margin,y,right-margin,22,2,2,'F');y+=6;doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(17,57,80);doc.text(clean(patient.name),margin+4,y);y+=5;doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text(`${patient.age} años  ·  ${patient.area}  ·  ${patient.status}`,margin+4,y);y+=5;doc.text('ID: '+patient.id,margin+4,y);y+=14;
 line('Motivo de atención',patient.reason);
 if(!entries.length){next(15);doc.setFont('helvetica','italic');doc.text('No hay registros guardados en este informe.',margin,y);y+=8;}
 for(const [index,entry] of entries.entries()){
  next(18);doc.setDrawColor(201,221,227);doc.line(margin,y,right,y);y+=6;doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(17,57,80);doc.text(`${index+1}. ${titles[entry.kind]??entry.kind}`,margin,y);y+=6;
  doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(92,111,123);doc.text('Fecha: '+clean(entry.date)+'  ·  Registrado por: '+clean(entry.author),margin,y);y+=7;doc.setTextColor(32,55,67);
  for(const [key,value] of Object.entries(entry.values))if(clean(value))line(names[key]??key,value);
 }
 footer();doc.save(filename);
}

export function exportAreaPdf(area:Area,patient:Patient,records:RecordEntry[],items:ClinicalItem[]){
 const entries:Entry[]=[...records.filter(r=>r.patientId===patient.id&&r.kind===area).map(r=>({kind:'encounter',date:r.created_at??r.createdAt,author:r.author,values:r.values})),...items.filter(i=>i.area===area&&i.patient_id===patient.id).map(i=>({kind:i.kind,date:i.created_at,author:i.author,values:i.values}))].sort((a,b)=>a.date.localeCompare(b.date));
 return createPdf(`Informe de ${area}`,patient,entries,`CLINOVA_${file(area)}_${file(patient.name)}.pdf`);
}
export function exportRoutinePdf(patient:Patient,routine:ClinicalItem){
 if(routine.kind!=='routine'||routine.patient_id!==patient.id)throw new Error('Selecciona una rutina de este paciente.');
 return createPdf('Plan de rehabilitación',patient,[{kind:'routine',date:routine.created_at,author:routine.author,values:routine.values}],`CLINOVA_Rutina_${file(patient.name)}.pdf`);
}

async function exportLines(title:string,lines:string[],filename:string){
 const {jsPDF}=await import('jspdf');
 const doc=new jsPDF({unit:'mm',format:'a4'});let y=25,page=1;
 const head=()=>{doc.setFillColor(17,57,80);doc.rect(0,0,210,14,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('CLINOVA / DOCUMENTO ACADÉMICO',18,9);doc.setTextColor(32,55,67);};
 const foot=()=>{doc.setDrawColor(201,221,227);doc.line(18,278,192,278);doc.setFontSize(8);doc.setTextColor(92,111,123);doc.text('Generado desde datos locales · Revisar antes de compartir',18,283);doc.text(String(page),192,283,{align:'right'});};
 head();doc.setFontSize(17);doc.text(title,18,y);y+=9;doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text('Fecha: '+new Date().toLocaleString('es-EC'),18,y);y+=11;
 for(const entry of lines){const wrapped=doc.splitTextToSize(clean(entry),174);if(y+wrapped.length*5+5>271){foot();doc.addPage();page++;head();y=25;}doc.setDrawColor(221,232,237);doc.line(18,y-2,192,y-2);doc.text(wrapped,18,y+3);y+=wrapped.length*5+5;}
 foot();doc.save(filename);
}
export function exportDirectoryPdf(patients:Patient[]){
 return exportLines('Directorio general de pacientes',patients.map(p=>`${p.name} | ${p.area} | ${p.age} años | ${p.status} | ${p.reason}`),'CLINOVA_Directorio_Pacientes.pdf');
}
export function exportFinancePdf(entries:FinanceEntry[],patients:Patient[]){
 const name=new Map(patients.map(p=>[p.id,p.name]));
 const money=(n:number)=>new Intl.NumberFormat('es-EC',{style:'currency',currency:'USD'}).format(n/100);
 const types={cargo:'Cargo',cobro:'Cobro',gasto:'Pago / gasto'};
 const lines=entries.map(e=>`${e.occurred_at} | ${types[e.kind]} | ${name.get(e.patient_id??'')??'Clínica'} | ${e.concept} | ${money(e.amount_cents)} | ${e.method}`);
 const billed=entries.filter(x=>x.kind==='cargo').reduce((n,x)=>n+x.amount_cents,0);
 const received=entries.filter(x=>x.kind==='cobro').reduce((n,x)=>n+x.amount_cents,0);
 lines.unshift(`Cargos: ${money(billed)} | Cobros: ${money(received)} | Saldo pendiente: ${money(billed-received)}`);
 return exportLines('Resumen de contabilidad',lines,'CLINOVA_Resumen_Contabilidad.pdf');
}
