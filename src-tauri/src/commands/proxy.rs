use crate::db::get_pool;
use crate::error::AppError;
use crate::proxy::interceptor::{self, InterceptRule};
use crate::proxy::recorder::{self, TrafficRecord};
use crate::proxy::server::{self, ProxyStatus};
use crate::state::AppState;

use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct RecordingSession {
    pub name: String,
    pub count: i32,
}

// --- Proxy Server Control ---

#[tauri::command]
#[specta::specta]
pub async fn start_proxy(
    port: Option<u16>,
    workspace_id: String,
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<ProxyStatus, AppError> {
    let p = port.unwrap_or(crate::proxy::DEFAULT_PROXY_PORT);

    // Hold lock for entire operation to prevent concurrent start race
    let mut guard = state.proxy_handle.lock().await;
    if guard.is_some() {
        return Err(AppError::Io("Proxy is already running".into()));
    }

    let pool = get_pool(&app).await?;
    let handle = server::start_server(pool, state.http_client.clone(), workspace_id, p).await?;

    let initial_count = *handle.state.request_count.lock().await;

    *guard = Some(handle);

    Ok(ProxyStatus { running: true, port: p, request_count: initial_count })
}

#[tauri::command]
#[specta::specta]
pub async fn stop_proxy(
    state: tauri::State<'_, AppState>,
) -> Result<(), AppError> {
    let mut guard = state.proxy_handle.lock().await;
    if let Some(handle) = guard.take() {
        let _ = handle.shutdown_tx.send(true);
    }
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_proxy_status(
    state: tauri::State<'_, AppState>,
) -> Result<ProxyStatus, AppError> {
    let guard = state.proxy_handle.lock().await;
    match &*guard {
        Some(handle) => {
            let count = *handle.state.request_count.lock().await;
            Ok(ProxyStatus { running: true, port: handle.port, request_count: count })
        }
        None => Ok(ProxyStatus { running: false, port: 0, request_count: 0 }),
    }
}

// --- Intercept Rules ---

#[tauri::command]
#[specta::specta]
pub async fn create_rule(
    name: String,
    match_type: String,
    match_value: String,
    action_type: String,
    action_json: String,
    priority: Option<i32>,
    workspace_id: String,
    app: tauri::AppHandle,
) -> Result<InterceptRule, AppError> {
    let pool = get_pool(&app).await?;
    let id = nanoid::nanoid!();
    let prio = priority.unwrap_or(0);

    sqlx::query(
        "INSERT INTO intercept_rules (id, name, match_type, match_value, action_type, action_json, priority, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id).bind(&name).bind(&match_type).bind(&match_value)
    .bind(&action_type).bind(&action_json).bind(prio).bind(&workspace_id)
    .execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;

    let row = sqlx::query_as::<_, (String, String, bool, String, String, String, String, i32, String, String)>(
        "SELECT id, name, enabled, match_type, match_value, action_type, action_json, priority, workspace_id, created_at FROM intercept_rules WHERE id = ?"
    )
    .bind(&id).fetch_one(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;

    Ok(InterceptRule {
        id: row.0, name: row.1, enabled: row.2, match_type: row.3, match_value: row.4,
        action_type: row.5, action_json: row.6, priority: row.7, workspace_id: row.8, created_at: row.9,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn update_rule(
    id: String,
    name: Option<String>,
    match_type: Option<String>,
    match_value: Option<String>,
    action_type: Option<String>,
    action_json: Option<String>,
    priority: Option<i32>,
    app: tauri::AppHandle,
) -> Result<(), AppError> {
    let pool = get_pool(&app).await?;
    if let Some(v) = name { sqlx::query("UPDATE intercept_rules SET name = ? WHERE id = ?").bind(&v).bind(&id).execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?; }
    if let Some(v) = match_type { sqlx::query("UPDATE intercept_rules SET match_type = ? WHERE id = ?").bind(&v).bind(&id).execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?; }
    if let Some(v) = match_value { sqlx::query("UPDATE intercept_rules SET match_value = ? WHERE id = ?").bind(&v).bind(&id).execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?; }
    if let Some(v) = action_type { sqlx::query("UPDATE intercept_rules SET action_type = ? WHERE id = ?").bind(&v).bind(&id).execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?; }
    if let Some(v) = action_json { sqlx::query("UPDATE intercept_rules SET action_json = ? WHERE id = ?").bind(&v).bind(&id).execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?; }
    if let Some(v) = priority { sqlx::query("UPDATE intercept_rules SET priority = ? WHERE id = ?").bind(v).bind(&id).execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?; }
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn delete_rule(id: String, app: tauri::AppHandle) -> Result<(), AppError> {
    let pool = get_pool(&app).await?;
    sqlx::query("DELETE FROM intercept_rules WHERE id = ?").bind(&id).execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn list_rules(workspace_id: String, app: tauri::AppHandle) -> Result<Vec<InterceptRule>, AppError> {
    let pool = get_pool(&app).await?;
    interceptor::load_rules(&pool, &workspace_id).await
}

#[tauri::command]
#[specta::specta]
pub async fn toggle_rule(id: String, enabled: bool, app: tauri::AppHandle) -> Result<(), AppError> {
    let pool = get_pool(&app).await?;
    sqlx::query("UPDATE intercept_rules SET enabled = ? WHERE id = ?").bind(enabled).bind(&id).execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;
    Ok(())
}

// --- Recording ---

#[tauri::command]
#[specta::specta]
pub async fn start_recording(
    session_name: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), AppError> {
    let guard = state.proxy_handle.lock().await;
    if let Some(handle) = &*guard {
        let mut session = handle.state.recording_session.lock().await;
        *session = Some(session_name);
    } else {
        // Fallback: store in AppState if proxy not running
        let mut session = state.recording_session.lock().await;
        *session = Some(session_name);
    }
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn stop_recording(
    state: tauri::State<'_, AppState>,
) -> Result<(), AppError> {
    let guard = state.proxy_handle.lock().await;
    if let Some(handle) = &*guard {
        let mut session = handle.state.recording_session.lock().await;
        *session = None;
    } else {
        let mut session = state.recording_session.lock().await;
        *session = None;
    }
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn list_recordings(
    workspace_id: String,
    app: tauri::AppHandle,
) -> Result<Vec<RecordingSession>, AppError> {
    let pool = get_pool(&app).await?;
    let sessions = recorder::list_sessions(&pool, &workspace_id).await?;
    Ok(sessions.into_iter().map(|(name, count)| RecordingSession { name, count }).collect())
}

#[tauri::command]
#[specta::specta]
pub async fn get_recording(
    session_name: String,
    workspace_id: String,
    app: tauri::AppHandle,
) -> Result<Vec<TrafficRecord>, AppError> {
    let pool = get_pool(&app).await?;
    recorder::get_session_records(&pool, &session_name, &workspace_id).await
}

#[tauri::command]
#[specta::specta]
pub async fn delete_recording(
    session_name: String,
    workspace_id: String,
    app: tauri::AppHandle,
) -> Result<(), AppError> {
    let pool = get_pool(&app).await?;
    recorder::delete_session(&pool, &session_name, &workspace_id).await
}

#[tauri::command]
#[specta::specta]
pub async fn replay_recording(
    session_name: String,
    workspace_id: String,
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<TrafficRecord>, AppError> {
    let pool = get_pool(&app).await?;
    let records = recorder::get_session_records(&pool, &session_name, &workspace_id).await?;

    let mut results = Vec::new();
    for record in &records {
        let payload: serde_json::Value = serde_json::from_str(&record.request_json)
            .map_err(|e| AppError::Serialization(format!("Invalid request JSON in recording: {e}")))?;

        // Resolve agent URL from the original agent_id
        let agent_url = if let Some(ref aid) = record.agent_id {
            sqlx::query_as::<_, (String,)>("SELECT url FROM agents WHERE id = ?")
                .bind(aid)
                .fetch_optional(&pool)
                .await
                .map_err(|e| AppError::Database(e.to_string()))?
                .map(|r| r.0)
        } else {
            None
        };

        if let Some(url) = agent_url {
            // Load agent default headers from secure credential storage
            let agent_headers = if let Some(ref aid) = record.agent_id {
                crate::credentials::get_agent_headers(aid).await
            } else {
                None
            };

            let start = std::time::Instant::now();
            let full_url = format!("{}/a2a", url.trim_end_matches('/'));
            let mut req = state.http_client
                .post(&full_url)
                .header("Content-Type", "application/json");

            // Apply agent default headers (auth, etc.)
            if let Some(headers) = &agent_headers {
                for (k, v) in headers {
                    req = req.header(k.as_str(), v.as_str());
                }
            }

            let resp = req.json(&payload).send().await;

            let duration_ms = start.elapsed().as_millis() as i32;

            match resp {
                Ok(r) => {
                    let status = r.status().as_u16() as i32;
                    let body_text = r.text().await.unwrap_or_default();
                    let response_json = if body_text.is_empty() { None } else { Some(body_text) };
                    results.push(TrafficRecord {
                        id: nanoid::nanoid!(),
                        session_name: format!("replay:{}", session_name),
                        agent_id: record.agent_id.clone(),
                        skill_name: record.skill_name.clone(),
                        request_json: record.request_json.clone(),
                        response_json,
                        status_code: Some(status),
                        duration_ms: Some(duration_ms),
                        timestamp: String::new(),
                        workspace_id: workspace_id.clone(),
                    });
                }
                Err(e) => {
                    results.push(TrafficRecord {
                        id: nanoid::nanoid!(),
                        session_name: format!("replay:{}", session_name),
                        agent_id: record.agent_id.clone(),
                        skill_name: record.skill_name.clone(),
                        request_json: record.request_json.clone(),
                        response_json: Some(serde_json::json!({"error": e.to_string()}).to_string()),
                        status_code: Some(502),
                        duration_ms: Some(duration_ms),
                        timestamp: "".into(),
                        workspace_id: workspace_id.clone(),
                    });
                }
            }
        }
    }

    Ok(results)
}
