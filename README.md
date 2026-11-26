# CLINOVA

Sistema académico de gestión para la Clínica Sanpichito. Unidad Educativa Montepiedra, Diseño y Desarrollo Web, 3.º de Bachillerato, Grupo 3. La aplicación ofrece una Web publicada y una base Tauri para Windows y Linux.

**Web:** https://orange-seal-508462.hostingersite.com/  
**Repositorio:** https://github.com/chitoadrian/CLINOVA

## Equipo y perfiles del sistema

| Integrante | Responsabilidad del proyecto | Vista y funciones en la aplicación |
|---|---|---|
| Jeshua Sánchez Alcívar | Coordinación, integración y DevOps | Administrador: panel de ambas áreas, estados, actividad reciente, directorio, cuentas, sincronización e informe de coordinación PDF. |
| Wilson Pinela | Base de datos, migraciones y autenticación; ahora Contabilidad | Contable: consulta de pacientes de ambas áreas, cargos, cobros, pagos, saldos y movimientos. No ve fichas clínicas ni usuarios. |
| Adrian Chito Vargas | Frontend de Enfermería | Enfermero: panel y resumen PDF del área, sus pacientes, signos, triage, Kardex, camas, hospitalización e informe PDF. |
| Matias Muñiz | Frontend de Fisioterapia | Fisioterapeuta: panel y resumen PDF del área, sus pacientes, evaluación, goniometría, Daniels, planes, rutinas, evolución e informe/rutina PDF. |

Las contraseñas actuales se entregan por un canal privado. No están en texto plano en el repositorio. El login local usa PBKDF2 con sal individual, 600 000 iteraciones, bloqueo tras cinco intentos y sesión temporal. Las opciones visibles y las operaciones locales comprueban el rol.

## Arquitectura real

```
React + TypeScript
  ├─ Web: IndexedDB + Service Worker (después de la primera carga)
  ├─ Windows/Linux: Tauri + SQLite (migraciones versionadas)
  └─ Sync Engine clínico: Supabase Auth → Edge Function clinova-api
                              → PostgreSQL, esquema clinova
```

La aplicación guarda primero en el dispositivo. El motor clínico envía una cola de cambios al reconectar, usa UUID y `op_id` para evitar duplicados y conserva versiones y conflictos. El proyecto Supabase real es **CLINOVA**, ID `gcsodpalqwwpsiodeeil`, región `sa-east-1`; su esquema `clinova` contiene `roles`, `members`, `invitations`, `records`, `revisions` y `receipts`, con RLS. La API está en `/functions/v1/clinova-api`. La clave del cliente es publicable; la clave de servicio permanece en el servidor.

**Límite actual:** los movimientos de Contabilidad se almacenan en IndexedDB/SQLite y aún no se envían a Supabase. Wilson ve los pacientes locales de ambas áreas en su dispositivo; la recepción de pacientes desde otro equipo requiere una conexión clínica existente y no está habilitada para el nuevo rol Contable. La Web offline funciona tras cargarse por primera vez con conexión, usando el mismo navegador y origen. Los PDFs de área y rutina se generan desde datos locales y deben revisarse antes de compartir.

El perfil cloud existente de Wilson se cambió de Administrador a Contable en el proyecto CLINOVA. La migración está en `supabase/migrations/20261126_contable.sql`; no se modificaron otros proyectos Supabase.

## Funciones por área

- **Enfermería:** panel de pacientes y atenciones locales, resumen PDF del área, alta y consulta de pacientes propios, signos vitales, triage manual, Kardex, estado de cama, ingreso y alta hospitalaria; edición, baja lógica e informe PDF de paciente.
- **Fisioterapia:** panel de pacientes y atenciones locales, resumen PDF del área, pacientes propios, evaluación biomecánica, goniometría, escala Daniels, plan y rutina, evolución; edición, baja lógica, informe PDF del paciente y rutina PDF individual.
- **Contabilidad:** cargos a pacientes de ambas áreas, cobros, pagos de la clínica, saldos, filtros, corrección y baja lógica. Es un registro interno académico; no emite facturas tributarias.
- **Coordinación:** panel de pacientes por área y estado, actividad clínica reciente local, cuentas activas, directorio general, alta y mantenimiento de usuarios, estado de sincronización e informe PDF. La navegación clínica directa no se ofrece al coordinador.

## Ejecutar

Requiere Node.js 22.12+ y npm. En la carpeta del proyecto:

```sh
npm ci
npm run dev
```

Abrir http://127.0.0.1:1420/. Para generar Web:

```sh
npm run build
npm run preview -- --port 4174
```

Para escritorio se requiere Rust y las herramientas nativas de Tauri. En Windows se necesitan Microsoft C++ Build Tools y Windows SDK **para compilar**, aunque CLINOVA no está programada en C++: la interfaz usa React/TypeScript y la parte nativa de Tauri usa Rust. El código está en `src-tauri`; `npm run desktop:build` genera paquetes según el sistema operativo. Un instalador contiene solo el código del commit con que fue compilado; los binarios anteriores no incluyen automáticamente cambios posteriores.

## Comprobaciones y documentos

```sh
npm test
python tests/test_sqlite.py
npm run build
```

Las pruebas locales cubren migraciones, roles, CRUD, cola y conflictos simulados. No sustituyen una demostración con dos equipos conectados al Supabase real. La documentación revisada de Semanas 1–4, manuales de usuario y técnico, diagramas y guion de las cuatro cuentas se encuentran en `docs/revision`. Las entregas anteriores se conservan como archivo histórico; para exponer se usa la revisión actual.
