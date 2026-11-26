"""UML impreso del sistema actual, con las ampliaciones posteriores señaladas."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A3, landscape
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

HERE = Path(__file__).resolve().parent
OUT = HERE / 'CASOS_DE_USO_ACTUALIZADOS.pdf'
pdfmetrics.registerFont(TTFont('Arial', r'C:\Windows\Fonts\arial.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Bold', r'C:\Windows\Fonts\arialbd.ttf'))
W, H = landscape(A3)
navy = colors.HexColor('#111111')
teal = colors.HexColor('#222222')
line = colors.HexColor('#8b8b8b')
light = colors.HexColor('#f3f3f3')
c = canvas.Canvas(str(OUT), pagesize=(W,H))
c.setTitle('CLINOVA - Casos de uso actualizados')
c.setFillColor(navy); c.rect(0,H-84,W,84,fill=1,stroke=0)
c.setFillColor(colors.white); c.setFont('Arial-Bold',23)
c.drawString(42,H-43,'CLINOVA  |  CASOS DE USO ACTUALES')
c.setFont('Arial',10)
c.drawString(43,H-65,'Unidad Educativa Montepiedra  ·  Clínica Sanpichito  ·  Revisión 26/11/2026')

def actor(x,y,label):
    c.setStrokeColor(navy); c.setLineWidth(1.5)
    c.circle(x,y+25,8,stroke=1,fill=0)
    c.line(x,y+17,x,y-15); c.line(x-16,y+6,x+16,y+6)
    c.line(x,y-15,x-13,y-32); c.line(x,y-15,x+13,y-32)
    c.setFillColor(navy); c.setFont('Arial-Bold',11)
    c.drawCentredString(x,y-49,label)

def oval(cx,cy,label):
    c.setStrokeColor(teal); c.setFillColor(light); c.setLineWidth(1.15)
    c.ellipse(cx-94,cy-29,cx+94,cy+29,stroke=1,fill=1)
    c.setFillColor(navy); c.setFont('Arial',9.3)
    parts=label.split('\n')
    for i,part in enumerate(parts):
        c.drawCentredString(cx,cy+(len(parts)-1)*5-i*11,part)

c.setStrokeColor(line); c.setLineWidth(1)
c.roundRect(226,107,W-268,H-205,15,stroke=1,fill=0)
c.setFillColor(teal); c.setFont('Arial-Bold',12)
c.drawString(246,H-111,'Límite del sistema CLINOVA')

rows=[
 ('Jeshua · Administrador',668,['Acceder y cerrar sesión','Gestionar usuarios\ny roles','Consultar directorio\nde pacientes','Ver estado de\nsincronización']),
 ('Wilson · Contable',523,['Acceder y cerrar sesión','Consultar pacientes\nde ambas áreas','Registrar cobros,\ncargos y gastos','Exportar resumen\ncontable PDF']),
 ('Adrian · Enfermero',378,['Acceder y cerrar sesión','Gestionar pacientes\nde Enfermería','Signos, triage,\nKardex y camas','Exportar informe\nde Enfermería PDF']),
 ('Matias · Fisioterapeuta',233,['Acceder y cerrar sesión','Gestionar pacientes\nde Fisioterapia','Evaluación, Daniels,\ngoniometría y rutinas','Evolución y\nPDF de rutina']),
]
xs=[326,532,738,944]
for label,y,cases in rows:
    c.setStrokeColor(line); c.setLineWidth(.7)
    c.line(42,y-72,W-42,y-72)
    actor(130,y,label)
    c.line(155,y,225,y)
    c.line(225,y,225,y-41)
    c.line(225,y-41,944,y-41)
    for x,case in zip(xs,cases):
        c.setStrokeColor(line); c.line(x,y-41,x,y-29)
        oval(x,y,case)

c.setFillColor(navy); c.setFont('Arial-Bold',10)
c.drawString(43,80,'Alcance:')
c.setFont('Arial',9)
c.drawString(95,80,'las funciones actuales se separan por cuenta; Contabilidad es una ampliación posterior a la rúbrica inicial.')
c.drawString(43,62,'La sincronización clínica usa Supabase; los movimientos contables permanecen locales y no se comparten entre equipos.')
c.drawString(43,44,'Las asociaciones indican qué funciones permite cada rol. La validación de permisos se realiza además en la capa de datos.')
c.setFillColor(teal); c.rect(0,0,W,10,stroke=0,fill=1)
c.save()
print(OUT)
