import {canArea, fail, validatePatient, validateRecord, type Area, type Role, type Stamp} from './model.ts';
export type ItemKind='kardex'|'bed'|'admission'|'routine'|'evolution';
export type DocKind=ItemKind|'patient'|'encounter';
export type ClinicalItem=Stamp&{kind:ItemKind;area:Area;patient_id:string|null;reference_id:string|null;values:Record<string,string>;author:string};
export type SyncDoc={id:string;kind:DocKind;area:Area;patient_id:string|null;reference_id:string|null;payload:any};
export type RemoteDoc=SyncDoc&{revision:number;sequence:number};
export type Pending={id:string;op_id:string;doc:SyncDoc;base_revision:number;blocked?:boolean;created_at:string};
export type Conflict={id:string;local:SyncDoc;remote:RemoteDoc;reason:string;created_at:string};
export const itemArea=(kind:ItemKind):Area=>['kardex','bed','admission'].includes(kind)?'Enfermería':'Fisioterapia';
export const uuid=(s:unknown)=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
export function validateItem(item:ClinicalItem){
 if(!['kardex','bed','admission','routine','evolution'].includes(item.kind)||item.area!==itemArea(item.kind))fail('Tipo o área inválida.');
 const v=item.values;
 const text=(key:string,max=1000)=>{if(typeof v[key]!=='string'||!v[key].trim()||v[key].length>max)fail('Completa el campo '+key);};
 const num=(key:string,min:number,max:number,int=false)=>{text(key,20);const n=Number(v[key]);if(!Number.isFinite(n)||n<min||n>max||(int&&!Number.isInteger(n)))fail('Valor inválido: '+key);};
 const date=(key:string)=>{text(key,32);if(!Number.isFinite(Date.parse(v[key])))fail('Fecha inválida: '+key);};
 if(!v||typeof v!=='object'||Object.values(v).some(x=>typeof x!=='string'||x.length>3000))fail('Contenido inválido.');
 if(item.kind!=='bed'&&!uuid(item.patient_id))fail('Selecciona un paciente.');
 if(['admission','evolution'].includes(item.kind)&&!uuid(item.reference_id))fail('Selecciona la cama o el plan relacionado.');
 if(item.kind==='bed'){text('code',24);text('ward',80);if(!['Disponible','Mantenimiento'].includes(v.state))fail('Estado de cama inválido.');}
 if(item.kind==='kardex'){for(const k of ['medication','dose','route','frequency'])text(k,160);date('scheduled_at');if(!['Pendiente','Administrado','Omitido'].includes(v.state))fail('Estado de medicamento inválido.');if(v.state==='Administrado')date('administered_at');}
 if(item.kind==='admission'){date('admitted_at');text('reason',500);if(v.discharged_at){date('discharged_at');if(Date.parse(v.discharged_at)<Date.parse(v.admitted_at))fail('El alta no puede preceder al ingreso.');}}
 if(item.kind==='routine'){text('objective');text('exercises',3000);text('frequency',100);date('start_date');date('end_date');if(v.end_date<v.start_date)fail('Revisa las fechas del plan.');if(!['Activo','Completado','Suspendido'].includes(v.state))fail('Estado del plan inválido.');}
 if(item.kind==='evolution'){date('session_date');num('pain',0,10,true);num('degrees',0,360);num('daniels',0,5,true);text('progress',2000);}
}
export function validateDocument(doc:SyncDoc,role:Role){
 if(!uuid(doc.id)||!canArea(role,doc.area)||!['Enfermería','Fisioterapia'].includes(doc.area))fail('Documento o permiso inválido.');
 const p=doc.payload;
 if(!p||p.id!==doc.id||!Number.isInteger(p.version)||p.version<1||typeof p.created_at!=='string'||typeof p.updated_at!=='string'||!Number.isFinite(Date.parse(p.created_at))||!Number.isFinite(Date.parse(p.updated_at))||(p.deleted_at!==null&&!Number.isFinite(Date.parse(p.deleted_at))))fail('Metadatos inválidos.');
 if(doc.kind==='patient'){validatePatient(p);if(doc.area!==p.area||doc.patient_id!==null||doc.reference_id!==null)fail('Ficha inválida.');}
 else if(doc.kind==='encounter'){validateRecord(doc.area,p.values);if(!uuid(doc.patient_id)||p.patientId!==doc.patient_id||p.kind!==doc.area||doc.reference_id!==null)fail('Atención inválida.');}
 else {validateItem(p);if(doc.kind!==p.kind||doc.area!==p.area||doc.patient_id!==p.patient_id||doc.reference_id!==p.reference_id)fail('Relación inválida.');}
}
export function documentOf(kind:DocKind,p:any):SyncDoc{return{id:p.id,kind,area:kind==='encounter'?p.kind:p.area,patient_id:kind==='patient'||kind==='bed'?null:(p.patientId??p.patient_id),reference_id:p.reference_id??null,payload:p};}
