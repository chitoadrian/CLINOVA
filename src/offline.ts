import { useSyncExternalStore } from 'react';
let state='Preparando acceso sin red…';
const listeners=new Set<()=>void>();
function set(value:string){state=value;for(const listener of listeners)listener();}
export function useOfflineStatus(){return useSyncExternalStore(listener=>{listeners.add(listener);return()=>{listeners.delete(listener);};},()=>state);}
export function prepareOffline(){
 if('__TAURI_INTERNALS__' in window){set('Recursos locales disponibles');return;}
 if(!import.meta.env.PROD){set('Modo desarrollo local');return;}
 if(!('serviceWorker' in navigator)){set('Este navegador no admite caché offline');return;}
 // Registrar directamente evita perder el evento load en navegadores embebidos.
 navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>set('Caché local preparada')).catch(()=>set('No se pudo preparar la caché offline'));
}
