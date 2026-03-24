use std::collections::HashMap;
use std::time::Duration;

use crate::error::AppError;

pub async fn send_task_rpc(
    client: &reqwest::Client,
    agent_url: &str,
    payload: &serde_json::Value,
    auth_header: Option<&str>,
    extra_headers: Option<&HashMap<String, String>>,
    timeout_secs: u64,
) -> Result<serde_json::Value, AppError> {
    let url = format!("{}", agent_url.trim_end_matches('/'));

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

pub fn build_sse_request(
    client: &reqwest::Client,
    agent_url: &str,
    payload: &serde_json::Value,
    auth_header: Option<&str>,
    extra_headers: Option<&HashMap<String, String>>,
) -> reqwest::RequestBuilder {
    let url = format!("{}", agent_url.trim_end_matches('/'));

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
