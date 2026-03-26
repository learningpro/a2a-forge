use std::collections::HashMap;
use std::time::Instant;

use serde::{Deserialize, Serialize};
use specta::Type;

use crate::a2a::client::send_task_rpc;
use crate::db::get_pool;
use crate::error::AppError;
use crate::state::AppState;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct EnvVariable {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub value: String,
    pub is_secret: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct RequestChain {
    pub id: String,
    pub name: String,
    pub description: String,
    pub workspace_id: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ChainStep {
    pub id: String,
    pub chain_id: String,
    pub sort_order: i32,
    pub name: String,
    pub agent_id: String,
    pub skill_name: String,
    pub request_json: String,
    pub extract_json: String,
    pub timeout_ms: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ChainRunResult {
    pub chain_id: String,
    pub status: String,
    pub steps: Vec<ChainStepResult>,
    pub variables: HashMap<String, String>,
    pub duration_ms: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ChainStepResult {
    pub step_name: String,
    pub status: String,
    pub response_json: Option<String>,
    pub extracted: HashMap<String, String>,
    pub duration_ms: i32,
    pub error: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceExport {
    pub workspace_name: String,
    pub agents: Vec<serde_json::Value>,
    pub env_variables: Vec<serde_json::Value>,
    pub suites: Vec<serde_json::Value>,
    pub chains: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DiffResult {
    pub identical: bool,
    pub added: Vec<String>,
    pub removed: Vec<String>,
    pub changed: Vec<DiffChange>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DiffChange {
    pub path: String,
    pub old_value: String,
    pub new_value: String,
}

// --- Environment Variables ---

#[tauri::command]
#[specta::specta]
pub async fn list_env_vars(workspace_id: String, app: tauri::AppHandle) -> Result<Vec<EnvVariable>, AppError> {
    let pool = get_pool(&app).await?;
    let rows = sqlx::query_as::<_, (String, String, String, String, bool, String)>(
        "SELECT id, workspace_id, name, value, is_secret, created_at FROM env_variables WHERE workspace_id = ? ORDER BY name"
    ).bind(&workspace_id).fetch_all(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;

    Ok(rows.into_iter().map(|r| EnvVariable {
        id: r.0, workspace_id: r.1, name: r.2,
        value: if r.4 { "********".into() } else { r.3 },
        is_secret: r.4, created_at: r.5,
    }).collect())
}

#[tauri::command]
#[specta::specta]
pub async fn set_env_var(
    workspace_id: String, name: String, value: String, is_secret: Option<bool>,
    app: tauri::AppHandle,
) -> Result<EnvVariable, AppError> {
    let pool = get_pool(&app).await?;
    let id = nanoid::nanoid!();
    let secret = is_secret.unwrap_or(false);

    sqlx::query(
        "INSERT OR REPLACE INTO env_variables (id, workspace_id, name, value, is_secret) VALUES (?, ?, ?, ?, ?)"
    ).bind(&id).bind(&workspace_id).bind(&name).bind(&value).bind(secret)
    .execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;

    Ok(EnvVariable {
        id, workspace_id, name,
        value: if secret { "********".into() } else { value },
        is_secret: secret, created_at: String::new(),
    })
}

#[tauri::command]
#[specta::specta]
pub async fn delete_env_var(id: String, app: tauri::AppHandle) -> Result<(), AppError> {
    let pool = get_pool(&app).await?;
    sqlx::query("DELETE FROM env_variables WHERE id = ?").bind(&id).execute(&pool).await
        .map_err(|e| AppError::Database(e.to_string()))?;
    Ok(())
}

// --- Request Chains ---

#[tauri::command]
#[specta::specta]
pub async fn create_chain(
    name: String, description: Option<String>, workspace_id: String,
    app: tauri::AppHandle,
) -> Result<RequestChain, AppError> {
    let pool = get_pool(&app).await?;
    let id = nanoid::nanoid!();
    let desc = description.unwrap_or_default();

    sqlx::query("INSERT INTO request_chains (id, name, description, workspace_id) VALUES (?, ?, ?, ?)")
        .bind(&id).bind(&name).bind(&desc).bind(&workspace_id)
        .execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;

    Ok(RequestChain { id, name, description: desc, workspace_id, created_at: String::new() })
}

#[tauri::command]
#[specta::specta]
pub async fn update_chain(
    id: String, name: Option<String>, description: Option<String>,
    app: tauri::AppHandle,
) -> Result<(), AppError> {
    let pool = get_pool(&app).await?;
    if let Some(n) = name {
        sqlx::query("UPDATE request_chains SET name = ? WHERE id = ?").bind(&n).bind(&id)
            .execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;
    }
    if let Some(d) = description {
        sqlx::query("UPDATE request_chains SET description = ? WHERE id = ?").bind(&d).bind(&id)
            .execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;
    }
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn delete_chain(id: String, app: tauri::AppHandle) -> Result<(), AppError> {
    let pool = get_pool(&app).await?;
    sqlx::query("DELETE FROM request_chains WHERE id = ?").bind(&id).execute(&pool).await
        .map_err(|e| AppError::Database(e.to_string()))?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn list_chains(workspace_id: String, app: tauri::AppHandle) -> Result<Vec<RequestChain>, AppError> {
    let pool = get_pool(&app).await?;
    let rows = sqlx::query_as::<_, (String, String, String, String, String)>(
        "SELECT id, name, description, workspace_id, created_at FROM request_chains WHERE workspace_id = ? ORDER BY created_at DESC"
    ).bind(&workspace_id).fetch_all(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;

    Ok(rows.into_iter().map(|r| RequestChain {
        id: r.0, name: r.1, description: r.2, workspace_id: r.3, created_at: r.4,
    }).collect())
}

#[tauri::command]
#[specta::specta]
pub async fn add_chain_step(
    chain_id: String, name: String, agent_id: String, skill_name: String,
    request_json: String, extract_json: Option<String>, timeout_ms: Option<i32>,
    app: tauri::AppHandle,
) -> Result<ChainStep, AppError> {
    let pool = get_pool(&app).await?;
    let id = nanoid::nanoid!();
    let extract = extract_json.unwrap_or_else(|| "{}".into());
    let timeout = timeout_ms.unwrap_or(60000);

    let max_order: i32 = sqlx::query_as::<_, (i32,)>(
        "SELECT COALESCE(MAX(sort_order), -1) FROM chain_steps WHERE chain_id = ?"
    ).bind(&chain_id).fetch_one(&pool).await.map_err(|e| AppError::Database(e.to_string()))?.0;

    let sort_order = max_order + 1;

    sqlx::query(
        "INSERT INTO chain_steps (id, chain_id, sort_order, name, agent_id, skill_name, request_json, extract_json, timeout_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(&id).bind(&chain_id).bind(sort_order).bind(&name).bind(&agent_id)
    .bind(&skill_name).bind(&request_json).bind(&extract).bind(timeout)
    .execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;

    Ok(ChainStep { id, chain_id, sort_order, name, agent_id, skill_name, request_json, extract_json: extract, timeout_ms: timeout })
}

#[tauri::command]
#[specta::specta]
pub async fn update_chain_step(
    id: String, name: Option<String>, request_json: Option<String>,
    extract_json: Option<String>, timeout_ms: Option<i32>,
    app: tauri::AppHandle,
) -> Result<(), AppError> {
    let pool = get_pool(&app).await?;
    if let Some(n) = name { sqlx::query("UPDATE chain_steps SET name = ? WHERE id = ?").bind(&n).bind(&id).execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?; }
    if let Some(r) = request_json { sqlx::query("UPDATE chain_steps SET request_json = ? WHERE id = ?").bind(&r).bind(&id).execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?; }
    if let Some(e) = extract_json { sqlx::query("UPDATE chain_steps SET extract_json = ? WHERE id = ?").bind(&e).bind(&id).execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?; }
    if let Some(t) = timeout_ms { sqlx::query("UPDATE chain_steps SET timeout_ms = ? WHERE id = ?").bind(t).bind(&id).execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?; }
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn delete_chain_step(id: String, app: tauri::AppHandle) -> Result<(), AppError> {
    let pool = get_pool(&app).await?;
    sqlx::query("DELETE FROM chain_steps WHERE id = ?").bind(&id).execute(&pool).await
        .map_err(|e| AppError::Database(e.to_string()))?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn list_chain_steps(chain_id: String, app: tauri::AppHandle) -> Result<Vec<ChainStep>, AppError> {
    let pool = get_pool(&app).await?;
    let rows = sqlx::query_as::<_, (String, String, i32, String, String, String, String, String, i32)>(
        "SELECT id, chain_id, sort_order, name, agent_id, skill_name, request_json, extract_json, timeout_ms FROM chain_steps WHERE chain_id = ? ORDER BY sort_order"
    ).bind(&chain_id).fetch_all(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;

    Ok(rows.into_iter().map(|r| ChainStep {
        id: r.0, chain_id: r.1, sort_order: r.2, name: r.3, agent_id: r.4,
        skill_name: r.5, request_json: r.6, extract_json: r.7, timeout_ms: r.8,
    }).collect())
}

// --- Run Chain ---

#[tauri::command]
#[specta::specta]
pub async fn run_chain(
    chain_id: String,
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<ChainRunResult, AppError> {
    let pool = get_pool(&app).await?;

    // Load chain steps
    let steps = sqlx::query_as::<_, (String, String, i32, String, String, String, String, String, i32)>(
        "SELECT id, chain_id, sort_order, name, agent_id, skill_name, request_json, extract_json, timeout_ms FROM chain_steps WHERE chain_id = ? ORDER BY sort_order"
    ).bind(&chain_id).fetch_all(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;

    // Load workspace env variables for the chain's workspace
    let chain_ws = sqlx::query_as::<_, (String,)>(
        "SELECT workspace_id FROM request_chains WHERE id = ?"
    ).bind(&chain_id).fetch_one(&pool).await.map_err(|e| AppError::Database(e.to_string()))?.0;

    let env_rows = sqlx::query_as::<_, (String, String)>(
        "SELECT name, value FROM env_variables WHERE workspace_id = ?"
    ).bind(&chain_ws).fetch_all(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;

    let mut variables: HashMap<String, String> = env_rows.into_iter().collect();

    let start = Instant::now();
    let mut step_results = Vec::new();
    let mut overall_status = "completed".to_string();

    for row in &steps {
        let step_name = &row.3;
        let agent_id = &row.4;
        let _skill_name = &row.5;
        let request_template = &row.6;
        let extract_json = &row.7;
        let timeout_ms = row.8;

        // Substitute variables in request JSON: {{varName}} -> value
        let mut request_str = request_template.clone();
        for (k, v) in &variables {
            request_str = request_str.replace(&format!("{{{{{}}}}}", k), v);
        }

        let payload: serde_json::Value = serde_json::from_str(&request_str).unwrap_or_default();

        // Look up agent URL
        let agent_url = sqlx::query_as::<_, (String,)>("SELECT url FROM agents WHERE id = ?")
            .bind(agent_id).fetch_optional(&pool).await
            .map_err(|e| AppError::Database(e.to_string()))?
            .map(|r| r.0);

        let step_start = Instant::now();

        if let Some(url) = agent_url {
            // Load agent headers
            let headers_key = format!("card:{}:headers", agent_id);
            let extra_headers: Option<HashMap<String, String>> = sqlx::query_as::<_, (String,)>(
                "SELECT value FROM settings WHERE key = ?"
            ).bind(&headers_key).fetch_optional(&pool).await.ok().flatten()
            .and_then(|r| serde_json::from_str(&r.0).ok());

            let timeout_secs = (timeout_ms / 1000).max(1) as u64;
            let result = send_task_rpc(&state.http_client, &url, &payload, None, extra_headers.as_ref(), timeout_secs).await;
            let step_duration = step_start.elapsed().as_millis() as i32;

            match result {
                Ok(response) => {
                    // Extract variables from response using JSONPath mappings
                    let mut extracted = HashMap::new();
                    if let Ok(mappings) = serde_json::from_str::<HashMap<String, String>>(extract_json) {
                        for (var_name, path) in &mappings {
                            if let Ok(jp) = path.parse::<jsonpath_rust::JsonPath>() {
                                let found = jp.find(&response);
                                if let Some(val) = found.as_array().and_then(|a| a.first()) {
                                    let val_str = match val {
                                        serde_json::Value::String(s) => s.clone(),
                                        other => other.to_string(),
                                    };
                                    extracted.insert(var_name.clone(), val_str.clone());
                                    variables.insert(var_name.clone(), val_str);
                                }
                            }
                        }
                    }

                    step_results.push(ChainStepResult {
                        step_name: step_name.clone(),
                        status: "completed".into(),
                        response_json: Some(serde_json::to_string(&response).unwrap_or_default()),
                        extracted,
                        duration_ms: step_duration,
                        error: None,
                    });
                }
                Err(e) => {
                    overall_status = "failed".into();
                    step_results.push(ChainStepResult {
                        step_name: step_name.clone(),
                        status: "failed".into(),
                        response_json: None,
                        extracted: HashMap::new(),
                        duration_ms: step_duration,
                        error: Some(e.to_string()),
                    });
                    break; // Stop chain on failure
                }
            }
        } else {
            overall_status = "failed".into();
            step_results.push(ChainStepResult {
                step_name: step_name.clone(),
                status: "failed".into(),
                response_json: None,
                extracted: HashMap::new(),
                duration_ms: 0,
                error: Some(format!("Agent {} not found", agent_id)),
            });
            break;
        }
    }

    let total_duration = start.elapsed().as_millis() as i32;

    Ok(ChainRunResult {
        chain_id,
        status: overall_status,
        steps: step_results,
        variables,
        duration_ms: total_duration,
    })
}

// --- Workspace Export/Import ---

#[tauri::command]
#[specta::specta]
pub async fn export_workspace(workspace_id: String, app: tauri::AppHandle) -> Result<String, AppError> {
    let pool = get_pool(&app).await?;

    let ws_name = sqlx::query_as::<_, (String,)>("SELECT name FROM workspaces WHERE id = ?")
        .bind(&workspace_id).fetch_one(&pool).await.map_err(|e| AppError::Database(e.to_string()))?.0;

    let agents: Vec<serde_json::Value> = sqlx::query_as::<_, (String, String, Option<String>, String)>(
        "SELECT url, card_json, nickname, id FROM agents WHERE workspace_id = ?"
    ).bind(&workspace_id).fetch_all(&pool).await.map_err(|e| AppError::Database(e.to_string()))?
    .into_iter().map(|r| serde_json::json!({"url": r.0, "card": r.1, "nickname": r.2})).collect();

    let env_vars: Vec<serde_json::Value> = sqlx::query_as::<_, (String, String, bool)>(
        "SELECT name, value, is_secret FROM env_variables WHERE workspace_id = ?"
    ).bind(&workspace_id).fetch_all(&pool).await.map_err(|e| AppError::Database(e.to_string()))?
    .into_iter().map(|r| serde_json::json!({"name": r.0, "value": if r.2 { "" } else { &r.1 }, "isSecret": r.2})).collect();

    let chains: Vec<serde_json::Value> = sqlx::query_as::<_, (String, String, String)>(
        "SELECT id, name, description FROM request_chains WHERE workspace_id = ?"
    ).bind(&workspace_id).fetch_all(&pool).await.map_err(|e| AppError::Database(e.to_string()))?
    .into_iter().map(|r| serde_json::json!({"name": r.1, "description": r.2})).collect();

    let export = serde_json::json!({
        "workspaceName": ws_name,
        "agents": agents,
        "envVariables": env_vars,
        "chains": chains,
    });

    Ok(serde_json::to_string_pretty(&export)?)
}

#[tauri::command]
#[specta::specta]
pub async fn import_workspace(json_data: String, app: tauri::AppHandle) -> Result<String, AppError> {
    let pool = get_pool(&app).await?;
    let data: serde_json::Value = serde_json::from_str(&json_data)?;

    let ws_name = data.get("workspaceName").and_then(|v| v.as_str()).unwrap_or("Imported");
    let ws_id = nanoid::nanoid!();

    sqlx::query("INSERT INTO workspaces (id, name, created_at) VALUES (?, ?, unixepoch())")
        .bind(&ws_id).bind(ws_name).execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;

    // Import env variables
    if let Some(vars) = data.get("envVariables").and_then(|v| v.as_array()) {
        for var in vars {
            let name = var.get("name").and_then(|v| v.as_str()).unwrap_or("");
            let value = var.get("value").and_then(|v| v.as_str()).unwrap_or("");
            let is_secret = var.get("isSecret").and_then(|v| v.as_bool()).unwrap_or(false);
            if !name.is_empty() {
                let id = nanoid::nanoid!();
                sqlx::query("INSERT INTO env_variables (id, workspace_id, name, value, is_secret) VALUES (?, ?, ?, ?, ?)")
                    .bind(&id).bind(&ws_id).bind(name).bind(value).bind(is_secret)
                    .execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;
            }
        }
    }

    Ok(ws_id)
}

// --- Diff ---

#[tauri::command]
#[specta::specta]
pub async fn diff_responses(response_a: String, response_b: String) -> Result<DiffResult, AppError> {
    let a: serde_json::Value = serde_json::from_str(&response_a).unwrap_or_default();
    let b: serde_json::Value = serde_json::from_str(&response_b).unwrap_or_default();

    let mut added = Vec::new();
    let mut removed = Vec::new();
    let mut changed = Vec::new();

    diff_json("$", &a, &b, &mut added, &mut removed, &mut changed);

    let identical = added.is_empty() && removed.is_empty() && changed.is_empty();

    Ok(DiffResult { identical, added, removed, changed })
}

fn diff_json(
    path: &str,
    a: &serde_json::Value,
    b: &serde_json::Value,
    added: &mut Vec<String>,
    removed: &mut Vec<String>,
    changed: &mut Vec<DiffChange>,
) {
    match (a, b) {
        (serde_json::Value::Object(ma), serde_json::Value::Object(mb)) => {
            for (k, va) in ma {
                let p = format!("{}.{}", path, k);
                if let Some(vb) = mb.get(k) {
                    diff_json(&p, va, vb, added, removed, changed);
                } else {
                    removed.push(p);
                }
            }
            for k in mb.keys() {
                if !ma.contains_key(k) {
                    added.push(format!("{}.{}", path, k));
                }
            }
        }
        (serde_json::Value::Array(aa), serde_json::Value::Array(ab)) => {
            let max_len = aa.len().max(ab.len());
            for i in 0..max_len {
                let p = format!("{}[{}]", path, i);
                match (aa.get(i), ab.get(i)) {
                    (Some(va), Some(vb)) => diff_json(&p, va, vb, added, removed, changed),
                    (Some(_), None) => removed.push(p),
                    (None, Some(_)) => added.push(p),
                    _ => {}
                }
            }
        }
        _ => {
            if a != b {
                changed.push(DiffChange {
                    path: path.to_string(),
                    old_value: a.to_string(),
                    new_value: b.to_string(),
                });
            }
        }
    }
}
