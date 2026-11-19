import{validatePassword}from'./model';
export const ITERATIONS=600_000;
const hex=(b:Uint8Array)=>Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
async function derive(password:string,salt:string,iterations:number){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return hex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new Uint8Array(salt.match(/.{2}/g)!.map(x=>parseInt(x,16))),iterations},key,256)));}
export async function hashPassword(password:string){validatePassword(password);const salt=hex(crypto.getRandomValues(new Uint8Array(16)));return{salt,iterations:ITERATIONS,password_hash:await derive(password,salt,ITERATIONS)};}
export async function verifyPassword(password:string,c:{salt:string;iterations:number;password_hash:string}){const actual=await derive(password,c.salt,c.iterations);let difference=actual.length^c.password_hash.length;for(let i=0;i<actual.length;i++)difference|=actual.charCodeAt(i)^(c.password_hash.charCodeAt(i)||0);return difference===0;}
export async function dummyPassword(password:string){await derive(password,'00000000000000000000000000000000',ITERATIONS);}
