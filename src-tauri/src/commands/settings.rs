use crate::error::AppError;

#[tauri::command]
#[specta::specta]
pub async fn get_settings() -> Result<serde_json::Value, AppError> {
    Ok(serde_json::json!({"theme": "system", "timeout_seconds": 30, "proxy_url": null}))
}

#[tauri::command]
#[specta::specta]
pub async fn save_settings(
    key: String,
    value: String,
) -> Result<(), AppError> {
    // Phase 1 stub — will connect to SQLite in Phase 2
    let _ = (key, value);
    Ok(())
}
