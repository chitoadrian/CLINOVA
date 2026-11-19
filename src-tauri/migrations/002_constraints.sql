-- 002: índices de consulta y validación de pertenencia entre registros.
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_patients_area ON patients(area,deleted_at);
CREATE INDEX idx_encounters_patient ON encounters(patient_id,created_at);
CREATE INDEX idx_encounters_author ON encounters(author_id);
CREATE INDEX idx_orders_encounter ON medication_orders(encounter_id);
CREATE INDEX idx_orders_medication ON medication_orders(medication_id);
CREATE INDEX idx_legacy_patient ON legacy_records(patient_id);
CREATE TRIGGER triage_same_encounter BEFORE INSERT ON triage
WHEN NOT EXISTS(SELECT 1 FROM vital_signs v JOIN encounters e ON e.id=v.encounter_id WHERE v.id=NEW.vital_id AND v.encounter_id=NEW.encounter_id AND e.kind='Enfermería')
BEGIN SELECT RAISE(ABORT,'Triage y signos deben pertenecer a la misma atención de enfermería'); END;
CREATE TRIGGER plan_same_encounter BEFORE INSERT ON rehabilitation_plans
WHEN NOT EXISTS(SELECT 1 FROM evaluations v JOIN encounters e ON e.id=v.encounter_id WHERE v.id=NEW.evaluation_id AND v.encounter_id=NEW.encounter_id AND e.kind='Fisioterapia')
BEGIN SELECT RAISE(ABORT,'Plan y evaluación deben pertenecer a la misma atención de fisioterapia'); END;
