use std::collections::HashMap;
use std::time::Duration;

use crate::error::AppError;

/// Low-level helper: POST a JSON-RPC payload to `{agent_url}/a2a` and return the parsed response.
async fn post_rpc(
    client: &reqwest::Client,
    agent_url: &str,
    payload: &serde_json::Value,
    auth_header: Option<&str>,
    extra_headers: Option<&HashMap<String, String>>,
    timeout_secs: u64,
) -> Result<serde_json::Value, AppError> {
    let url = format!("{}/a2a", agent_url.trim_end_matches('/'));

    let mut req = client
        .post(&url)
        .header("Content-Type", "application/json")
        .timeout(Duration::from_secs(timeout_secs))
        .json(payload);

    if let Some(auth) = auth_header {
        req = req.header("Authorization", auth);
    }

    if let Some(headers) = extra_headers {
        for (k, v) in headers {
            req = req.header(k.as_str(), v.as_str());
        }
    }

    let resp = req.send().await?;
    let status = resp.status();

    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(AppError::Http(format!("HTTP {status}: {body}")));
    }

    let json: serde_json::Value = resp.json().await?;
    Ok(json)
}

/// Returns the task state string from a JSON-RPC response, if present.
/// Handles both A2A standard format ({result: {status: {state: "..."}}})
/// and simpler format ({result: {status: "..."}}).
fn extract_task_state(resp: &serde_json::Value) -> Option<&str> {
    let result = resp.get("result")?;
    // Try A2A standard: result.status.state
    if let Some(state) = result.get("status").and_then(|s| s.get("state")).and_then(|v| v.as_str()) {
        return Some(state);
    }
    // Try simple: result.status (string directly)
    result.get("status").and_then(|v| v.as_str())
}

/// Send a task via JSON-RPC. If the response indicates the task is still in progress
/// (state = "submitted" or "working"), poll with tasks/get until it reaches a terminal state.
pub async fn send_task_rpc(
    client: &reqwest::Client,
    agent_url: &str,
    payload: &serde_json::Value,
    auth_header: Option<&str>,
    extra_headers: Option<&HashMap<String, String>>,
    timeout_secs: u64,
) -> Result<serde_json::Value, AppError> {
    let resp = post_rpc(client, agent_url, payload, auth_header, extra_headers, timeout_secs).await?;

    // Check if the task is async (state = submitted/working)
    let state = extract_task_state(&resp);
    match state {
        Some("submitted") | Some("working") | Some("pending") | Some("running") => {
            // Extract task ID for polling — try both "id" and "task_id"
            let task_id = resp
                .get("result")
                .and_then(|r| r.get("task_id").or_else(|| r.get("id")))
                .and_then(|v| v.as_str())
                .ok_or_else(|| {
                    AppError::Http("Async task response missing task ID for polling".into())
                })?
                .to_string();

            // Poll with tasks/get
            poll_task(client, agent_url, &task_id, auth_header, extra_headers, timeout_secs).await
        }
        _ => Ok(resp),
    }
}

/// Poll a task by ID using JSON-RPC tasks/get until it reaches a terminal state.
async fn poll_task(
    client: &reqwest::Client,
    agent_url: &str,
    task_id: &str,
    auth_header: Option<&str>,
    extra_headers: Option<&HashMap<String, String>>,
    timeout_secs: u64,
) -> Result<serde_json::Value, AppError> {
    let max_polls = 120; // max ~2 minutes with 1s interval
    let poll_interval = Duration::from_secs(1);

    for _ in 0..max_polls {
        tokio::time::sleep(poll_interval).await;

        let get_payload = serde_json::json!({
            "jsonrpc": "2.0",
            "method": "tasks/get",
            "params": { "task_id": task_id },
            "id": 1
        });

        let resp = post_rpc(client, agent_url, &get_payload, auth_header, extra_headers, timeout_secs).await?;

        match extract_task_state(&resp) {
            Some("submitted") | Some("working") | Some("pending") | Some("running") => continue,
            _ => return Ok(resp),
        }
    }

    Err(AppError::Http(format!(
        "Task {task_id} did not complete within polling timeout"
    )))
}

pub fn build_sse_request(
    client: &reqwest::Client,
    agent_url: &str,
    payload: &serde_json::Value,
    auth_header: Option<&str>,
    extra_headers: Option<&HashMap<String, String>>,
) -> reqwest::RequestBuilder {
    let url = format!("{}/a2a", agent_url.trim_end_matches('/'));

    let mut req = client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("Accept", "text/event-stream")
        .json(payload);

    if let Some(auth) = auth_header {
        req = req.header("Authorization", auth);
    }

    if let Some(headers) = extra_headers {
        for (k, v) in headers {
            req = req.header(k.as_str(), v.as_str());
        }
    }

    req
}
