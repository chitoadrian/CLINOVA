export type Role='Administrador'|'Enfermero'|'Fisioterapeuta'|'Contable';
export type Area='Enfermería'|'Fisioterapia';
export type Stamp={id:string;created_at:string;updated_at:string;deleted_at:string|null;version:number};
export type User=Stamp&{username:string;name:string;role_id:string;role:Role;active:boolean};
export type Patient=Stamp&{name:string;age:number;area:Area;reason:string;status:string;legacy_id?:string};
export type Credential={user_id:string;password_hash:string;salt:string;iterations:number;failed_attempts:number;locked_until:number};
export type RecordEntry=Partial<Stamp>&{id:string;patientId:string;kind:Area;createdAt:string;author:string;values:Record<string,string>};
export type PatientInput=Pick<Patient,'name'|'age'|'area'|'reason'|'status'>&{id?:string;version?:number};
export type UserInput={id?:string;version?:number;username:string;name:string;role:Role;active:boolean;password?:string};
export type FinanceKind='cargo'|'cobro'|'gasto';
export type FinanceEntry=Stamp&{kind:FinanceKind;patient_id:string|null;concept:string;amount_cents:number;method:string;occurred_at:string;reference:string;author_id:string;author_name:string};
export type FinanceInput=Pick<FinanceEntry,'kind'|'patient_id'|'concept'|'amount_cents'|'method'|'occurred_at'|'reference'>&{id?:string;version?:number};
export const ROLES=[{id:'00000000-0000-4000-8000-000000000001',name:'Administrador' as Role},{id:'00000000-0000-4000-8000-000000000002',name:'Enfermero' as Role},{id:'00000000-0000-4000-8000-000000000003',name:'Fisioterapeuta' as Role},{id:'00000000-0000-4000-8000-000000000004',name:'Contable' as Role}];
export function stamp():Stamp{const now=new Date().toISOString();return{id:crypto.randomUUID(),created_at:now,updated_at:now,deleted_at:null,version:1};}
export function canArea(role:Role,area:Area){return role==='Administrador'||(role==='Enfermero'&&area==='Enfermería')||(role==='Fisioterapeuta'&&area==='Fisioterapia');}
export function canReadPatient(role:Role,area:Area){return role==='Contable'||canArea(role,area);}
export function validateFinance(v:FinanceInput){if(!['cargo','cobro','gasto'].includes(v.kind)||!v.concept?.trim()||v.concept.length>180||!Number.isSafeInteger(v.amount_cents)||v.amount_cents<1||v.amount_cents>100000000||!['Efectivo','Transferencia','Tarjeta','Otro'].includes(v.method)||!/^\d{4}-\d{2}-\d{2}$/.test(v.occurred_at)||Number.isNaN(Date.parse(v.occurred_at))||typeof v.reference!=='string'||v.reference.length>100||((v.kind==='gasto')!==(!v.patient_id)))fail('Revisa tipo, paciente, concepto, monto, forma de pago y fecha.');}
export function fail(message:string):never{throw new Error(message);}
export function validatePassword(p:string){if(typeof p!=='string'||p.length<10||p.length>128||!p.trim())fail('La contraseña debe tener entre 10 y 128 caracteres.');}
export function validatePatient(p:PatientInput){if(!p.name?.trim()||p.name.trim().length<2||p.name.length>100||!Number.isInteger(p.age)||p.age<0||p.age>130||!['Enfermería','Fisioterapia'].includes(p.area)||!['En espera','En atención','Alta'].includes(p.status)||!p.reason?.trim()||p.reason.length>300)fail('Revisa nombre, edad (0-130), área, estado y motivo.');}
export function validateUser(u:UserInput){if(!/^[a-z0-9._-]{3,32}$/.test(u.username)||!u.name?.trim()||u.name.trim().length<2||u.name.length>80||!ROLES.some(r=>r.name===u.role)||typeof u.active!=='boolean')fail('Usuario inválido: identificador de 3-32 caracteres, nombre y rol obligatorios.');if(u.password)validatePassword(u.password);}
export function validateRecord(kind:Area,v:Record<string,string>){
 const range=(k:string,min:number,max:number,int=false)=>{const n=Number(v[k]);if(v[k]===undefined||v[k].trim()===''||!Number.isFinite(n)||n<min||n>max||(int&&!Number.isInteger(n)))fail('Valor inválido: '+k);};
 if(kind==='Enfermería'){range('temperatura',25,45);range('pulso',20,250,true);range('sistolica',40,300,true);range('diastolica',20,200,true);range('saturacion',1,100,true);if(Number(v.sistolica)<=Number(v.diastolica)||!['Rojo','Naranja','Amarillo','Verde','Azul'].includes(v.triage))fail('Presión o triage inválidos.');}
 else if(kind==='Fisioterapia'){range('grados',0,360);range('daniels',0,5,true);range('dolor',0,10,true);if(!['Hombro','Codo','Muñeca','Cadera','Rodilla','Tobillo'].includes(v.region)||!['Derecha','Izquierda','Bilateral'].includes(v.lado)||!v.movimiento?.trim()||v.movimiento.length>80||!v.plan?.trim())fail('Completa evaluación y plan.');}else fail('Área inválida.');
 if(Object.values(v).some(s=>typeof s!=='string'||s.length>1000))fail('Texto demasiado largo.');
}
