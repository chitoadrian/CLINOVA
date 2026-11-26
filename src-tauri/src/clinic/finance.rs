use super::*;

fn require_accountant(actor:&J)->R<()>{if s(actor,"role_id")==ACCOUNTANT{Ok(())}else{Err("Solo Contabilidad puede operar movimientos.".into())}}
fn balance(c:&Connection,patient:&J,exclude:&J)->R<i64>{
 let row=one(c,"SELECT coalesce(sum(CASE WHEN kind='cargo' THEN amount_cents WHEN kind='cobro' THEN -amount_cents ELSE 0 END),0) AS balance FROM financial_entries WHERE patient_id=? AND deleted_at IS NULL AND id<>?",&[patient.clone(),json!(exclude.as_str().unwrap_or(""))])?;
 Ok(n(&row,"balance"))
}
fn check_input(c:&Connection,p:&J)->R<()>{
 let kind=s(p,"kind");
 if !["cargo","cobro","gasto"].contains(&kind)||!(1..=180).contains(&s(p,"concept").trim().chars().count())||!(1..=100000000).contains(&n(p,"amount_cents"))||!["Efectivo","Transferencia","Tarjeta","Otro"].contains(&s(p,"method"))||chrono::NaiveDate::parse_from_str(s(p,"occurred_at"),"%Y-%m-%d").is_err()||s(p,"reference").chars().count()>100{return Err("Revisa tipo, concepto, monto, método y fecha.".into());}
 if kind=="gasto"{if !p["patient_id"].is_null(){return Err("Un gasto no debe vincularse a un paciente.".into());}}
 else{let patient=one(c,"SELECT id FROM patients WHERE id=? AND deleted_at IS NULL",&[p["patient_id"].clone()])?;if patient.is_null(){return Err("Selecciona un paciente activo.".into());}}
 Ok(())
}
impl Clinic{
 pub(super) fn finance_list(&self,actor:&J)->R<J>{require_accountant(actor)?;Ok(json!(rows(&self.db,"SELECT * FROM financial_entries WHERE deleted_at IS NULL ORDER BY occurred_at DESC,created_at DESC",&[])?))}
 pub(super) fn finance_mutate(&self,op:&str,p:&J,actor:&J)->R<J>{
  require_accountant(actor)?;let c=&self.db;
  if op=="finance_save"{
   check_input(c,p)?;
   let old=if s(p,"id").is_empty(){J::Null}else{current(c,"financial_entries",p)?};
   if !old.is_null()&&(old["kind"]!=p["kind"]||old["patient_id"]!=p["patient_id"]){return Err("Tipo y paciente originales son inmutables.".into());}
   if s(p,"kind")!="gasto"{
    let mut next=balance(c,&p["patient_id"],&old["id"])?;
    next+=if s(p,"kind")=="cargo"{n(p,"amount_cents")}else{-n(p,"amount_cents")};
    if next<0{return Err("El cobro supera el saldo pendiente del paciente.".into());}
   }
   let fields=json!({"kind":p["kind"],"patient_id":p["patient_id"],"concept":s(p,"concept").trim(),"amount_cents":p["amount_cents"],"method":p["method"],"occurred_at":p["occurred_at"],"reference":s(p,"reference").trim(),"author_id":if old.is_null(){actor["id"].clone()}else{old["author_id"].clone()},"author_name":if old.is_null(){actor["name"].clone()}else{old["author_name"].clone()}});
   let entry=if old.is_null(){let v=with(stamp(),fields);insert(c,"financial_entries",&v)?;v}else{
    exec(c,"UPDATE financial_entries SET concept=?,amount_cents=?,method=?,occurred_at=?,reference=?,updated_at=?,version=version+1 WHERE id=?",&[fields["concept"].clone(),fields["amount_cents"].clone(),fields["method"].clone(),fields["occurred_at"].clone(),fields["reference"].clone(),json!(now()),old["id"].clone()])?;
    one(c,"SELECT * FROM financial_entries WHERE id=?",&[old["id"].clone()])?
   };
   return Ok(entry);
  }
  let old=current(c,"financial_entries",p)?;
  if s(&old,"kind")=="cargo"&&balance(c,&old["patient_id"],&old["id"])?<0{return Err("Ajusta los cobros antes de dar de baja el cargo.".into());}
  exec(c,"UPDATE financial_entries SET deleted_at=?,updated_at=?,version=version+1 WHERE id=?",&[json!(now()),json!(now()),old["id"].clone()])?;
  Ok(json!({"ok":true}))
 }
}
