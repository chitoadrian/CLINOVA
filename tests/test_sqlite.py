"""Comprobación básica de los SQL reales entregados; no sustituye a ejecutar Tauri."""
import sqlite3, pathlib, uuid, json
root=pathlib.Path(__file__).resolve().parents[1]
db=sqlite3.connect(':memory:');db.execute('PRAGMA foreign_keys=ON')
db.execute('CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)')
def migrate():
    for version,script in enumerate(sorted((root/'src-tauri/migrations').glob('*.sql')),1):
        if not db.execute('SELECT 1 FROM schema_migrations WHERE version=?',(version,)).fetchone():
            if version==7: db.execute('PRAGMA foreign_keys=OFF')
            db.executescript('BEGIN IMMEDIATE;\n'+script.read_text(encoding='utf-8')+f"\nINSERT INTO schema_migrations VALUES({version},'2026-11-06T00:00:00Z');\nCOMMIT;")
            if version==7: db.execute('PRAGMA foreign_keys=ON')
migrations=sorted((root/'src-tauri/migrations').glob('*.sql'))
migrate();migrate();assert db.execute('SELECT count(*) FROM schema_migrations').fetchone()[0]==len(migrations)
assert db.execute('SELECT count(*) FROM users').fetchone()[0]==4
assert db.execute('SELECT count(*) FROM credentials').fetchone()[0]==4
def add(table,fields):
    db.execute(f"INSERT INTO {table}({','.join(fields)}) VALUES({','.join('?' for _ in fields)})",tuple(fields.values()))
def stamp():return dict(id=str(uuid.uuid4()),created_at='2026-11-06T00:00:00Z',updated_at='2026-11-06T00:00:00Z',deleted_at=None,version=1)
def reject(fn):
    try:fn()
    except sqlite3.IntegrityError:return
    raise AssertionError('La restricción no se aplicó')
u=dict(**stamp(),username='admin',name='Administrador prueba',role_id='00000000-0000-4000-8000-000000000001',active=1);add('users',u)
reject(lambda:add('users',dict(**stamp(),username='admin',name='Duplicado',role_id=u['role_id'],active=1)))
reject(lambda:add('users',dict(**stamp(),username='otro',name='Rol inválido',role_id='no-existe',active=1)))
p=dict(**stamp(),name='Paciente prueba',age=34,area='Enfermería',reason='Prueba local',status='En espera');add('patients',p)
reject(lambda:add('patients',{**p,'id':str(uuid.uuid4()),'age':-1}))
e=dict(**stamp(),patient_id=p['id'],author_id=u['id'],author_name=u['name'],kind='Enfermería');add('encounters',e)
v=dict(**stamp(),encounter_id=e['id'],temperature=36.5,pulse=72,systolic=120,diastolic=80,spo2=98);add('vital_signs',v)
add('triage',dict(**stamp(),encounter_id=e['id'],vital_id=v['id'],priority='Verde',notes='Datos ficticios'))
reject(lambda:db.execute('DELETE FROM patients WHERE id=?',(p['id'],)))
db.execute('UPDATE patients SET age=35,version=version+1 WHERE id=?',(p['id'],));assert db.execute('SELECT age FROM patients WHERE id=?',(p['id'],)).fetchone()[0]==35
db.execute("UPDATE patients SET deleted_at='2026-11-06T01:00:00Z',version=version+1 WHERE id=?",(p['id'],));assert db.execute('SELECT count(*) FROM encounters').fetchone()[0]==1
db.commit();db.execute('BEGIN');db.execute("INSERT INTO medications(id,name,presentation,active,created_at,updated_at,version) VALUES('test','Ejemplo','Tableta',1,'2026-11-06','2026-11-06',1)");db.rollback();assert db.execute('SELECT count(*) FROM medications').fetchone()[0]==0
assert not db.execute('PRAGMA foreign_key_check').fetchall()
bed=dict(**stamp(),kind='bed',area='Enfermería',patient_id=None,reference_id=None,details=json.dumps({'code':'QA-01','ward':'Sala QA','state':'Disponible'}),author='QA')
add('clinical_items',bed)
reject(lambda:add('clinical_items',{**bed,'id':str(uuid.uuid4())}))
admission=dict(**stamp(),kind='admission',area='Enfermería',patient_id=p['id'],reference_id=bed['id'],details=json.dumps({'admitted_at':'2026-11-17T10:00','reason':'Ensayo SQL','discharged_at':''}),author='QA')
add('clinical_items',admission)
reject(lambda:add('clinical_items',{**admission,'id':str(uuid.uuid4())}))
db.execute('UPDATE clinical_items SET details=? WHERE id=?',(json.dumps({'admitted_at':'2026-11-17T10:00','reason':'Ensayo SQL','discharged_at':'2026-11-17T11:00'}),admission['id']))
add('clinical_items',{**admission,'id':str(uuid.uuid4())})
print(f'OK: {len(migrations)} migraciones idempotentes; 4 cuentas preservadas; PK/FK/UNIQUE/CHECK; CRUD; baja lógica; transacción y rollback.')
print('OK: código de cama único, ingreso activo único y reutilización de cama después del alta.')
print('SQLite',sqlite3.sqlite_version,'| Tauri/Rust: no ejecutado en esta comprobación.')
