use sqlx::Row;

use crate::db::get_pool;
use crate::error::AppError;

#[tauri::command]
#[specta::specta]
pub async fn get_settings(
    app: tauri::AppHandle,
) -> Result<serde_json::Value, AppError> {
    let pool = get_pool(&app).await?;
    let rows = sqlx::query("SELECT key, value FROM settings")
        .fetch_all(&pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    let mut map = serde_json::Map::new();
    for row in rows {
        let key: String = row
            .try_get("key")
            .map_err(|e| AppError::Database(e.to_string()))?;
        let value_str: String = row
            .try_get("value")
            .map_err(|e| AppError::Database(e.to_string()))?;
        let value: serde_json::Value =
            serde_json::from_str(&value_str).unwrap_or(serde_json::Value::String(value_str));
        map.insert(key, value);
    }

    Ok(serde_json::Value::Object(map))
}

#[tauri::command]
#[specta::specta]
pub async fn save_setting(
    key: String,
    value: String,
    app: tauri::AppHandle,
) -> Result<(), AppError> {
    let pool = get_pool(&app).await?;
    sqlx::query("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
        .bind(&key)
        .bind(&value)
        .execute(&pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_data_path(
    app: tauri::AppHandle,
) -> Result<String, AppError> {
    let path = tauri::Manager::path(&app)
        .app_data_dir()
        .map_err(|e| AppError::Io(e.to_string()))?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_data_path(
    path: String,
    app: tauri::AppHandle,
) -> Result<(), AppError> {
    let pool = get_pool(&app).await?;
    sqlx::query("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
        .bind("data_path")
        .bind(&serde_json::to_string(&path).unwrap_or_else(|_| path))
        .execute(&pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;
    Ok(())
}
