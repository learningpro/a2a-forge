use sqlx::Row;

use crate::db::get_pool;
use crate::error::AppError;

#[tauri::command]
#[specta::specta]
pub async fn list_workspaces(
    app: tauri::AppHandle,
) -> Result<serde_json::Value, AppError> {
    let pool = get_pool(&app).await?;
    let rows = sqlx::query("SELECT id, name, created_at FROM workspaces ORDER BY created_at")
        .fetch_all(&pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    let mut results = Vec::with_capacity(rows.len());
    for row in rows {
        results.push(serde_json::json!({
            "id": row.try_get::<String, _>("id").map_err(|e| AppError::Database(e.to_string()))?,
            "name": row.try_get::<String, _>("name").map_err(|e| AppError::Database(e.to_string()))?,
            "createdAt": row.try_get::<i64, _>("created_at").map_err(|e| AppError::Database(e.to_string()))?,
        }));
    }

    Ok(serde_json::Value::Array(results))
}

#[tauri::command]
#[specta::specta]
pub async fn create_workspace(
    name: String,
    app: tauri::AppHandle,
) -> Result<serde_json::Value, AppError> {
    let pool = get_pool(&app).await?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    sqlx::query("INSERT INTO workspaces (id, name, created_at) VALUES (?, ?, ?)")
        .bind(&id)
        .bind(&name)
        .bind(now)
        .execute(&pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(serde_json::json!({
        "id": id,
        "name": name,
        "createdAt": now,
    }))
}

#[tauri::command]
#[specta::specta]
pub async fn delete_workspace(
    workspace_id: String,
    app: tauri::AppHandle,
) -> Result<(), AppError> {
    if workspace_id == "default" {
        return Err(AppError::Database("Cannot delete the default workspace".into()));
    }

    let pool = get_pool(&app).await?;
    sqlx::query("DELETE FROM workspaces WHERE id = ?")
        .bind(&workspace_id)
        .execute(&pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn set_active_workspace(
    workspace_id: String,
    app: tauri::AppHandle,
) -> Result<(), AppError> {
    let pool = get_pool(&app).await?;
    let row = sqlx::query("SELECT id FROM workspaces WHERE id = ?")
        .bind(&workspace_id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    if row.is_none() {
        return Err(AppError::NotFound(format!(
            "Workspace {workspace_id} not found"
        )));
    }

    Ok(())
}
