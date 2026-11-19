# CLINOVA · Semana 4

Calidad, documentación y preparación de compilaciones · versión 0.4.0.

Unidad Educativa Montepiedra · Diseño y Desarrollo Web · 3.º de Bachillerato · Grupo 3.

Continúa el código integrado de Semana 3. Conserva autenticación, pacientes, módulos y sincronización. Las entregas anteriores no se sobrescribieron. El hosting conserva la versión anterior; esta entrega se ejecuta localmente.

| Integrante | Responsabilidad |
|---|---|
| Jeshua Sánchez Alcívar | Coordinación, integración y compilaciones |
| Wilson Pinela | Base de datos, autenticación y sincronización |
| Adrian Chito Vargas | Enfermería |
| Matias Muñiz | Fisioterapia |

## Ejecutar la Web

Node.js 22.12 o posterior y npm. Dentro de proyecto:

```sh
npm ci
npm run dev
```

Abrir http://127.0.0.1:1420/. En PowerShell se puede usar npm.cmd.

```sh
npm run build
npm run preview -- --port 4174
```

Abrir http://127.0.0.1:4174/. La caché offline se instala en producción tras una primera carga con conexión. No abrir el index.html de la aplicación con doble clic. Para conservar datos locales, mantener el mismo origen, navegador y perfil.

Sitio de presentación existente: https://orange-seal-508462.hostingersite.com/.

## Cuentas y funcionamiento

jeshua y wilson son administradores; adrian, enfermero; matias, fisioterapeuta. Las contraseñas vigentes se entregan por un canal privado. El código contiene hashes PBKDF2 con sal individual, no contraseñas del grupo en texto plano. No ejecutar manualmente migraciones históricas sobre una base ya migrada.

Enfermería: fichas, signos, triage manual, kardex, camas, ingreso y alta. Fisioterapia: evaluación, goniometría, Daniels, planes, rutinas y evolución. Los registros admiten edición y baja lógica, con validación de rangos y relaciones. El administrador gestiona cuentas locales.

Web utiliza IndexedDB; las fuentes Tauri/Rust utilizan SQLite. El cambio y su pendiente se confirman en una transacción. Supabase Auth y la API verifican identidad y rol. UUID, op_id, revisiones y cursor gestionan intercambio y conflictos. Los datos se comparten según el área; los usuarios locales no se convierten automáticamente en cuentas cloud.

## Pruebas de Semana 4

```sh
npm test
python tests/test_sqlite.py
npm run build
```

- 12 pruebas/subpruebas Node aprobadas: incluye 500 altas en ráfagas de 20, concurrencia, fallo de cuota, rollback, lotes y ACK repetidos.
- SQLite: seis migraciones idempotentes, cuatro cuentas, FK/UNIQUE/CHECK y restricciones de ocupación.
- Edge aislado: cuatro roles, 250 fichas offline en IndexedDB real, reingreso, HTTP 503, recuperación y recepción en otro contexto. La API se intercepta: no se genera carga en Supabase real.
- Se corrigió la prueba SQL antigua que esperaba tres migraciones; ahora verifica seis y las cuatro cuentas.

Procedimiento del navegador: [tests/README_QA.md](tests/README_QA.md). Las evidencias detalladas están en el ZIP de entrega. La revisión por otro grupo está pendiente; no equivale a las pruebas automáticas.

## Manuales y diagramas

- [Secuencias para imprimir](docs/semana4/01_Secuencias_CLINOVA.pdf)
- [Manual de usuario PDF](docs/semana4/02_Manual_Usuario_Borrador.pdf)
- [Manual técnico PDF](docs/semana4/03_Manual_Tecnico_Borrador.pdf)
- [Informe QA y ficha cruzada](docs/semana4/04_Pruebas_QA_y_Revision_Cruzada.pdf)
- [Manuales Web](public/manuales/index.html): abrir ese archivo directamente o visitar /manuales/ en el servidor.

Son borradores de Semana 4. Imprimir las tres páginas de secuencias; se recomienda A3 horizontal.

## Windows y Linux

Los instaladores se generan en GitHub Actions y se incorporan al ZIP de entrega después de comprobar cada trabajo.

[Requisitos oficiales Tauri](https://v2.tauri.app/start/prerequisites/).

Windows: Rust MSVC, Microsoft C++ Build Tools, Windows SDK y WebView2; ejecutar scripts/build-windows.ps1.

Linux: Rust, Node y dependencias WebKitGTK del manual técnico; ejecutar bash scripts/build-linux.sh.

.github/workflows/escritorio.yml ejecuta los trabajos nativos de Windows y Linux en cada envío a main.

## Seguridad y límites

La base local no está cifrada en reposo. Controlar el dispositivo permite manipularla. La revocación local y cloud es independiente. No existe exportación de respaldo desde la interfaz. Usar datos ficticios y excluir credenciales privadas del repositorio.

No se modificaron otros proyectos ni se enviaron datos de carga al servidor real. Las pruebas no certifican todos los dispositivos ni capacidad de PostgreSQL.

Código bajo [MIT](LICENSE). El logo es material aportado por el usuario.
