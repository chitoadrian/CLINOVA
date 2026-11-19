import {useSyncExternalStore} from 'react';
import {Moon,Sun} from 'lucide-react';
type Theme='light'|'dark';
const media=window.matchMedia('(prefers-color-scheme: dark)');
const listeners=new Set<()=>void>();
function saved(){try{return localStorage.getItem('clinova-theme');}catch{return null;}}
let theme:Theme=saved()==='dark'?'dark':saved()==='light'?'light':media.matches?'dark':'light';
function apply(){document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;listeners.forEach(f=>f());}
apply();
media.addEventListener('change',()=>{if(!saved()){theme=media.matches?'dark':'light';apply();}});
window.addEventListener('storage',e=>{if(e.key==='clinova-theme'){theme=e.newValue==='dark'?'dark':e.newValue==='light'?'light':media.matches?'dark':'light';apply();}});
export default function ThemeToggle(){
 const value=useSyncExternalStore(f=>{listeners.add(f);return()=>{listeners.delete(f);};},()=>theme);
 const dark=value==='dark';
 return <button type="button" className="theme-toggle" aria-label={dark?'Activar modo claro':'Activar modo oscuro'} title={dark?'Activar modo claro':'Activar modo oscuro'} onClick={()=>{theme=dark?'light':'dark';try{localStorage.setItem('clinova-theme',theme);}catch{/* La preferencia sigue activa durante esta sesión. */}apply();}}>{dark?<Sun size={18}/>:<Moon size={18}/>}<span>{dark?'Modo claro':'Modo oscuro'}</span></button>;
}
