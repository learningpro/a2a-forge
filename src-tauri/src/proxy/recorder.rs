use serde::{Deserialize, Serialize};
use specta::Type;
use sqlx::SqlitePool;

use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TrafficRecord {
    pub id: String,
    pub session_name: String,
    pub agent_id: Option<String>,
    pub skill_name: Option<String>,
    pub request_json: String,
    pub response_json: Option<String>,
    pub status_code: Option<i32>,
    pub duration_ms: Option<i32>,
    pub timestamp: String,
    pub workspace_id: String,
}

/// Record a request/response pair.
pub async fn record_traffic(
    pool: &SqlitePool,
    session_name: &str,
    agent_id: Option<&str>,
    skill_name: Option<&str>,
    request_json: &str,
    response_json: Option<&str>,
    status_code: Option<i32>,
    duration_ms: Option<i32>,
    workspace_id: &str,
) -> Result<String, AppError> {
    let id = nanoid::nanoid!();
    sqlx::query(
        "INSERT INTO traffic_records (id, session_name, agent_id, skill_name, request_json, response_json, status_code, duration_ms, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(session_name)
    .bind(agent_id)
    .bind(skill_name)
    .bind(request_json)
    .bind(response_json)
    .bind(status_code)
    .bind(duration_ms)
    .bind(workspace_id)
    .execute(pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(id)
}

/// List distinct recording session names.
pub async fn list_sessions(
    pool: &SqlitePool,
    workspace_id: &str,
) -> Result<Vec<(String, i32)>, AppError> {
    let rows = sqlx::query_as::<_, (String, i32)>(
        "SELECT session_name, COUNT(*) as cnt FROM traffic_records WHERE workspace_id = ? GROUP BY session_name ORDER BY MAX(timestamp) DESC"
    )
    .bind(workspace_id)
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(rows)
}

/// Get all records for a session.
pub async fn get_session_records(
    pool: &SqlitePool,
    session_name: &str,
    workspace_id: &str,
) -> Result<Vec<TrafficRecord>, AppError> {
    let rows = sqlx::query_as::<_, (String, String, Option<String>, Option<String>, String, Option<String>, Option<i32>, Option<i32>, String, String)>(
        "SELECT id, session_name, agent_id, skill_name, request_json, response_json, status_code, duration_ms, timestamp, workspace_id FROM traffic_records WHERE session_name = ? AND workspace_id = ? ORDER BY timestamp"
    )
    .bind(session_name)
    .bind(workspace_id)
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(rows.into_iter().map(|r| TrafficRecord {
        id: r.0, session_name: r.1, agent_id: r.2, skill_name: r.3,
        request_json: r.4, response_json: r.5, status_code: r.6,
        duration_ms: r.7, timestamp: r.8, workspace_id: r.9,
    }).collect())
}

/// Delete all records for a session.
pub async fn delete_session(
    pool: &SqlitePool,
    session_name: &str,
    workspace_id: &str,
) -> Result<(), AppError> {
    sqlx::query("DELETE FROM traffic_records WHERE session_name = ? AND workspace_id = ?")
        .bind(session_name)
        .bind(workspace_id)
        .execute(pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;
    Ok(())
}
