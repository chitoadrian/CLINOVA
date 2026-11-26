"""Gantt de seguimiento: plan de cinco semanas y estado comprobable al 26/11/2026."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A3, landscape
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

OUT=Path(__file__).resolve().parent/'GANTT_ACTUALIZADO_26_NOV.pdf'
pdfmetrics.registerFont(TTFont('Arial',r'C:\Windows\Fonts\arial.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Bold',r'C:\Windows\Fonts\arialbd.ttf'))
W,H=landscape(A3)
c=canvas.Canvas(str(OUT),pagesize=(W,H));c.setTitle('CLINOVA - Gantt actualizado 26 de noviembre')
BLACK=colors.HexColor('#111111');GRAY=colors.HexColor('#4a4a4a');PALE=colors.HexColor('#f2f2f2');MID=colors.HexColor('#dedede')
c.setFillColor(BLACK);c.rect(0,H-90,W,90,fill=1,stroke=0)
c.setFillColor(colors.white);c.setFont('Arial-Bold',22);c.drawString(45,H-47,'CLINOVA  |  GANTT Y ESTADO REAL')
c.setFont('Arial',10);c.drawString(46,H-70,'Cinco semanas: 12/11–10/12/2026  ·  Corte: 26/11/2026  ·  Unidad Educativa Montepiedra')

cols=[(43,330),(375,130),(505,148),(653,65),(718,65),(783,65),(848,65),(913,65),(978,164)]
heads=['ACTIVIDAD','FECHA PLAN','RESPONSABLE','S1','S2','S3','S4','S5','ESTADO AL CORTE']
y=H-136;rh=38
c.setFillColor(BLACK);c.roundRect(43,y-28,W-86,30,5,fill=1,stroke=0)
c.setFillColor(colors.white);c.setFont('Arial-Bold',9)
for (x,_),head in zip(cols,heads):c.drawString(x+7,y-18,head)
rows=[
 ('Roles, Gantt, casos de uso','12/11','Jeshua · equipo','1','','','','','Hecho · PDF'),
 ('Base React/Tauri y repositorio','12/11','Jeshua · equipo','1','','','','','Hecho · GitHub'),
 ('DER, migraciones y datos locales','13–19/11','Wilson','','1','','','','Hecho · SQL/IDB'),
 ('Autenticación y permisos','16–19/11','Wilson · Jeshua','','1','','','','Hecho · pruebas'),
 ('Enfermería: triage, Kardex, camas','20–26/11','Adrian','','','1','','','Hecho · local'),
 ('Fisioterapia: evaluación y planes','20–26/11','Matias','','','1','','','Hecho · local'),
 ('Sync Engine y Supabase clínico','24–26/11','Wilson · Jeshua','','','1','','','Código; demo real por hacer'),
 ('DFD y exposición Semana 3','26/11','Todo el equipo','','','1','','','DFD listo; exposición pendiente'),
 ('QA interno y 500 fichas simuladas','27–30/11','Todo el equipo','','','','1','','Hecho adelantado · local'),
 ('Prueba cruzada con otro grupo','27–30/11','Todo el equipo','','','','1','','Pendiente · sin acta'),
 ('Manuales revisados y secuencias','01–03/12','Equipo','','','','1','','Borradores listos'),
 ('Instaladores Windows y Linux CI','02–03/12','Jeshua','','','','1','','Generados; instalación por probar'),
 ('Despliegue final y README','04–09/12','Jeshua · equipo','','','','','1','En curso · Web actualizable'),
 ('Defensa y demo final','10/12','Todo el equipo','','','','','1','Pendiente'),
]
for i,row in enumerate(rows):
 top=y-33-i*rh
 c.setFillColor(colors.white if i%2==0 else PALE);c.rect(43,top-rh,W-86,rh,fill=1,stroke=0)
 c.setStrokeColor(MID);c.line(43,top-rh,W-43,top-rh)
 activity,date,owner,*rest=row
 weeks=rest[:5];status=rest[5]
 c.setFillColor(BLACK);c.setFont('Arial-Bold',9.2);c.drawString(50,top-18,activity)
 c.setFont('Arial',8.6);c.drawString(382,top-18,date);c.drawString(512,top-18,owner)
 for j,active in enumerate(weeks):
  x=cols[3+j][0]+10
  c.setFillColor(BLACK if active else MID);c.roundRect(x,top-27,38,15,4,fill=1,stroke=0)
 c.setFillColor(GRAY);c.setFont('Arial',8.5)
 if len(status)>27:
  parts=status.split(' · ',1)
  c.drawString(985,top-16,parts[0])
  if len(parts)>1:c.drawString(985,top-28,'· '+parts[1])
 else:c.drawString(985,top-20,status)

note_y=72
c.setFillColor(BLACK);c.setFont('Arial-Bold',10);c.drawString(43,note_y+12,'Lectura honesta del avance')
c.setFont('Arial',8.8);c.setFillColor(GRAY)
c.drawString(43,note_y-5,'Barra negra = semana planificada; el estado de la derecha indica evidencia real al 26/11. La Contabilidad de Wilson es una ampliación posterior y sigue local.')
c.drawString(43,note_y-19,'La sincronización tiene código y proyecto Supabase; la demostración real entre equipos y la revisión cruzada requieren evidencia adicional.')
c.drawString(43,29,'Responsables: JS = Jeshua Sánchez Alcívar · WP = Wilson Pinela · AC = Adrian Chito Vargas · MM = Matias Muñiz.')
c.setFillColor(BLACK);c.rect(0,0,W,9,fill=1,stroke=0);c.save();print(OUT)
