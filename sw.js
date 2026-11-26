
const CACHE = "clinova-shell-1795723683976";
const FILES = ["./","./index.html","./clinova-logo.png","./clinova-logo-transparent.png","./assets/index-YJu8lEnS.css","./assets/index-CA73GCPU.js","./assets/core-BUhCcD2K.js","./assets/web-1FEKhtOt.js","./assets/jspdf.es.min-CaP2aKGw.js","./assets/html2canvas.esm-DXEQVQnt.js","./assets/purify.es-DxdA0B9h.js","./assets/index.es-qAQqUl9c.js"];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('clinova-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') event.respondWith(fetch(event.request).catch(() => caches.match(new URL('./index.html', self.location.href).href, {ignoreVary: true})));
  else event.respondWith(caches.match(event.request, {ignoreVary: true}).then(cached => cached || fetch(event.request)));
});