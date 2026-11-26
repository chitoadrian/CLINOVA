"""Diagramas vectoriales de CLINOVA, versión imprimible del 26/11/2026."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A3, landscape
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

OUT = Path(__file__).resolve().parent
W, H = landscape(A3)
pdfmetrics.registerFont(TTFont('Arial', r'C:\Windows\Fonts\arial.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Bold', r'C:\Windows\Fonts\arialbd.ttf'))
INK = colors.HexColor('#112f40')
BLACK = colors.HexColor('#101820')
TEAL = colors.HexColor('#087c8c')
BLUE = colors.HexColor('#dceff1')
PALE = colors.HexColor('#f4f8f9')
LINE = colors.HexColor('#9fb9c2')
GRAY = colors.HexColor('#496776')
WHITE = colors.white


def txt(c, x, y, text, size=10, bold=False, color=INK):
    c.setFillColor(color)
    c.setFont('Arial-Bold' if bold else 'Arial', size)
    c.drawString(x, y, text)


def center(c, x, y, text, size=10, bold=False, color=INK):
    c.setFillColor(color)
    c.setFont('Arial-Bold' if bold else 'Arial', size)
    c.drawCentredString(x, y, text)


def lines(c, x, y, values, size=9, leading=14, color=INK, bold=False):
    for i, value in enumerate(values):
        txt(c, x, y - i * leading, value, size, bold, color)


def page(c, section, title, subtitle, number, total):
    c.setFillColor(BLACK)
    c.rect(0, H - 91, W, 91, fill=1, stroke=0)
    c.setFillColor(TEAL)
    c.rect(0, H - 96, W, 5, fill=1, stroke=0)
    txt(c, 47, H - 34, f'CLINOVA  /  {section}', 11, True, colors.HexColor('#9de5e7'))
    txt(c, 47, H - 68, title, 24, True, WHITE)
    txt(c, 48, H - 121, subtitle, 9.6, False, GRAY)
    c.setStrokeColor(LINE)
    c.line(47, 48, W - 47, 48)
    txt(c, 47, 30, 'Unidad Educativa Montepiedra  ·  Clínica Sanpichito  ·  3.º Bachillerato, Grupo 3', 8, False, GRAY)
    c.setFont('Arial', 8)
    c.setFillColor(GRAY)
    c.drawRightString(W - 47, 30, f'{number} / {total}  ·  26/11/2026')


def card(c, x, y, w, h, title, rows, tag=None):
    c.setFillColor(WHITE)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.9)
    c.roundRect(x, y, w, h, 11, fill=1, stroke=1)
    c.setFillColor(BLACK)
    c.roundRect(x, y + h - 34, w, 34, 11, fill=1, stroke=0)
    c.rect(x, y + h - 34, w, 12, fill=1, stroke=0)
    txt(c, x + 14, y + h - 22, title, 11, True, WHITE)
    if tag:
        c.setFillColor(TEAL)
        c.roundRect(x + w - 59, y + h - 27, 46, 18, 5, fill=1, stroke=0)
        center(c, x + w - 36, y + h - 21, tag, 7.4, True, WHITE)
    lines(c, x + 14, y + h - 53, rows, 9.1, 16)


def arrow(c, x1, y1, x2, y2, label=None, dashed=False):
    c.setStrokeColor(TEAL)
    c.setFillColor(TEAL)
    c.setLineWidth(1.35)
    c.setDash(4, 3) if dashed else c.setDash()
    c.line(x1, y1, x2, y2)
    c.setDash()
    import math
    angle = math.atan2(y2 - y1, x2 - x1)
    for offset in (-0.46, 0.46):
        c.line(x2, y2, x2 - 8 * math.cos(angle + offset), y2 - 8 * math.sin(angle + offset))
    if label:
        center(c, (x1+x2)/2, (y1+y2)/2 + 7, label, 8, False, GRAY)


def pill(c, x, y, w, h, values):
    c.setStrokeColor(TEAL)
    c.setFillColor(BLUE)
    c.setLineWidth(1.25)
    c.ellipse(x, y, x+w, y+h, fill=1, stroke=1)
    start = y + h/2 + (len(values)-1)*6 - 4
    for i, value in enumerate(values):
        center(c, x+w/2, start-i*12, value, 8.7, i==0)


def case_uses():
    c = canvas.Canvas(str(OUT/'CASOS_DE_USO_ACTUALIZADOS.pdf'), pagesize=(W,H))
    page(c, 'SEMANA 1 · UML', 'Casos de uso y permisos por rol', 'Asociación actor → función. Las cuatro cuentas tienen menús y permisos propios.', 1, 1)
    roles = [
        ('Jeshua', 'Administrador', 615, [['Acceder al', 'sistema'], ['Gestionar usuarios', 'y roles'], ['Consultar pacientes', 'de ambas áreas'], ['Revisar estado', 'de sincronización']]),
        ('Wilson', 'Contable', 465, [['Acceder al', 'sistema'], ['Consultar pacientes', 'de ambas áreas'], ['Registrar cargos,', 'cobros y gastos'], ['Exportar informe', 'contable PDF']]),
        ('Adrian', 'Enfermero', 315, [['Acceder al', 'sistema'], ['Gestionar pacientes', 'de Enfermería'], ['Registrar signos,', 'triage, Kardex y camas'], ['Exportar informe', 'de Enfermería']]),
        ('Matias', 'Fisioterapeuta', 165, [['Acceder al', 'sistema'], ['Gestionar pacientes', 'de Fisioterapia'], ['Evaluar, planificar', 'y registrar evolución'], ['Exportar informe', 'y rutina PDF']]),
    ]
    c.setStrokeColor(LINE)
    c.roundRect(224, 110, W-271, 587, 13, fill=0, stroke=1)
    txt(c, 246, 680, 'LÍMITE DEL SISTEMA CLINOVA', 10, True, TEAL)
    xcols = [246, 470, 694, 918]
    for name, role, y, cases in roles:
        if y != 615:
            c.setStrokeColor(LINE); c.line(46, y+73, W-46, y+73)
        c.setStrokeColor(INK); c.setLineWidth(2)
        c.circle(133, y+27, 9, fill=0, stroke=1)
        c.line(133,y+18,133,y-15);c.line(112,y+4,154,y+4)
        c.line(133,y-15,116,y-34);c.line(133,y-15,150,y-34)
        center(c,133,y-53,name,10,True)
        center(c,133,y-68,role,8.6,False,GRAY)
        # Las asociaciones quedan por debajo de las elipses; no atraviesan etiquetas.
        c.setStrokeColor(TEAL);c.setLineWidth(1.2)
        c.line(170,y+1,224,y+1)
        c.line(224,y+1,224,y-36)
        c.line(224,y-36,xcols[-1]+104,y-36)
        for x, text in zip(xcols, cases):
            c.line(x+104,y-36,x+104,y-32)
            pill(c,x,y-32,208,66,text)
    txt(c,47,86,'Lectura:',9,True)
    txt(c,100,86,'Cada línea une una cuenta con una función disponible en su perfil. La contabilidad se añadió después de la rúbrica inicial.',8.8)
    txt(c,47,68,'Los datos contables permanecen locales; la sincronización de Supabase cubre los registros clínicos.',8.8,False,GRAY)
    c.save()


def der():
    c = canvas.Canvas(str(OUT/'DER_ACTUALIZADO_LOCAL_Y_SUPABASE.pdf'), pagesize=(W,H))
    page(c,'SEMANA 2 · DER','Modelo local: identidad y atención','SQLite en escritorio; IndexedDB implementa la estructura lógica equivalente en Web. PK = primaria; FK = foránea.',1,2)
    # Relaciones detrás de las tarjetas. Las líneas llegan a bordes, sin atravesar contenido.
    arrow(c,346,595,432,595,'1 : N')
    arrow(c,756,595,842,595,'1 : 1')
    arrow(c,346,370,432,370,'1 : N')
    arrow(c,756,370,842,370,'1 : 1')
    arrow(c,595,535,595,430,'autor 1 : N')
    arrow(c,992,310,992,270,'signos 1 : 1')
    card(c,50,535,296,135,'roles',['PK id · nombre único','Administrador / Enfermero','Fisioterapeuta / Contable'],'LOCAL')
    card(c,432,535,324,135,'users',['PK id · FK role_id → roles.id','username único · active','version · deleted_at'],'LOCAL')
    card(c,842,535,300,135,'credentials',['PK/FK user_id → users.id','hash PBKDF2 + salt + iteraciones','intentos · bloqueo temporal'],'LOCAL')
    card(c,50,310,296,120,'patients',['PK id · área · nombre · edad','estado · motivo','version · deleted_at'],'LOCAL')
    card(c,432,310,324,120,'encounters',['PK id · FK patient_id → patients.id','FK author_id → users.id','kind: Enfermería / Fisioterapia'],'LOCAL')
    card(c,842,310,300,120,'vital_signs',['PK id · FK encounter_id (UNIQUE)','temperatura · pulso · presión','saturación SpO2'],'LOCAL')
    card(c,842,150,300,120,'triage',['PK id · FK encounter_id (UNIQUE)','FK vital_id → vital_signs.id','prioridad · observaciones'],'LOCAL')
    c.setFillColor(PALE);c.setStrokeColor(LINE);c.roundRect(50,135,704,105,10,fill=1,stroke=1)
    txt(c,66,214,'Reglas de integridad',11,True)
    lines(c,66,188,['FK y UNIQUE protegen referencias y relaciones 1:1.','Las bajas conservan deleted_at y cada edición incrementa version.','Los hashes de acceso local no se envían a Supabase.'],8.8,19)
    c.showPage()
    page(c,'SEMANA 2 · DER','Modelo local y proyección cloud','Las tablas clínicas normalizadas son locales. Supabase recibe documentos clínicos y revisiones, no una copia idéntica del DER.',2,2)
    arrow(c,356,557,429,557,'1 : N')
    arrow(c,356,339,429,339,'1 : 1')
    card(c,50,493,306,130,'medications',['PK id · catálogo local','name · presentation · active','referencia desde medication_orders'],'LOCAL')
    card(c,429,493,325,130,'medication_orders',['PK id · FK medication_id','FK encounter_id → encounters.id','dose · route · frequency'],'LOCAL')
    card(c,830,493,312,130,'clinical_items',['PK id · FK patient_id','kind: Kardex / cama / ingreso','rutina / evolución · details JSON'],'LOCAL')
    card(c,50,275,306,130,'evaluations',['PK id · FK encounter_id (UNIQUE)','región · movimiento · grados','Daniels 0-5 · dolor 0-10'],'LOCAL')
    card(c,429,275,325,130,'rehabilitation_plans',['PK id · FK encounter_id (UNIQUE)','FK evaluation_id (UNIQUE)','objetivo · fechas y rutina en items'],'LOCAL')
    card(c,830,275,312,130,'financial_entries',['PK id · FK patient_id opcional','FK author_id → users.id','cargo / cobro / gasto · centavos'],'LOCAL')
    c.setFillColor(PALE);c.setStrokeColor(LINE);c.roundRect(50,112,1092,111,10,fill=1,stroke=1)
    txt(c,66,198,'Supabase / PostgreSQL · esquema clinova',11,True)
    lines(c,66,175,['Auth identifica la cuenta cloud; members asigna rol. records guarda documentos clínicos por UUID y área.','revisions conserva historial; receipts evita duplicados; invitations gestiona altas. RLS limita el acceso.','Contabilidad se añadió después y sus movimientos NO se sincronizan entre dispositivos.'],9.1,19)
    c.save()


def dfd():
    c=canvas.Canvas(str(OUT/'DFD_MOTOR_SINCRONIZACION.pdf'),pagesize=(W,H))
    page(c,'SEMANA 3 · DFD','Motor de sincronización: contexto','Las operaciones clínicas se guardan primero en el dispositivo y se envían con una sesión cloud válida.',1,2)
    # Diagrama compacto en la mitad superior.
    arrow(c,289,478,454,478,'ediciones / consultas')
    arrow(c,735,478,900,478,'HTTPS + token')
    arrow(c,900,419,735,419,'confirmaciones / cambios')
    arrow(c,454,419,289,419,'estado / fichas')
    card(c,60,402,229,140,'E1 · Personal',['Jeshua: coordinación','Adrian: Enfermería','Matias: Fisioterapia'],'ACTOR')
    c.setStrokeColor(TEAL);c.setFillColor(BLUE);c.ellipse(454,399,735,545,fill=1,stroke=1)
    center(c,594,480,'0 · Sync Engine',15,True)
    center(c,594,455,'cola · transporte · conflictos',9.5)
    card(c,900,402,242,140,'E2 · Supabase',['Auth + Edge Function','PostgreSQL / esquema clinova','RLS y revisiones'],'NUBE')
    c.setFillColor(PALE);c.setStrokeColor(LINE);c.roundRect(60,151,1082,180,10,fill=1,stroke=1)
    txt(c,78,304,'Qué cruza el límite',12,True)
    lines(c,78,275,['→ Suben documentos clínicos con UUID, operación, revisión base y datos validados.','← Bajan confirmaciones, nuevas revisiones, cambios autorizados y posibles conflictos.','Las credenciales locales, sus hashes y los movimientos contables no viajan en este flujo.'],10,31)
    c.showPage()
    page(c,'SEMANA 3 · DFD','Procesos y almacenes: nivel 1','Una escritura local y su entrada de cola se confirman juntas. Al reconectar, el motor procesa pendientes y cambios remotos.',2,2)
    # Flujo horizontal sin cruces.
    boxes=[(54,'1 · Guardar local',['Validar por rol y área','Escribir ficha y versión']),
           (339,'2 · Detectar red',['Comprobar conexión','Leer cola pendiente']),
           (624,'3 · Intercambiar',['Auth + API segura','Enviar / recibir lotes']),
           (909,'4 · Conciliar',['Confirmar UUID / revisión','Archivar conflicto'])]
    for i,(x,title,body) in enumerate(boxes):
        card(c,x,490,230,131,title,body)
        if i<3:arrow(c,x+230,555,boxes[i+1][0],555)
    # Almacenes bajo cada proceso.
    stores=[(73,'D1 · IndexedDB / SQLite',['pacientes · atenciones','items clínicos']),
            (358,'D2 · Cola local',['op_id · base_revision','pendiente / error']),
            (643,'D3 · PostgreSQL',['records · revisions','receipts idempotentes']),
            (928,'D4 · Conflictos',['versión local y remota','resolución trazable'])]
    for x,title,body in stores:
        card(c,x,258,192,101,title,body)
        arrow(c,x+96,490,x+96,359)
    c.setFillColor(PALE);c.setStrokeColor(LINE);c.roundRect(54,111,1085,90,10,fill=1,stroke=1)
    lines(c,73,177,['Si no hay red: D1 y D2 siguen disponibles. Al volver: se envía cada op_id una sola vez y se aplica el cursor remoto.','Si la revisión cambió: D4 guarda ambas versiones; una persona decide cuál conservar. El sistema no descarta información en silencio.'],9.3,23)
    c.save()


def gantt():
    c=canvas.Canvas(str(OUT/'GANTT_ACTUALIZADO_26_NOV.pdf'),pagesize=(W,H))
    page(c,'SEMANAS 1–5','Cronograma y estado verificable','Plan: 12 de noviembre al 10 de diciembre de 2026 · Corte de seguimiento: 26 de noviembre de 2026.',1,1)
    starts=[48,430,540,655,723,791,859,927,995]
    headers=['ACTIVIDAD / ENTREGABLE','FECHA','RESPONSABLE','S1','S2','S3','S4','S5','ESTADO AL CORTE']
    c.setFillColor(BLACK);c.roundRect(47,642,1095,36,7,fill=1,stroke=0)
    for x,h in zip(starts,headers):txt(c,x+7,655,h,8.2,True,WHITE)
    rows=[
      ('Gantt, roles y casos de uso','12-18 nov','Jeshua / equipo',0,'Hecho · PDF'),
      ('Base React, Tauri y repositorio','12-18 nov','Jeshua / equipo',0,'Hecho · código'),
      ('DER, migraciones y CRUD local','19-25 nov','Wilson',1,'Hecho · SQLite / IDB'),
      ('Autenticación y permisos','19-25 nov','Wilson / Jeshua',1,'Hecho · 4 roles'),
      ('Enfermería y exportación PDF','26 nov-2 dic','Adrian',2,'Implementado antes del cierre'),
      ('Fisioterapia y exportación PDF','26 nov-2 dic','Matias',2,'Implementado antes del cierre'),
      ('Sync Engine y DFD','26 nov-2 dic','Wilson / Jeshua',2,'Código listo; demo pendiente'),
      ('Prueba cruzada y correcciones','3-9 dic','Todo el equipo',3,'Pendiente · sin acta'),
      ('Manuales e instaladores','3-9 dic','Jeshua / equipo',3,'Borradores / CI generados'),
      ('Publicación final y defensa','10 dic','Todo el equipo',4,'Pendiente'),
    ]
    for i,(activity,date,owner,week,status) in enumerate(rows):
        y=601-i*48
        c.setFillColor(WHITE if i%2==0 else PALE);c.rect(47,y-14,1095,48,fill=1,stroke=0)
        c.setStrokeColor(LINE);c.line(47,y-14,1142,y-14)
        txt(c,55,y+10,activity,9,True)
        txt(c,437,y+10,date,8.7)
        txt(c,547,y+10,owner,8.7)
        for j,x in enumerate(starts[3:8]):
            c.setFillColor(BLACK if j==week else colors.HexColor('#e4ecef'))
            c.roundRect(x+11,y+2,39,18,5,fill=1,stroke=0)
        txt(c,1002,y+10,status,8.35)
    c.setFillColor(PALE);c.setStrokeColor(LINE);c.roundRect(47,72,1095,73,9,fill=1,stroke=1)
    txt(c,63,121,'Lectura del avance',10,True)
    txt(c,63,102,'Cuadro negro = semana planificada. La columna derecha indica evidencia real al 26/11, aunque alguna función se implementó antes de su fecha.',8.7)
    txt(c,63,83,'Contabilidad es una ampliación posterior; se guarda localmente. La demostración de sincronización entre equipos y la prueba cruzada siguen pendientes.',8.7)
    c.save()


def sequence():
    c=canvas.Canvas(str(OUT/'SECUENCIAS_CLINOVA.pdf'),pagesize=(W,H))
    diagrams=[
      ('Acceso local y permisos',['Persona','Login','Servicio local','Credenciales','Interfaz'],[
          (0,1,'Ingresar usuario y contraseña'),(1,2,'login()'),(2,3,'Leer hash, sal e intentos'),(3,2,'Datos de cuenta'),(2,2,'PBKDF2 + bloqueo',True),(2,1,'Resultado y rol'),(1,4,'Abrir menú permitido')],
       'Si falla: registra intento, muestra error y mantiene la sesión cerrada. Cinco fallos bloquean temporalmente.'),
      ('Registro clínico y sincronización',['Profesional','Formulario','Base local','Cola','Supabase'],[
          (0,1,'Guardar dato validado'),(1,2,'Escritura transaccional'),(2,3,'Añadir op_id y revisión'),(3,4,'Enviar lote al reconectar'),(4,3,'Confirmación o conflicto'),(3,2,'Aplicar revisión remota'),(2,1,'Mostrar estado actualizado')],
       'El servidor verifica token y rol. Un op_id repetido se confirma sin duplicar; un conflicto conserva ambas versiones.'),
    ]
    for num,(title,actors,msgs,note) in enumerate(diagrams,1):
        page(c,'SEMANA 4 · UML',title,'La secuencia avanza de arriba abajo. Flecha continua = solicitud; flecha punteada = respuesta.',num,2)
        xs=[120,357,594,831,1068]
        for x,a in zip(xs,actors):
            c.setFillColor(PALE);c.setStrokeColor(TEAL);c.roundRect(x-91,601,182,41,8,fill=1,stroke=1)
            center(c,x,616,a,10,True)
            c.setStrokeColor(LINE);c.setDash(4,4);c.line(x,601,x,178);c.setDash()
        for i,item in enumerate(msgs):
            a,b,label,*rest=item
            y=559-i*52
            if a==b:
                c.setStrokeColor(TEAL);c.roundRect(xs[a]+8,y-18,127,35,6,fill=0,stroke=1)
                txt(c,xs[a]+143,y-3,label,9)
            else:
                arrow(c,xs[a],y,xs[b],y,label,dashed=(i in (3,4) and a>b))
        c.setFillColor(PALE);c.setStrokeColor(LINE);c.roundRect(54,77,1085,65,9,fill=1,stroke=1)
        txt(c,69,112,'Rama / condición',10,True)
        txt(c,69,92,note,9.1)
        if num<2:c.showPage()
    c.save()


if __name__=='__main__':
    case_uses();der();dfd();gantt();sequence()
    for p in OUT.glob('*.pdf'):
        if p.name in {'CASOS_DE_USO_ACTUALIZADOS.pdf','DER_ACTUALIZADO_LOCAL_Y_SUPABASE.pdf','DFD_MOTOR_SINCRONIZACION.pdf','GANTT_ACTUALIZADO_26_NOV.pdf','SECUENCIAS_CLINOVA.pdf'}:
            print(p)
