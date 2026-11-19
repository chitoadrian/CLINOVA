-- 001: estructura local inicial. El ejecutor aplica una transacción y registra la versión.
CREATE TABLE roles (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE CHECK(name IN ('Administrador','Enfermero','Fisioterapeuta'))
);

CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
  username TEXT NOT NULL UNIQUE CHECK(length(username) BETWEEN 3 AND 32 AND username=lower(username)),
  name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 2 AND 80),
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  active INTEGER NOT NULL CHECK(active IN(0,1))
);

CREATE TABLE credentials (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
  password_hash TEXT NOT NULL CHECK(length(password_hash)=64),
  salt TEXT NOT NULL CHECK(length(salt)=32),
  iterations INTEGER NOT NULL CHECK(iterations>=600000),
  failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK(failed_attempts>=0),
  locked_until INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE patients (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
  name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 2 AND 100),
  age INTEGER NOT NULL CHECK(age BETWEEN 0 AND 130),
  area TEXT NOT NULL CHECK(area IN('Enfermería','Fisioterapia')),
  reason TEXT NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 300),
  status TEXT NOT NULL CHECK(status IN('En espera','En atención','Alta')),
  legacy_id TEXT UNIQUE
);

CREATE TABLE encounters (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  author_name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN('Enfermería','Fisioterapia'))
);

CREATE TABLE vital_signs (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
  encounter_id TEXT NOT NULL UNIQUE REFERENCES encounters(id) ON DELETE RESTRICT,
  temperature REAL NOT NULL CHECK(temperature BETWEEN 25 AND 45),
  pulse INTEGER NOT NULL CHECK(pulse BETWEEN 20 AND 250),
  systolic INTEGER NOT NULL CHECK(systolic BETWEEN 40 AND 300),
  diastolic INTEGER NOT NULL CHECK(diastolic BETWEEN 20 AND 200 AND diastolic<systolic),
  spo2 INTEGER NOT NULL CHECK(spo2 BETWEEN 1 AND 100)
);

CREATE TABLE triage (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
  encounter_id TEXT NOT NULL UNIQUE REFERENCES encounters(id) ON DELETE RESTRICT,
  vital_id TEXT NOT NULL UNIQUE REFERENCES vital_signs(id) ON DELETE RESTRICT,
  priority TEXT NOT NULL CHECK(priority IN('Rojo','Naranja','Amarillo','Verde','Azul')),
  notes TEXT NOT NULL DEFAULT '' CHECK(length(notes)<=1000)
);

CREATE TABLE medications (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
  name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 100),
  presentation TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1))
);

CREATE TABLE medication_orders (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
  encounter_id TEXT NOT NULL REFERENCES encounters(id) ON DELETE RESTRICT,
  medication_id TEXT NOT NULL REFERENCES medications(id) ON DELETE RESTRICT,
  dose TEXT NOT NULL,
  route TEXT NOT NULL,
  frequency TEXT NOT NULL
);

CREATE TABLE evaluations (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
  encounter_id TEXT NOT NULL UNIQUE REFERENCES encounters(id) ON DELETE RESTRICT,
  region TEXT NOT NULL CHECK(region IN('Hombro','Codo','Muñeca','Cadera','Rodilla','Tobillo')),
  side TEXT NOT NULL CHECK(side IN('Derecha','Izquierda','Bilateral')),
  movement TEXT NOT NULL CHECK(length(trim(movement)) BETWEEN 1 AND 80),
  degrees REAL NOT NULL CHECK(degrees BETWEEN 0 AND 360),
  daniels INTEGER NOT NULL CHECK(daniels BETWEEN 0 AND 5),
  pain INTEGER NOT NULL CHECK(pain BETWEEN 0 AND 10)
);

CREATE TABLE rehabilitation_plans (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
  encounter_id TEXT NOT NULL UNIQUE REFERENCES encounters(id) ON DELETE RESTRICT,
  evaluation_id TEXT NOT NULL UNIQUE REFERENCES evaluations(id) ON DELETE RESTRICT,
  objective TEXT NOT NULL CHECK(length(trim(objective)) BETWEEN 1 AND 1000)
);

CREATE TABLE legacy_records (
  id TEXT PRIMARY KEY NOT NULL,
  source_id TEXT NOT NULL UNIQUE,
  patient_id TEXT REFERENCES patients(id) ON DELETE RESTRICT,
  document TEXT NOT NULL CHECK(json_valid(document))
);

CREATE TABLE meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

INSERT INTO roles(id,name) VALUES('00000000-0000-4000-8000-000000000001','Administrador');
INSERT INTO roles(id,name) VALUES('00000000-0000-4000-8000-000000000002','Enfermero');
INSERT INTO roles(id,name) VALUES('00000000-0000-4000-8000-000000000003','Fisioterapeuta');