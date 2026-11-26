-- Reemplazar el catálogo de roles permite agregar Contable sin cambiar credenciales.
CREATE TABLE roles_new (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE CHECK(name IN ('Administrador','Enfermero','Fisioterapeuta','Contable'))
);
INSERT INTO roles_new(id,name) SELECT id,name FROM roles;
DROP TABLE roles;
ALTER TABLE roles_new RENAME TO roles;
INSERT INTO roles(id,name) VALUES('00000000-0000-4000-8000-000000000004','Contable');
UPDATE users SET role_id='00000000-0000-4000-8000-000000000004',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),version=version+1 WHERE username='wilson';

CREATE TABLE financial_entries(
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('cargo','cobro','gasto')),
  patient_id TEXT REFERENCES patients(id) ON DELETE RESTRICT,
  concept TEXT NOT NULL CHECK(length(trim(concept)) BETWEEN 1 AND 180),
  amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 1 AND 100000000),
  method TEXT NOT NULL CHECK(method IN ('Efectivo','Transferencia','Tarjeta','Otro')),
  occurred_at TEXT NOT NULL,
  reference TEXT NOT NULL DEFAULT '' CHECK(length(reference)<=100),
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  author_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  version INTEGER NOT NULL CHECK(version>0),
  CHECK((kind='gasto' AND patient_id IS NULL) OR (kind IN ('cargo','cobro') AND patient_id IS NOT NULL))
);
CREATE INDEX financial_patient_idx ON financial_entries(patient_id,occurred_at);
CREATE INDEX financial_kind_idx ON financial_entries(kind,deleted_at);
