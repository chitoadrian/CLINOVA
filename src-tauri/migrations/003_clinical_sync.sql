CREATE TABLE clinical_items(
 id TEXT PRIMARY KEY NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('bed','admission','kardex','routine','evolution')),
 area TEXT NOT NULL CHECK(area IN ('Enfermería','Fisioterapia')),
 patient_id TEXT REFERENCES patients(id),
 reference_id TEXT,
 details TEXT NOT NULL CHECK(json_valid(details)),
 author TEXT NOT NULL,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT,
 version INTEGER NOT NULL CHECK(version>0),
 CHECK((kind='bed' AND patient_id IS NULL) OR (kind<>'bed' AND patient_id IS NOT NULL))
);
CREATE INDEX clinical_patient_idx ON clinical_items(patient_id);
CREATE INDEX clinical_reference_idx ON clinical_items(reference_id);
CREATE UNIQUE INDEX beds_code_unique ON clinical_items(lower(json_extract(details,'$.code'))) WHERE kind='bed' AND deleted_at IS NULL;
CREATE UNIQUE INDEX active_bed_unique ON clinical_items(reference_id) WHERE kind='admission' AND deleted_at IS NULL AND coalesce(json_extract(details,'$.discharged_at'),'')='';
CREATE UNIQUE INDEX active_patient_unique ON clinical_items(patient_id) WHERE kind='admission' AND deleted_at IS NULL AND coalesce(json_extract(details,'$.discharged_at'),'')='';
CREATE TABLE sync_outbox(id TEXT PRIMARY KEY NOT NULL,document TEXT NOT NULL CHECK(json_valid(document)));
CREATE TABLE sync_state(id TEXT PRIMARY KEY NOT NULL,revision INTEGER NOT NULL CHECK(revision>=0));
CREATE TABLE sync_conflicts(id TEXT PRIMARY KEY NOT NULL,document TEXT NOT NULL CHECK(json_valid(document)));
CREATE TABLE sync_archive(id TEXT PRIMARY KEY NOT NULL,document TEXT NOT NULL CHECK(json_valid(document)),created_at TEXT NOT NULL);
