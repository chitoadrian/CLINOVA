"""Documentos de revisión CLINOVA, basados en el código y la guía del profesor."""
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.pagesizes import A3, landscape
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

HERE=Path(__file__).resolve().parent
pdfmetrics.registerFont(TTFont('Arial',r'C:\Windows\Fonts\arial.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Bold',r'C:\Windows\Fonts\arialbd.ttf'))
NAVY=colors.HexColor('#0b344b')
TEAL=colors.HexColor('#087d91')
PALE=colors.HexColor('#e9f5f7')
MUTED=colors.HexColor('#425b69')
S=getSampleStyleSheet()
S.add(ParagraphStyle(name='CoverX',fontName='Arial-Bold',fontSize=23,leading=28,textColor=NAVY,spaceAfter=16))
S.add(ParagraphStyle(name='SubX',fontName='Arial',fontSize=11,leading=16,textColor=MUTED,spaceAfter=10))
S.add(ParagraphStyle(name='H1X',fontName='Arial-Bold',fontSize=14,leading=18,textColor=NAVY,spaceBefore=17,spaceAfter=7))
S.add(ParagraphStyle(name='H2X',fontName='Arial-Bold',fontSize=10.5,leading=14,textColor=TEAL,spaceBefore=11,spaceAfter=5))
S.add(ParagraphStyle(name='BodyX',fontName='Arial',fontSize=9.4,leading=14.2,textColor=NAVY,spaceAfter=7))
S.add(ParagraphStyle(name='BulletX',fontName='Arial',fontSize=9.2,leading=13.7,textColor=NAVY,leftIndent=12,firstLineIndent=-8,spaceAfter=4))
S.add(ParagraphStyle(name='SmallX',fontName='Arial',fontSize=8,leading=11,textColor=MUTED,spaceAfter=4))
S.add(ParagraphStyle(name='CellX',fontName='Arial',fontSize=8.3,leading=11.5,textColor=NAVY))
S.add(ParagraphStyle(name='CellHX',fontName='Arial-Bold',fontSize=8.3,leading=11.5,textColor=colors.white))

def p(t,style='BodyX'):
 return Paragraph(escape(t).replace('\n','<br/>'),S[style])
def table(headers,rows,widths=None):
 data=[[p(c,'CellHX') for c in headers]]+[[p(str(c),'CellX') for c in row] for row in rows]
 t=Table(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
 t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),NAVY),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,PALE]),('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#c5d9e0')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
 return t
def footer(canvas,doc):
 canvas.saveState();w,h=A4
 canvas.setFillColor(NAVY);canvas.rect(0,h-12,w,12,fill=1,stroke=0)
 canvas.setStrokeColor(colors.HexColor('#c5d9e0'));canvas.line(42,38,w-42,38)
 canvas.setFont('Arial',7.5);canvas.setFillColor(MUTED)
 canvas.drawString(42,26,'CLINOVA · Unidad Educativa Montepiedra · Revisión 26/11/2026')
 canvas.drawRightString(w-42,26,str(doc.page));canvas.restoreState()
def build(name,title,subtitle,blocks):
 flow=[p(title,'CoverX'),p(subtitle,'SubX'),Spacer(1,8)]
 for kind,data in blocks:
  if kind=='h':flow.append(p(data,'H1X'))
  elif kind=='s':flow.append(p(data,'H2X'))
  elif kind=='t':flow.append(p(data))
  elif kind=='b':flow.append(p('• '+data,'BulletX'))
  elif kind=='sm':flow.append(p(data,'SmallX'))
  elif kind=='table':flow.append(table(*data))
  elif kind=='page':flow.append(PageBreak())
 out=HERE/name
 SimpleDocTemplate(str(out),pagesize=A4,rightMargin=42,leftMargin=42,topMargin=35,bottomMargin=49,title=title,author='Equipo CLINOVA · Grupo 3').build(flow,onFirstPage=footer,onLaterPages=footer)
 return out

common='Proyecto CLINOVA para la Clínica Sanpichito · Diseño y Desarrollo Web · 3.º Bachillerato, Grupo 3.'
week1=[
 ('h','Qué se pidió y qué construimos'),('t','La guía exige un Gantt con responsables, casos de uso impresos, base Web/Windows/Linux y repositorio público. Nuestra solución se llama CLINOVA y separa Enfermería, Fisioterapia, Coordinación y, por decisión posterior del equipo, Contabilidad. La ampliación contable no formaba parte de la rúbrica inicial y se identifica como cambio posterior.'),
 ('table',(['Entregable','Ubicación y explicación'],[
  ['Gantt y roles','02_Gantt_y_Roles.pdf: 5 semanas, responsables y entregables. Las fechas de la guía se comparan con las fechas efectivas del equipo.'],
  ['Casos de uso UML','CASOS_DE_USO_ACTUALIZADOS.pdf: cuatro cuentas y sus permisos actuales. El rol Contable se incorporó después de la rúbrica inicial.'],
  ['Bocetos','04_Bocetos_Pantallas.pdf: inicio de sesión, vista general y dos áreas. La interfaz actual evolucionó desde esos bocetos.'],
  ['Código y GitHub','React + TypeScript, Tauri y repositorio público github.com/chitoadrian/CLINOVA.']], [130,381])),
 ('h','Arquitectura que sí usa el programa'),('t','El navegador ejecuta React y guarda sus datos en IndexedDB. El escritorio usa la misma interfaz en Tauri con SQLite. El servidor no sustituye el almacenamiento local: Supabase Auth identifica usuarios de sincronización; una Edge Function recibe los cambios clínicos; PostgreSQL guarda documentos, revisiones y confirmaciones. Las cuentas locales y las cuentas cloud son capas separadas.'),
 ('s','Pantallas iniciales y evolución visual'),('t','La pantalla de acceso solicita usuario y contraseña; después aparece la navegación correspondiente al rol. El logo CLINOVA es el proporcionado por el equipo. La versión actual añade tema claro/oscuro, tarjetas de estado, formularios guiados y exportación PDF. Estos cambios posteriores no deben atribuirse a Semana 1.'),
 ('h','Qué mostrar al profesor'),('b','Abrir el Gantt y explicar la distribución del trabajo: Jeshua integración; Wilson datos y autenticación; Adrian Enfermería; Matias Fisioterapia.'),('b','Entregar impreso el UML de casos de uso y recorrer sus actores. Aclarar que Contabilidad fue una ampliación posterior.'),('b','En la Web, mostrar acceso y cuatro menús distintos. Señalar que el repositorio público contiene el código y README.'),('sm','La guía indica revisiones los jueves a las 12:30, diez minutos por grupo. El archivo impreso requerido para Semana 1 es el diagrama de casos de uso; el Gantt se lleva como apoyo.')
]
week2=[
 ('h','Modelo de datos local y diagrama DER'),('t','El DER impreso de Semana 2 representa usuarios, roles, credenciales, pacientes y entidades clínicas. Un usuario tiene un rol; un paciente pertenece a Enfermería o Fisioterapia; una atención relaciona paciente y autor con signos/triage o evaluación/plan. Las claves primarias son UUID; las foráneas impiden referencias inexistentes. Las bajas conservan historial mediante deleted_at y version.'),
 ('table',(['Capa','Tecnología','Contenido real'],[
  ['Web','IndexedDB','Stores roles, users, credentials, patients_v2, encounters, vital_signs, triage, evaluations, rehabilitation_plans y otros de Semana 3. La versión actual del esquema Web es 4.'],
  ['Windows/Linux','SQLite','Migraciones numeradas 001–007. Tablas relacionales, PK/FK, CHECK, UNIQUE e índices. La migración 007 incorpora Contabilidad posteriormente.'],
  ['Nube','Supabase/PostgreSQL','Proyecto CLINOVA, ID gcsodpalqwwpsiodeeil, región sa-east-1. El esquema clinova contiene roles, members, invitations, records, revisions y receipts. RLS está activado.']], [93,91,327])),
 ('h','Autenticación y permisos'),('t','Cada una de las cuatro cuentas posee un hash PBKDF2-SHA256 con sal individual y 600 000 iteraciones. No se almacena la contraseña en claro. El sistema bloquea temporalmente tras cinco fallos y usa sesiones con vencimiento. Jeshua gestiona usuarios; Adrian accede a Enfermería; Matias a Fisioterapia; Wilson ahora es Contable y no administra usuarios. Este último cambio es posterior a la entrega original de Semana 2.'),
 ('s','Cómo se conserva una edición'),('t','Un registro tiene UUID, fecha de creación, fecha de actualización, versión y marca opcional de baja. La interfaz envía la versión conocida; si otro proceso ya la modificó, se rechaza la edición obsoleta. Las escrituras locales y su cola de sincronización clínica se realizan dentro de una transacción.'),
 ('h','Demostración de Semana 2'),('b','Abrir el DER impreso y explicar relación rol → usuario y paciente → atención → datos clínicos.'),('b','Iniciar sesión local sin internet después de una primera carga Web; crear y volver a consultar un paciente. En escritorio, el dato queda en SQLite; en Web, en IndexedDB.'),('b','Entrar como Adrian y Matias para mostrar que cada uno ve solo pacientes de su área. Entrar como Wilson para mostrar que no tiene administración de cuentas.'),('b','Explicar que Supabase existe como capa cloud de sincronización clínica, pero la rúbrica de Semana 2 se centra en persistencia y autenticación local.'),('sm','Para la revisión de Semana 2, la guía pide DER impreso. Llevar el Gantt actualizado como apoyo. No imprimir contraseñas en documentos públicos.')
]
week3=[
 ('h','Dos áreas clínicas y un motor de sincronización'),('t','Enfermería registra pacientes del área, signos vitales, triage, Kardex, camas y hospitalización. Fisioterapia guarda evaluación biomecánica, goniometría, escala Daniels, planes, rutinas y evolución. Cada ficha permite crear, consultar, editar y dar de baja con validaciones. La Web trabaja primero sobre IndexedDB y el escritorio sobre SQLite.'),
 ('table',(['Paso del Sync Engine','Qué sucede realmente'],[
  ['1. Guardar','Una operación clínica actualiza el dato local y su entrada de cola en la misma transacción.'],
  ['2. Detectar red','Al reconectar, el cliente intenta iniciar sesión en Supabase Auth y consulta los pendientes.'],
  ['3. Enviar','La Edge Function clinova-api recibe lotes de hasta 50 con token, op_id, revisión base y documento.'],
  ['4. Servidor','PostgreSQL registra documentos en clinova.records, revisiones en clinova.revisions y confirmaciones idempotentes en clinova.receipts.'],
  ['5. Recibir','La API devuelve confirmaciones, cambios nuevos y cursor; el cliente aplica cambios o guarda un conflicto para resolver.']], [130,381])),
 ('h','Datos reales de Supabase'),('t','URL de proyecto: https://gcsodpalqwwpsiodeeil.supabase.co. La API de sincronización está en /functions/v1/clinova-api. El esquema clinova tiene RLS habilitado. Las tablas visibles verificadas son roles, members, invitations, records, revisions y receipts. No se exponen claves de servicio en la Web; el cliente usa una clave publicable y la función verifica el token y el rol. No atribuir a Supabase las tablas locales SQLite: el servidor usa un modelo documental de intercambio.'),
 ('h','Qué demostrar'),('b','Entregar impreso el DFD del Sync Engine. Señalar dispositivo, cola, Edge Function y PostgreSQL.'),('b','Adrian crea un dato de Enfermería; Matias crea una rutina y una evolución de Fisioterapia. Cada uno revisa su historial y exporta su informe PDF.'),('b','Desconectar internet, registrar un cambio, revisar estado pendiente; reconectar, esperar confirmación y consultar desde otro equipo autorizado. Si no hay sesión cloud, decir que queda pendiente localmente.'),('b','El rol Contable es ampliación posterior: sus movimientos locales aún no viajan a Supabase. No presentarlos como sincronizados.'),('sm','La guía pide el DFD impreso y una demostración en vivo offline-online. Las pruebas automáticas con servidor simulado no sustituyen la demostración real.')
]
week4=[
 ('h','Rúbrica de QA y manuales'),('t','La Semana 4 exige diagramas de secuencia impresos, pruebas de calidad y entre equipos, borradores de manual técnico y de usuario, y ejecutables Windows/Linux. La versión actual incorpora ajustes visuales, exportación PDF de cada área y rutina, y un rol Contable añadido después de la planificación original. Esta revisión distingue esos cambios posteriores.'),
 ('table',(['Comprobación','Evidencia y alcance'],[
  ['Pruebas de código','npm test: 13 pruebas/subpruebas locales, incluida separación de cuatro roles y validación de saldos. El ensayo de 500 fichas usa IndexedDB simulado, no carga real de Supabase.'],
  ['SQL local','python tests/test_sqlite.py: 7 migraciones, restricciones, CRUD, baja lógica y relaciones. No equivale a instalar el ejecutable Tauri.'],
  ['Web','npm run build compila TypeScript y Vite. El sitio publicado debe verificarse después de cada actualización.'],
  ['Instaladores','El repositorio contiene flujo Tauri/CI para Windows y Linux. Los binarios de entregas anteriores no incluyen automáticamente la revisión contable. Confirmar fecha de compilación antes de presentarlos.']], [110,401])),
 ('h','Manual de usuario real'),('b','Jeshua: entrar, revisar Coordinación y pacientes; en Usuarios crear/cambiar roles; exportar directorio PDF; en Sincronización ver pendiente, completado o conflicto.'),('b','Wilson: abrir Contabilidad; crear cargo, registrar cobro sin exceder saldo, registrar pago/gasto, buscar, corregir y exportar movimientos; en Pacientes consultar ambas áreas sin ficha clínica.'),('b','Adrian: abrir Enfermería, seleccionar paciente, usar pestañas de signos/triage, Kardex, camas e ingresos; exportar informe PDF.'),('b','Matias: abrir Fisioterapia, guardar evaluación y rutina, registrar evolución; exportar informe o rutina PDF.'),('h','Manual técnico real'),('t','React y TypeScript renderizan la interfaz; IndexedDB versión 4 y SQLite migración 007 guardan datos locales. Supabase Auth + Edge Function + PostgreSQL esquema clinova realizan la sincronización clínica. La cola usa op_id, UUID, revisión y cursor. La contabilidad local no usa todavía la API cloud; tampoco crea facturas fiscales. La aplicación Web requiere carga inicial con red antes de ensayar sin conexión.'),
 ('h','Qué llevar'),('b','Imprimir los diagramas de secuencia de Semana 4 y llevar los manuales en PDF/Web.'),('b','Mostrar pruebas y compilación, aclarando cuáles usan simulación. Presentar instaladores solo si los archivos concretos fueron compilados y verificados.'),('sm','La revisión cruzada por otro grupo debe realizarse realmente; no se considera completada por pruebas internas.')
]
roles=[
 ('h','Antes de comenzar'),('t','Abrir https://orange-seal-508462.hostingersite.com/ en un navegador con internet y cargar la aplicación una vez. Usar las contraseñas vigentes entregadas por separado; no proyectarlas ni imprimirlas. Trabajar con datos ficticios de demostración.'),
 ('table',(['Cuenta','Rol actual','Menú principal'],[
  ['jeshua','Administrador','Coordinación, Pacientes, Usuarios, Sincronización'],
  ['wilson','Contable','Contabilidad, Pacientes'],
  ['adrian','Enfermero','Mi área, Enfermería, Sincronización'],
  ['matias','Fisioterapeuta','Mi área, Fisioterapia, Sincronización']], [65,95,351])),
 ('h','Jeshua · Coordinación e integración'),('b','Entrar y mostrar el resumen: pacientes, atención y estado del espacio de trabajo.'),('b','En Pacientes, explicar alta, edición, estado y baja de una ficha de ambas áreas. En Usuarios, explicar cuenta personal, rol y bloqueo de acceso. Pulsar Exportar directorio PDF.'),('b','En Sincronización, enseñar pendientes, última confirmación y conflictos. Aclarar que la Web usa IndexedDB, escritorio usa SQLite y el servidor real es Supabase/PostgreSQL.'),('t','Frase natural: “Yo coordino el sistema. Desde aquí organizo las fichas y los accesos, y puedo comprobar si los cambios clínicos llegaron al servidor. Las atenciones las hacen Adrian y Matias en sus propias cuentas.”'),
 ('page',''),('h','Wilson · Contabilidad'),('b','Entrar a Contabilidad. Mostrar tarjetas: cargos, cobros, saldo pendiente y pagos de la clínica.'),('b','Crear un cargo para un paciente de Enfermería o Fisioterapia; registrar un cobro parcial y enseñar cómo disminuye el saldo. Intentar un cobro mayor que el saldo y explicar la validación.'),('b','Registrar un pago/gasto interno. Buscar, filtrar, editar, dar de baja un movimiento y exportar resumen PDF. En Pacientes, mostrar únicamente nombre, área, estado y saldo; no hay signos ni rutinas.'),('t','Frase natural: “Yo llevo los movimientos internos: lo que se cobra por atención, lo recibido y los pagos de la clínica. Puedo ver pacientes de las dos áreas para asociar cargos, pero no editar su historia clínica. Por ahora esta contabilidad queda en este dispositivo; falta conectarla a Supabase.”'),
 ('s','Permisos y límite actual'),('t','Wilson puede leer las fichas generales de ambas áreas porque necesita seleccionar un paciente para cobrar. No puede abrir las pestañas clínicas ni administrar cuentas. El módulo calcula saldos en centavos y rechaza un cobro superior a los cargos. Sus movimientos persisten en IndexedDB o SQLite, según la plataforma. Aún no se sincronizan entre equipos mediante Supabase; para la demostración se usa el mismo dispositivo.'),
 ('page',''),('h','Adrian · Enfermería'),('b','Entrar a Enfermería y crear/abrir un paciente del área.'),('b','Registrar temperatura, pulso, presión, saturación y nivel de triage. Abrir Kardex y guardar medicamento, dosis, vía, frecuencia y estado.'),('b','Mostrar cama disponible, ingreso, ocupación y alta. Editar una entrada para mostrar historial. Pulsar “Exportar informe PDF” para descargar el registro del paciente.'),('t','Frase natural: “Mi cuenta se queda en Enfermería. Aquí documento la valoración, medicamentos y hospitalización. El informe PDF recoge solo los datos de esta área.”'),
 ('s','Qué validar ante el profesor'),('t','Si una medicación se marca Administrada, el sistema exige una fecha de administración. Para hospitalización hay que elegir una cama libre: no se permiten dos ingresos activos en la misma cama ni dos camas simultáneas para el mismo paciente. Un alta libera la cama. El triage se registra como prioridad seleccionada; el programa no realiza diagnóstico médico.'),
 ('page',''),('h','Matias · Fisioterapia'),('b','Entrar a Fisioterapia y crear/abrir un paciente del área.'),('b','Guardar evaluación: articulación, movimiento, grados de goniometría, Daniels y dolor. Crear rutina con objetivo, ejercicios, frecuencia y fechas.'),('b','Registrar una evolución vinculada al plan. Exportar el informe completo y el PDF de una rutina concreta.'),('t','Frase natural: “Yo registro la valoración física y el progreso. El plan deja claros los ejercicios y el seguimiento; puedo entregar la rutina como PDF aparte.”'),
 ('s','Qué validar ante el profesor'),('t','La goniometría admite 0–360 grados, Daniels 0–5 y dolor 0–10. La rutina requiere objetivo, ejercicios, frecuencia y fechas coherentes; la evolución se vincula a un plan del mismo paciente. El PDF individual incluye solo la rutina elegida, mientras el informe de área recoge la historia local de Fisioterapia de ese paciente.'),
 ('h','Cierre honesto'),('t','La prueba offline consiste en cargar antes la Web, desconectar internet, guardar un registro clínico, comprobarlo localmente, reconectar y observar la sincronización. Wilson puede trabajar offline con su contabilidad, pero esos movimientos no se comparten por Supabase todavía. Las credenciales cloud deben existir y coincidir para que el intercambio clínico funcione.')
]

week1 += [
 ('page',''),('h','Decisiones de diseño explicadas con precisión'),
 ('s','Por qué React + Tauri'),('t','La interfaz React y TypeScript se comparte entre Web y escritorio. En navegador, la aplicación usa las APIs del navegador y IndexedDB; en Windows y Linux, Tauri ofrece una ventana nativa y un puente con SQLite. Esto permite mantener pantallas y reglas de negocio próximas, aunque las implementaciones de almacenamiento son diferentes. No existe una aplicación Android o iOS en esta entrega.'),
 ('s','Mapa de actores'),('t','La guía original exigía tres actores: Administrador, Enfermero y Fisioterapeuta. El Administrador organiza pacientes y cuentas; Enfermero registra la atención de Enfermería; Fisioterapeuta registra la rehabilitación. La extensión posterior incorpora Contable para cargos y cobros. El caso de uso impreso de Semana 1 representa la versión exigida en ese momento; al exponer hoy, se debe mencionar la ampliación.'),
 ('s','Navegación actual'),('t','Jeshua abre Coordinación, Pacientes, Usuarios y Sincronización. Wilson abre Contabilidad y Pacientes. Adrian abre su panel y Enfermería. Matias abre su panel y Fisioterapia. Cada usuario inicia y cierra sesión por separado. Las rutas se filtran por rol en la interfaz y las operaciones locales se validan de nuevo antes de escribir.'),
 ('h','Relación entre los cuatro integrantes y el código'),
 ('b','Jeshua integra el frontend, el motor de sincronización y las compilaciones. Su cuenta demuestra el directorio general y las cuentas locales.'),
 ('b','Wilson diseñó persistencia y autenticación. Su cuenta actual demuestra además el nuevo registro contable. Esta asignación de interfaz cambió después de las semanas iniciales.'),
 ('b','Adrian implementa el formulario y flujo de Enfermería con validaciones clínicas, camas, Kardex e informe de área.'),
 ('b','Matias implementa evaluación, rutinas y evolución; su PDF separa el informe completo de una rutina concreta.'),
 ('h','Material para la revisión'),('t','El profesor puede seguir el UML impreso con el código abierto y la Web publicada. Conviene explicar que los bocetos son una propuesta inicial y la interfaz que se ve hoy es una evolución. Si un instalador anterior muestra otra navegación, su fecha de compilación es anterior a esta revisión y no representa el mismo commit.')
]
week2 += [
 ('page',''),('h','Detalle técnico del almacenamiento y las migraciones'),
 ('s','Relaciones locales'),('t','La tabla de usuarios referencia roles; la tabla de credenciales referencia usuarios. Pacientes se relaciona con encuentros clínicos, que guardan autor y área. Una atención de Enfermería puede tener signos vitales y triage; una evaluación de Fisioterapia puede tener plan de rehabilitación. Los ítems clínicos posteriores vinculan paciente y, cuando corresponde, cama, evaluación o plan. La contabilidad agregada en migración 007 vincula cargo/cobro a paciente y deja un gasto sin paciente.'),
 ('s','Restricciones relevantes'),('t','Los identificadores UUID son únicos. El nombre de usuario tiene índice único; los rangos de edad y de variables clínicas se comprueban en los formularios y el motor. SQLite impone PK/FK/CHECK para impedir referencias o tipos inválidos. Los movimientos contables usan centavos enteros para evitar errores de redondeo y no permiten cobrar por encima del cargo pendiente. Los cambios tienen version y borrado lógico para conservar trazabilidad local.'),
 ('s','Qué significa migrar'),('t','Una migración modifica la estructura sin empezar de cero ni borrar fichas. SQLite ejecuta scripts numerados una sola vez y registra schema_migrations; la Web incrementa su versión de IndexedDB y crea stores faltantes. La migración contable cambia el catálogo de roles, conserva hashes previos y asigna a Wilson el rol Contable. Las cuentas ya existentes no deben reinstalarse para cambiar su clave.'),
 ('h','Supabase no es la base local'),('t','El proyecto cloud CLINOVA usa PostgreSQL. Su esquema clinova no copia literalmente todas las tablas SQLite: records contiene documentos clínicos con kind, area, patient_id, payload, revision y sequence; revisions guarda historial; receipts evita repetir operaciones con el mismo operation_id. members asocia Auth con rol y usuario local; invitations gestiona el alta cloud. Todas esas tablas tienen RLS. La Edge Function verifica JWT y rol antes del intercambio.'),
 ('h','Seguridad que se puede mostrar'),('b','Abrir el login y mencionar hash PBKDF2, sal individual, bloqueo temporal y cierre de sesión.'),('b','Intentar entrar a Usuarios desde Wilson, Adrian o Matias: no aparece la opción y la API local rechaza la operación.'),('b','Mostrar que Adrian y Matias solo consultan pacientes de su área; Wilson ve ambas áreas para cargos, sin registros clínicos.'),('b','No mostrar hashes o contraseñas ante el curso. Una clave publicable de Supabase puede estar en el cliente; la clave de servicio no está en el repositorio.')
]
week3 += [
 ('page',''),('h','Operaciones clínicas que se pueden enseñar'),
 ('s','Enfermería'),('t','La ficha de paciente registra nombre, edad, área, motivo y estado. En signos vitales se capturan temperatura, pulso, presión sistólica y diastólica, saturación y una prioridad de triage elegida por el usuario; el sistema valida rangos y exige sistólica mayor que diastólica. Kardex conserva medicamento, dosis, vía, frecuencia, horario y estado. Camas tiene código y sala; un ingreso ocupa cama hasta el alta. No debe presentarse el triage como diagnóstico automático.'),
 ('s','Fisioterapia'),('t','La evaluación recoge región, lado, movimiento, grados, fuerza Daniels de 0 a 5 y dolor de 0 a 10. Una rutina indica objetivo, ejercicios, frecuencia, inicio, fin y estado. La evolución se relaciona con un plan y documenta sesión, dolor, grados, Daniels y progreso. Los PDF se generan desde la ficha seleccionada; son documentos académicos que deben revisarse antes de compartir.'),
 ('h','Qué sucede cuando falla la red'),('t','El guardado clínico se confirma localmente antes de enviarse. Si no hay internet, el estado queda pendiente. Cuando vuelve la conexión y existe una cuenta cloud válida, se consultan pendientes y el cliente envía lotes a clinova-api. El servidor devuelve confirmaciones por operación y cambios desde el cursor. Si una revisión cambió en otro equipo, el cliente conserva la versión local y el conflicto para elegir resolución. El estado visible puede ser pendiente, sincronizando, completado o error.'),
 ('s','Qué sí se verificó y qué requiere demo'),('t','Las pruebas de código incluyen cola, rollback, ACK repetidos, conflictos y separación por rol con respuestas simuladas. La base Supabase real fue creada y tiene el esquema y función antes descritos. Para afirmar que dos dispositivos compartieron una ficha en la exposición hay que realizar el recorrido en vivo con dos sesiones cloud válidas. La información contable actual no entra en ese flujo; en su pantalla se avisa que es local.'),
 ('h','Lectura del DFD impreso'),('b','Entidad externa: usuario que registra o consulta una ficha. Proceso local: validación, guardado y cola.'),('b','Proceso de red: detección de conexión y envío autenticado; almacén cloud: records, revisions y receipts.'),('b','Respuesta: ACK, cambios y cursor. Una discrepancia lleva a conflicto, historial y resolución sin borrar silenciosamente la copia local.')
]
week4 += [
 ('page',''),('h','Secuencias y rutas concretas'),
 ('s','Secuencia de autenticación'),('t','La pantalla solicita credenciales, el motor local consulta usuario y hash, compara PBKDF2, registra fallos o crea una sesión, y devuelve un perfil público con rol. En operaciones posteriores el token local se vuelve a comprobar. Cuando hay sincronización, Supabase Auth realiza una segunda autenticación cloud y la función valida el JWT. No se debe decir que la contraseña local se envía al servidor en cada operación.'),
 ('s','Secuencia de guardado y sincronización'),('t','El profesional completa un formulario, el motor valida rangos y permisos, guarda el documento y su pendiente en la base local, actualiza la pantalla y devuelve un estado. Al detectar conexión, Sync Engine envía el pendiente a la Edge Function; la función consulta PostgreSQL y devuelve ACK, cambios o conflicto. El cliente aplica la respuesta en una transacción. La contabilidad sigue una secuencia local más corta: validar, guardar movimiento y recalcular saldo; aún no usa la función cloud.'),
 ('h','Alcance de las pruebas presentables'),('b','Pruebas unitarias y de integración local: roles, autenticación, migraciones, saldos, cola y conflictos.'),('b','Ensayo de 500 altas: mide escrituras en IndexedDB simulado y no la capacidad de PostgreSQL.'),('b','Prueba Web real: usar navegador y revisar formularios, botones, persistencia y exportaciones. La demostración offline debe empezar después de la carga inicial.'),('b','Prueba cruzada entre grupos: requiere participación efectiva de otro equipo; si no consta, marcarla pendiente.'),('h','Entregas y límites'),('t','La guía pide el diagrama de secuencia impreso, manual de usuario y técnico en borrador, y binarios Windows/Linux. El README describe cómo desarrollar la Web y ubica el proyecto. La URL Hostinger permite presentar la Web sin instalar nada. Las actualizaciones de Web, código GitHub e instaladores tienen ciclos distintos: un cambio en la Web no reescribe un MSI, EXE, DEB o AppImage ya compilado. Antes de presentar un instalador hay que comprobar su versión exacta.')
]

for name,title,blocks in [
 ('SEMANA_1_CORREGIDA.pdf','Semana 1 · arquitectura y roles',week1),
 ('SEMANA_2_CORREGIDA.pdf','Semana 2 · datos y seguridad',week2),
 ('SEMANA_3_CORREGIDA.pdf','Semana 3 · clínica y sincronización',week3),
 ('SEMANA_4_CORREGIDA.pdf','Semana 4 · QA y manuales',week4),
 ('GUION_CUATRO_CUENTAS.pdf','Guion de exposición · cuatro cuentas',roles)]:
 print(build(name,title,common,blocks))

def der_diagram():
 path=HERE/'DER_ACTUALIZADO_LOCAL_Y_SUPABASE.pdf'
 c=canvas.Canvas(str(path),pagesize=landscape(A3))
 W,H=landscape(A3)
 def title(t,subtitle):
  c.setFillColor(NAVY);c.rect(0,H-14*mm,W,14*mm,fill=1,stroke=0)
  c.setFont('Arial-Bold',18);c.setFillColor(NAVY);c.drawString(17*mm,H-29*mm,t)
  c.setFont('Arial',9);c.setFillColor(MUTED);c.drawString(17*mm,H-36*mm,subtitle)
 def box(x,y,w,h,name,fields,accent=TEAL):
  x,y,w,h=[v*mm for v in (x,y,w,h)]
  c.setFillColor(colors.white);c.setStrokeColor(colors.HexColor('#a8cbd3'));c.roundRect(x,y,w,h,4*mm,fill=1,stroke=1)
  c.setFillColor(accent);c.roundRect(x,y+h-10*mm,w,10*mm,4*mm,fill=1,stroke=0)
  c.rect(x,y+h-10*mm,w,5*mm,fill=1,stroke=0)
  c.setFillColor(colors.white);c.setFont('Arial-Bold',9);c.drawString(x+4*mm,y+h-6.5*mm,name)
  c.setFillColor(NAVY);c.setFont('Arial',7.6)
  for i,f in enumerate(fields):c.drawString(x+4*mm,y+h-(17+6.1*i)*mm,f)
  return x,y,w,h
 def edge(a,b,label):
  ax,ay,aw,ah=a;bx,by,bw,bh=b
  if bx>ax+aw: start=(ax+aw,ay+ah/2);end=(bx,by+bh/2)
  elif ax>bx+bw:start=(ax,ay+ah/2);end=(bx+bw,by+bh/2)
  elif by>ay+ah:start=(ax+aw/2,ay+ah);end=(bx+bw/2,by)
  else:start=(ax+aw/2,ay);end=(bx+bw/2,by+bh)
  c.setStrokeColor(colors.HexColor('#6a9dac'));c.setLineWidth(.7);c.line(*start,*end)
  c.setFillColor(MUTED);c.setFont('Arial',6.5);c.drawCentredString((start[0]+end[0])/2,(start[1]+end[1])/2+2,label)
 def bottom(note,page):
  c.setStrokeColor(colors.HexColor('#c5d9e0'));c.line(17*mm,16*mm,W-17*mm,16*mm)
  c.setFont('Arial',7.5);c.setFillColor(MUTED);c.drawString(17*mm,10*mm,note);c.drawRightString(W-17*mm,10*mm,str(page))
 title('DER revisado · almacenamiento local','Web: IndexedDB equivalente lógico · Escritorio: SQLite migraciones 001–007 · PK = clave primaria; FK = clave foránea')
 roles=box(18,192,74,54,'roles',['PK id UUID','name único','Administrador / Enfermero','Fisioterapeuta / Contable'])
 users=box(113,192,78,54,'users',['PK id UUID','FK role_id → roles.id','username único · active','version · deleted_at'])
 credentials=box(213,192,86,54,'credentials',['PK/FK user_id → users.id','password_hash + salt','iterations · intentos','locked_until'])
 patients=box(18,102,92,60,'patients',['PK id UUID','area · name · age','reason · status','version · deleted_at'])
 encounters=box(132,102,91,60,'encounters',['PK id UUID','FK patient_id → patients.id','FK author_id → users.id','kind: Enfermería / Fisioterapia'])
 vitals=box(244,123,69,39,'vital_signs / triage',['FK encounter_id','signos y prioridad','relación 1:1'])
 evals=box(244,67,86,41,'evaluations / plans',['FK encounter_id','Daniels, grados, dolor','objetivo de rehabilitación'])
 items=box(17,36,127,47,'clinical_items',['PK id UUID · FK patient_id','kind: kardex / bed / admission','routine / evolution · reference_id'])
 finance=box(181,25,127,58,'financial_entries (migración 007)',['PK id UUID · FK patient_id opcional','FK author_id → users.id','kind: cargo / cobro / gasto','amount_cents · method · version'])
 for a,b,l in [(roles,users,'1:N'),(users,credentials,'1:1'),(patients,encounters,'1:N'),(users,encounters,'autor'),(encounters,vitals,'1:1'),(encounters,evals,'1:1'),(patients,items,'1:N'),(patients,finance,'1:N')]:edge(a,b,l)
 bottom('Modelo local. Las bajas se conservan con deleted_at; la contabilidad es una ampliación posterior a Semana 2.',1);c.showPage()
 title('Modelo cloud real · proyecto Supabase CLINOVA','PostgreSQL esquema clinova · proyecto gcsodpalqwwpsiodeeil · región sa-east-1 · RLS habilitado')
 auth=box(20,193,82,48,'auth.users (Supabase Auth)',['PK id UUID','identidad de cuenta cloud','JWT para la Edge Function'],NAVY)
 roles2=box(128,206,70,35,'clinova.roles',['PK name','incluye Contable'],NAVY)
 members=box(225,190,113,57,'clinova.members',['PK/FK user_id → auth.users','FK role → clinova.roles','local_user_id UUID único','active'],NAVY)
 invite=box(20,100,99,54,'clinova.invitations',['PK token_hash','FK role → clinova.roles','email · expires_at · used_at'],NAVY)
 records=box(144,105,133,64,'clinova.records',['PK id UUID','kind · area · patient_id','payload JSONB · revision','sequence · updated_by'],NAVY)
 revisions=box(301,115,89,54,'clinova.revisions',['PK (record_id,revision)','FK record_id → records.id','document JSONB · actor_id'],NAVY)
 receipts=box(145,28,133,55,'clinova.receipts',['PK operation_id UUID','actor_id · request JSONB','response JSONB','evita duplicar operaciones'],NAVY)
 for a,b,l in [(auth,members,'1:1'),(roles2,members,'1:N'),(roles2,invite,'1:N'),(records,revisions,'1:N'),(auth,records,'autor'),(auth,receipts,'autor')]:edge(a,b,l)
 c.setFillColor(PALE);c.roundRect(20*mm,34*mm,99*mm,51*mm,4*mm,fill=1,stroke=0)
 c.setFillColor(NAVY);c.setFont('Arial-Bold',10);c.drawString(25*mm,73*mm,'Flujo de sincronización clínica')
 c.setFont('Arial',8);c.drawString(25*mm,63*mm,'Cliente local → clinova-api → records')
 c.drawString(25*mm,55*mm,'ACK y conflictos → revisions / receipts')
 c.drawString(25*mm,47*mm,'Contabilidad aún no se envía a la nube.')
 bottom('Las tablas cloud documentan intercambio; no son una copia literal de todas las tablas SQLite.',2);c.save()
 return path
print(der_diagram())

