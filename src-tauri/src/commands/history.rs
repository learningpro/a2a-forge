use sqlx::Row;

use crate::a2a::types::HistoryEntry;
use crate::db::get_pool;
use crate::error::AppError;

#[tauri::command]
#[specta::specta]
pub async fn save_history(
    agent_id: String,
    skill_name: String,
    request_json: String,
    response_json: Option<String>,
    status: String,
    duration_ms: Option<i32>,
    app: tauri::AppHandle,
) -> Result<String, AppError> {
    let pool = get_pool(&app).await?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    sqlx::query(
        "INSERT INTO history (id, agent_id, skill_name, request_json, response_json, status, duration_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&agent_id)
    .bind(&skill_name)
    .bind(&request_json)
    .bind(&response_json)
    .bind(&status)
    .bind(duration_ms)
    .bind(now)
    .execute(&pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(id)
}

#[tauri::command]
#[specta::specta]
pub async fn list_history(
    agent_id: Option<String>,
    search: Option<String>,
    limit: Option<i32>,
    app: tauri::AppHandle,
) -> Result<Vec<HistoryEntry>, AppError> {
    let pool = get_pool(&app).await?;
    let limit_val = limit.unwrap_or(100) as i64;

    let mut sql = String::from(
        "SELECT id, agent_id, skill_name, request_json, response_json, status, duration_ms, created_at FROM history WHERE 1=1",
    );
    let mut binds: Vec<String> = Vec::new();

    if let Some(ref aid) = agent_id {
        sql.push_str(" AND agent_id = ?");
        binds.push(aid.clone());
    }
    if let Some(ref s) = search {
        sql.push_str(" AND skill_name LIKE ?");
        binds.push(format!("%{s}%"));
    }
    sql.push_str(" ORDER BY created_at DESC LIMIT ?");

    let mut query = sqlx::query(&sql);
    for b in &binds {
        query = query.bind(b);
    }
    query = query.bind(limit_val);

    let rows = query
        .fetch_all(&pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    let mut results = Vec::with_capacity(rows.len());
    for row in rows {
        results.push(HistoryEntry {
            id: row.try_get::<String, _>("id").map_err(|e| AppError::Database(e.to_string()))?,
            agent_id: row.try_get::<String, _>("agent_id").map_err(|e| AppError::Database(e.to_string()))?,
            skill_name: row.try_get::<String, _>("skill_name").map_err(|e| AppError::Database(e.to_string()))?,
            request_json: row.try_get::<String, _>("request_json").map_err(|e| AppError::Database(e.to_string()))?,
            response_json: row.try_get::<Option<String>, _>("response_json").map_err(|e| AppError::Database(e.to_string()))?,
            status: row.try_get::<String, _>("status").map_err(|e| AppError::Database(e.to_string()))?,
            duration_ms: row.try_get::<Option<i32>, _>("duration_ms").map_err(|e| AppError::Database(e.to_string()))?,
            created_at: row.try_get::<i32, _>("created_at").map_err(|e| AppError::Database(e.to_string()))?,
        });
    }

    Ok(results)
}

#[tauri::command]
#[specta::specta]
pub async fn clear_history(
    agent_id: Option<String>,
    app: tauri::AppHandle,
) -> Result<(), AppError> {
    let pool = get_pool(&app).await?;

    if let Some(aid) = agent_id {
        sqlx::query("DELETE FROM history WHERE agent_id = ?")
            .bind(&aid)
            .execute(&pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;
    } else {
        sqlx::query("DELETE FROM history")
            .execute(&pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;
    }

    Ok(())
}
