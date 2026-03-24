use sqlx::Row;

use crate::db::get_pool;
use crate::error::AppError;

#[tauri::command]
#[specta::specta]
pub async fn save_test(
    name: String,
    agent_id: String,
    skill_name: String,
    request_json: String,
    app: tauri::AppHandle,
) -> Result<String, AppError> {
    let pool = get_pool(&app).await?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    sqlx::query(
        "INSERT INTO saved_tests (id, name, agent_id, skill_name, request_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&name)
    .bind(&agent_id)
    .bind(&skill_name)
    .bind(&request_json)
    .bind(now)
    .execute(&pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(id)
}

#[tauri::command]
#[specta::specta]
pub async fn list_saved_tests(
    agent_id: Option<String>,
    skill_name: Option<String>,
    app: tauri::AppHandle,
) -> Result<serde_json::Value, AppError> {
    let pool = get_pool(&app).await?;

    let mut sql = String::from(
        "SELECT id, name, agent_id, skill_name, request_json, created_at FROM saved_tests WHERE 1=1",
    );
    let mut binds: Vec<String> = Vec::new();

    if let Some(ref aid) = agent_id {
        sql.push_str(" AND agent_id = ?");
        binds.push(aid.clone());
    }
    if let Some(ref sn) = skill_name {
        sql.push_str(" AND skill_name = ?");
        binds.push(sn.clone());
    }
    sql.push_str(" ORDER BY created_at DESC");

    let mut query = sqlx::query(&sql);
    for b in &binds {
        query = query.bind(b);
    }

    let rows = query
        .fetch_all(&pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    let mut results = Vec::with_capacity(rows.len());
    for row in rows {
        results.push(serde_json::json!({
            "id": row.try_get::<String, _>("id").map_err(|e| AppError::Database(e.to_string()))?,
            "name": row.try_get::<String, _>("name").map_err(|e| AppError::Database(e.to_string()))?,
            "agentId": row.try_get::<String, _>("agent_id").map_err(|e| AppError::Database(e.to_string()))?,
            "skillName": row.try_get::<String, _>("skill_name").map_err(|e| AppError::Database(e.to_string()))?,
            "requestJson": row.try_get::<String, _>("request_json").map_err(|e| AppError::Database(e.to_string()))?,
            "createdAt": row.try_get::<i64, _>("created_at").map_err(|e| AppError::Database(e.to_string()))?,
        }));
    }

    Ok(serde_json::Value::Array(results))
}

#[tauri::command]
#[specta::specta]
pub async fn delete_saved_test(
    test_id: String,
    app: tauri::AppHandle,
) -> Result<(), AppError> {
    let pool = get_pool(&app).await?;
    sqlx::query("DELETE FROM saved_tests WHERE id = ?")
        .bind(&test_id)
        .execute(&pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;
    Ok(())
}
