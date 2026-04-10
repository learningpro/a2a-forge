use std::collections::HashMap;

use futures::StreamExt;
use reqwest_eventsource::{Event, EventSource};
use tauri::ipc::Channel;

use crate::a2a::client;
use crate::a2a::types::TaskEvent;
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
#[specta::specta]
pub async fn send_task(
    agent_url: String,
    payload: serde_json::Value,
    auth_header: Option<String>,
    extra_headers: Option<HashMap<String, String>>,
    timeout_secs: Option<u32>,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, AppError> {
    let timeout = timeout_secs.unwrap_or(30) as u64;
    let resp = client::send_task_rpc(
        &state.http_client,
        &agent_url,
        &payload,
        auth_header.as_deref(),
        extra_headers.as_ref(),
        timeout,
    )
    .await?;
    Ok(resp)
}

#[tauri::command]
#[specta::specta]
pub async fn stream_task(
    agent_url: String,
    payload: serde_json::Value,
    auth_header: Option<String>,
    extra_headers: Option<HashMap<String, String>>,
    on_event: Channel<TaskEvent>,
    state: tauri::State<'_, AppState>,
) -> Result<String, AppError> {
    let task_id = uuid::Uuid::new_v4().to_string();

    let req = client::build_sse_request(
        &state.http_client,
        &agent_url,
        &payload,
        auth_header.as_deref(),
        extra_headers.as_ref(),
    );

    let mut es = EventSource::new(req)
        .map_err(|e| AppError::Http(format!("Failed to create EventSource: {e}")))?;

    let task_id_for_spawn = task_id.clone();
    let task_id_for_insert = task_id.clone();
    let active_tasks = state.active_tasks.clone();
    let handle = tokio::spawn(async move {
        while let Some(event) = es.next().await {
            match event {
                Ok(Event::Open) => {}
                Ok(Event::Message(msg)) => {
                    let raw: serde_json::Value =
                        serde_json::from_str(&msg.data).unwrap_or_else(|_| {
                            serde_json::json!({ "raw": msg.data })
                        });

                    let status = raw.get("result")
                        .and_then(|r| r.get("status"))
                        .and_then(|s| serde_json::from_value(s.clone()).ok());

                    let artifact = raw.get("result")
                        .and_then(|r| r.get("artifact"))
                        .cloned();

                    let id = raw.get("result")
                        .and_then(|r| r.get("id"))
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());

                    let task_event = TaskEvent {
                        id,
                        status,
                        artifact,
                        raw,
                    };

                    if on_event.send(task_event).is_err() {
                        es.close();
                        break;
                    }
                }
                Err(_) => {
                    es.close();
                    break;
                }
            }
        }
        // Clean up: remove this task from active_tasks when stream ends naturally
        active_tasks.lock().await.remove(&task_id_for_spawn);
    });

    let abort_handle = handle.abort_handle();
    state
        .active_tasks
        .lock()
        .await
        .insert(task_id_for_insert, abort_handle);

    Ok(task_id)
}

#[tauri::command]
#[specta::specta]
pub async fn cancel_task(
    task_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), AppError> {
    let mut tasks = state.active_tasks.lock().await;
    if let Some(handle) = tasks.remove(&task_id) {
        handle.abort();
    }
    Ok(())
}
