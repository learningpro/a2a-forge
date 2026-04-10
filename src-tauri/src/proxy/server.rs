use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Instant;

use axum::{
    extract::State as AxumState,
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use specta::Type;
use sqlx::SqlitePool;
use tokio::sync::{Mutex, watch};

use crate::proxy::interceptor;
use crate::proxy::recorder;
use crate::proxy::registry;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ProxyStatus {
    pub running: bool,
    pub port: u16,
    pub request_count: i32,
}

/// Shared state for the proxy server.
pub struct ProxyState {
    pub pool: SqlitePool,
    pub client: reqwest::Client,
    pub workspace_id: String,
    pub recording_session: Mutex<Option<String>>,
    pub request_count: Mutex<i32>,
}

/// Handle for controlling the proxy server lifecycle.
pub struct ProxyHandle {
    pub shutdown_tx: watch::Sender<bool>,
    pub port: u16,
    pub state: Arc<ProxyState>,
}

/// Start the proxy server on the given port. Returns a handle to stop it.
pub async fn start_server(
    pool: SqlitePool,
    client: reqwest::Client,
    workspace_id: String,
    port: u16,
) -> Result<ProxyHandle, crate::error::AppError> {
    let state = Arc::new(ProxyState {
        pool,
        client,
        workspace_id,
        recording_session: Mutex::new(None),
        request_count: Mutex::new(0),
    });

    let app = Router::new()
        .route("/.well-known/agent.json", get(handle_agent_card))
        .route("/a2a", post(handle_a2a_proxy))
        .route("/proxy/status", get(handle_status))
        .with_state(state.clone());

    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .map_err(|e| crate::error::AppError::Io(format!("Failed to bind port {port}: {e}")))?;

    let (shutdown_tx, mut shutdown_rx) = watch::channel(false);

    tokio::spawn(async move {
        axum::serve(listener, app)
            .with_graceful_shutdown(async move {
                while shutdown_rx.changed().await.is_ok() {
                    if *shutdown_rx.borrow() {
                        break;
                    }
                }
            })
            .await
            .ok();
    });

    Ok(ProxyHandle { shutdown_tx, port, state })
}

/// GET /.well-known/agent.json — aggregated agent card
async fn handle_agent_card(
    AxumState(state): AxumState<Arc<ProxyState>>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let card = registry::build_aggregated_card(&state.pool, &state.workspace_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(card))
}

/// POST /a2a — proxy forward with interception
async fn handle_a2a_proxy(
    AxumState(state): AxumState<Arc<ProxyState>>,
    axum::extract::Json(mut payload): axum::extract::Json<serde_json::Value>,
) -> Result<(StatusCode, Json<serde_json::Value>), StatusCode> {
    let start = Instant::now();

    // Increment request count
    {
        let mut count = state.request_count.lock().await;
        *count += 1;
    }

    // Extract skill_id and method for rule matching
    let skill_id = payload
        .get("params")
        .and_then(|p| p.get("skill_id"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let method = payload
        .get("method")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    // Resolve target agent
    let (agent_id, agent_url) = registry::resolve_agent_url(&state.pool, &state.workspace_id, &payload)
        .await
        .map_err(|_| StatusCode::BAD_GATEWAY)?;

    // Load and apply intercept rules
    let rules = interceptor::load_rules(&state.pool, &state.workspace_id)
        .await
        .unwrap_or_default();

    let intercepted = interceptor::apply_request_rules(&rules, &agent_id, &skill_id, &method, &mut payload)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // If a rule returned a direct response (mock/error), use it
    if let Some((status, body)) = intercepted {
        let duration_ms = start.elapsed().as_millis() as i32;

        // Record if recording
        maybe_record(&state, &agent_id, &skill_id, &payload, Some(&body), Some(status as i32), Some(duration_ms)).await;

        let status_code = StatusCode::from_u16(status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Ok((status_code, Json(body)));
    }

    // Extract proxy headers if injected by modify_request rule
    let proxy_headers: Option<std::collections::HashMap<String, String>> = payload
        .as_object_mut()
        .and_then(|obj| obj.remove("_proxyHeaders"))
        .and_then(|v| serde_json::from_value(v).ok());

    // Load per-agent default headers from secure credential storage
    let agent_headers: Option<std::collections::HashMap<String, String>> = crate::credentials::get_agent_headers(&agent_id).await;

    // Merge headers: agent defaults + proxy rule headers
    let mut extra_headers = agent_headers.unwrap_or_default();
    if let Some(ph) = proxy_headers {
        extra_headers.extend(ph);
    }

    // Forward to real agent
    let url = format!("{}/a2a", agent_url.trim_end_matches('/'));
    let mut req = state.client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&payload);

    for (k, v) in &extra_headers {
        req = req.header(k.as_str(), v.as_str());
    }

    let result = req.send().await;
    let duration_ms = start.elapsed().as_millis() as i32;

    match result {
        Ok(resp) => {
            let status = resp.status().as_u16();
            let mut body: serde_json::Value = resp.json().await.unwrap_or(serde_json::json!({"error": "Failed to parse response"}));

            // Apply response rules
            interceptor::apply_response_rules(&rules, &agent_id, &skill_id, &method, &mut body);

            // Record if recording
            maybe_record(&state, &agent_id, &skill_id, &payload, Some(&body), Some(status as i32), Some(duration_ms)).await;

            let status_code = StatusCode::from_u16(status).unwrap_or(StatusCode::OK);
            Ok((status_code, Json(body)))
        }
        Err(e) => {
            let error_body = serde_json::json!({"error": e.to_string()});
            maybe_record(&state, &agent_id, &skill_id, &payload, Some(&error_body), Some(502), Some(duration_ms)).await;
            Ok((StatusCode::BAD_GATEWAY, Json(error_body)))
        }
    }
}

/// GET /proxy/status
async fn handle_status(
    AxumState(state): AxumState<Arc<ProxyState>>,
) -> Json<serde_json::Value> {
    let count = *state.request_count.lock().await;
    let recording = state.recording_session.lock().await.clone();
    Json(serde_json::json!({
        "running": true,
        "requestCount": count,
        "recording": recording,
    }))
}

/// Helper: record traffic if a recording session is active.
async fn maybe_record(
    state: &ProxyState,
    agent_id: &str,
    skill_name: &str,
    request: &serde_json::Value,
    response: Option<&serde_json::Value>,
    status_code: Option<i32>,
    duration_ms: Option<i32>,
) {
    let session = state.recording_session.lock().await.clone();
    if let Some(session_name) = session {
        let req_str = serde_json::to_string(request).unwrap_or_default();
        let resp_str = response.map(|r| serde_json::to_string(r).unwrap_or_default());
        let _ = recorder::record_traffic(
            &state.pool,
            &session_name,
            Some(agent_id),
            Some(skill_name),
            &req_str,
            resp_str.as_deref(),
            status_code,
            duration_ms,
            &state.workspace_id,
        )
        .await;
    }
}
