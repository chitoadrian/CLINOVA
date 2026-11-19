mod clinic;
use std::sync::Mutex;
use tauri::Manager;

#[tauri::command]
fn clinic_request(op: String, payload: serde_json::Value, token: String, state: tauri::State<'_, Mutex<clinic::Clinic>>) -> Result<serde_json::Value, String> {
    state.lock().map_err(|_| "No se pudo acceder a la base local".to_string())?.request(&op, payload, &token)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let directory = app.path().app_data_dir()?;
            std::fs::create_dir_all(&directory)?;
            let clinic = clinic::Clinic::open(&directory.join("clinova.sqlite3"))
                .map_err(std::io::Error::other)?;
            app.manage(Mutex::new(clinic));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![clinic_request])
        .run(tauri::generate_context!())
        .expect("No se pudo iniciar CLINOVA");
}
