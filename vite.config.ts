import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react(), {
  name: 'clinova-offline-shell',
  generateBundle(_options, bundle) {
    const assets = ['./', './index.html', './clinova-logo.png', './clinova-logo-transparent.png', ...Object.keys(bundle).map(key => `./${key}`)];
    const cache = `clinova-shell-${Date.now()}`;
    this.emitFile({ type: 'asset', fileName: 'sw.js', source: `
const CACHE = ${JSON.stringify(cache)};
const FILES = ${JSON.stringify(assets)};
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('clinova-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') event.respondWith(fetch(event.request).catch(() => caches.match(new URL('./index.html', self.location.href).href, {ignoreVary: true})));
  else event.respondWith(caches.match(event.request, {ignoreVary: true}).then(cached => cached || fetch(event.request)));
});` });
  }
}], base: './', clearScreen: false,
  server: { port: 1420, strictPort: true }, build: { target: 'es2022' } });
