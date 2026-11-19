# Pruebas de Semana 4

Ejecutar desde `proyecto/`, sin usar datos reales:

```sh
npm ci
npm test
python tests/test_sqlite.py
npm run build
```

`qa.test.ts` usa el servicio real con `fake-indexeddb`: 500 fichas, escrituras concurrentes, fallo de cuota, transacciones, lotes y ACK repetidos. Los tiempos son de Node, no del navegador ni del servidor.

`browser-qa.mjs` ejecuta Edge en modo headless, en un contexto nuevo. Las cuatro cuentas reciben hashes ficticios solo en ese contexto. Intercepta toda petición a Supabase con una API de ensayo. No lee contraseñas privadas ni modifica las cuentas del proyecto. Prueba 250 fichas con IndexedDB real y comprueba recepción en otro contexto independiente.

Para repetirlo se necesita Microsoft Edge y el paquete `playwright` disponible para Node. Puede instalarse en una carpeta de herramientas separada con `npm install playwright`; define `PLAYWRIGHT_MODULE` con su ruta absoluta si no está en el proyecto. Inicia:

```sh
npm run dev -- --port 1424
```

En otra terminal:

```sh
node tests/browser-qa.mjs
```

La URL se puede cambiar con `CLINOVA_QA_URL`, pero solo se admiten localhost o 127.0.0.1. Resultados y capturas se escriben en `../evidencias/`. El servidor simulado no sirve para medir rendimiento ni seguridad de PostgreSQL real. Para una revisión entre grupos, completar la ficha incluida en la entrega; no equivale a la batería automática.
