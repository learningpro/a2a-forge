use std::time::Instant;

use serde::{Deserialize, Serialize};
use specta::Type;

use crate::db::get_pool;
use crate::error::AppError;
use crate::state::AppState;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CommunityAgent {
    pub id: String,
    pub name: String,
    pub description: String,
    pub url: String,
    pub card_json: String,
    pub tags: String,
    pub author: String,
    pub stars: i32,
    pub last_checked: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Favorite {
    pub id: String,
    pub agent_id: String,
    pub folder: String,
    pub notes: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct HealthCheck {
    pub id: String,
    pub agent_id: String,
    pub status: String,
    pub latency_ms: Option<i32>,
    pub error: Option<String>,
    pub checked_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SharedSuiteExport {
    pub suite_name: String,
    pub description: String,
    pub run_mode: String,
    pub steps: Vec<SharedStepExport>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SharedStepExport {
    pub name: String,
    pub skill_name: String,
    pub request_json: String,
    pub assertions_json: String,
    pub timeout_ms: i32,
}

// --- Community Directory ---

#[tauri::command]
#[specta::specta]
pub async fn list_community_agents(
    search: Option<String>,
    tag: Option<String>,
    app: tauri::AppHandle,
) -> Result<Vec<CommunityAgent>, AppError> {
    let pool = get_pool(&app).await?;
    let rows = if let Some(q) = search {
        let pattern = format!("%{q}%");
        sqlx::query_as::<_, (String, String, String, String, String, String, String, i32, String, String)>(
            "SELECT id, name, description, url, card_json, tags, author, stars, last_checked, created_at FROM community_agents WHERE name LIKE ? OR description LIKE ? ORDER BY stars DESC"
        ).bind(&pattern).bind(&pattern).fetch_all(&pool).await
    } else if let Some(t) = tag {
        let pattern = format!("%\"{t}\"%");
        sqlx::query_as::<_, (String, String, String, String, String, String, String, i32, String, String)>(
            "SELECT id, name, description, url, card_json, tags, author, stars, last_checked, created_at FROM community_agents WHERE tags LIKE ? ORDER BY stars DESC"
        ).bind(&pattern).fetch_all(&pool).await
    } else {
        sqlx::query_as::<_, (String, String, String, String, String, String, String, i32, String, String)>(
            "SELECT id, name, description, url, card_json, tags, author, stars, last_checked, created_at FROM community_agents ORDER BY stars DESC"
        ).fetch_all(&pool).await
    }.map_err(|e| AppError::Database(e.to_string()))?;

    Ok(rows.into_iter().map(|r| CommunityAgent {
        id: r.0, name: r.1, description: r.2, url: r.3, card_json: r.4,
        tags: r.5, author: r.6, stars: r.7, last_checked: r.8, created_at: r.9,
    }).collect())
}

#[tauri::command]
#[specta::specta]
pub async fn submit_to_community(
    agent_id: String,
    app: tauri::AppHandle,
) -> Result<CommunityAgent, AppError> {
    let pool = get_pool(&app).await?;

    let agent = sqlx::query_as::<_, (String, String, String)>(
        "SELECT url, nickname, card_json FROM agents WHERE id = ?"
    ).bind(&agent_id).fetch_optional(&pool).await
    .map_err(|e| AppError::Database(e.to_string()))?
    .ok_or_else(|| AppError::NotFound(format!("Agent {agent_id} not found")))?;

    let card: serde_json::Value = serde_json::from_str(&agent.2)
        .map_err(|e| AppError::Serialization(format!("Invalid agent card JSON: {e}")))?;
    let name = card.get("name").and_then(|v| v.as_str())
        .ok_or_else(|| AppError::Serialization("Agent card missing 'name' field".into()))?
        .to_string();
    let description = card.get("description").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let skills = card.get("skills").and_then(|v| v.as_array()).map(|a| a.len()).unwrap_or(0);

    let id = nanoid::nanoid!();
    let tags = serde_json::json!([format!("{skills} skills")]).to_string();

    sqlx::query(
        "INSERT OR REPLACE INTO community_agents (id, name, description, url, card_json, tags) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(&id).bind(&name).bind(&description).bind(&agent.0).bind(&agent.2).bind(&tags)
    .execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;

    Ok(CommunityAgent {
        id, name, description, url: agent.0, card_json: agent.2,
        tags, author: String::new(), stars: 0,
        last_checked: String::new(), created_at: String::new(),
    })
}

// --- Favorites ---

#[tauri::command]
#[specta::specta]
pub async fn toggle_favorite(
    agent_id: String,
    folder: Option<String>,
    app: tauri::AppHandle,
) -> Result<bool, AppError> {
    let pool = get_pool(&app).await?;
    let existing = sqlx::query_as::<_, (String,)>(
        "SELECT id FROM favorites WHERE agent_id = ?"
    ).bind(&agent_id).fetch_optional(&pool).await
    .map_err(|e| AppError::Database(e.to_string()))?;

    if let Some(row) = existing {
        sqlx::query("DELETE FROM favorites WHERE id = ?")
            .bind(&row.0).execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;
        Ok(false) // unfavorited
    } else {
        let id = nanoid::nanoid!();
        let f = folder.unwrap_or_else(|| "default".into());
        sqlx::query("INSERT INTO favorites (id, agent_id, folder) VALUES (?, ?, ?)")
            .bind(&id).bind(&agent_id).bind(&f)
            .execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;
        Ok(true) // favorited
    }
}

#[tauri::command]
#[specta::specta]
pub async fn list_favorites(
    folder: Option<String>,
    app: tauri::AppHandle,
) -> Result<Vec<Favorite>, AppError> {
    let pool = get_pool(&app).await?;
    let rows = if let Some(f) = folder {
        sqlx::query_as::<_, (String, String, String, String, String)>(
            "SELECT id, agent_id, folder, notes, created_at FROM favorites WHERE folder = ? ORDER BY created_at DESC"
        ).bind(&f).fetch_all(&pool).await
    } else {
        sqlx::query_as::<_, (String, String, String, String, String)>(
            "SELECT id, agent_id, folder, notes, created_at FROM favorites ORDER BY created_at DESC"
        ).fetch_all(&pool).await
    }.map_err(|e| AppError::Database(e.to_string()))?;

    Ok(rows.into_iter().map(|r| Favorite {
        id: r.0, agent_id: r.1, folder: r.2, notes: r.3, created_at: r.4,
    }).collect())
}

#[tauri::command]
#[specta::specta]
pub async fn update_favorite(
    id: String,
    folder: Option<String>,
    notes: Option<String>,
    app: tauri::AppHandle,
) -> Result<(), AppError> {
    let pool = get_pool(&app).await?;
    if let Some(f) = folder {
        sqlx::query("UPDATE favorites SET folder = ? WHERE id = ?")
            .bind(&f).bind(&id).execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;
    }
    if let Some(n) = notes {
        sqlx::query("UPDATE favorites SET notes = ? WHERE id = ?")
            .bind(&n).bind(&id).execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;
    }
    Ok(())
}

// --- Health Monitoring ---

#[tauri::command]
#[specta::specta]
pub async fn check_agent_health(
    agent_id: String,
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<HealthCheck, AppError> {
    let pool = get_pool(&app).await?;

    let agent_url = sqlx::query_as::<_, (String,)>(
        "SELECT url FROM agents WHERE id = ?"
    ).bind(&agent_id).fetch_optional(&pool).await
    .map_err(|e| AppError::Database(e.to_string()))?
    .ok_or_else(|| AppError::NotFound(format!("Agent {agent_id} not found")))?.0;

    let url = format!("{}/.well-known/agent.json", agent_url.trim_end_matches('/'));
    let start = Instant::now();
    let result = state.http_client.get(&url).timeout(std::time::Duration::from_secs(10)).send().await;
    let latency_ms = start.elapsed().as_millis() as i32;

    let (status, error) = match result {
        Ok(resp) if resp.status().is_success() => {
            // Verify it's valid JSON
            match resp.json::<serde_json::Value>().await {
                Ok(card) if card.get("name").is_some() => ("healthy".to_string(), None),
                Ok(_) => ("degraded".to_string(), Some("Invalid agent card format".into())),
                Err(e) => ("degraded".to_string(), Some(format!("Parse error: {e}"))),
            }
        }
        Ok(resp) => ("degraded".to_string(), Some(format!("HTTP {}", resp.status()))),
        Err(e) => ("down".to_string(), Some(e.to_string())),
    };

    let id = nanoid::nanoid!();
    sqlx::query(
        "INSERT INTO health_checks (id, agent_id, status, latency_ms, error) VALUES (?, ?, ?, ?, ?)"
    ).bind(&id).bind(&agent_id).bind(&status).bind(latency_ms).bind(&error)
    .execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;

    Ok(HealthCheck { id, agent_id, status, latency_ms: Some(latency_ms), error, checked_at: String::new() })
}

#[tauri::command]
#[specta::specta]
pub async fn check_all_health(
    workspace_id: String,
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<HealthCheck>, AppError> {
    let pool = get_pool(&app).await?;
    let agents = sqlx::query_as::<_, (String,)>(
        "SELECT id FROM agents WHERE workspace_id = ?"
    ).bind(&workspace_id).fetch_all(&pool).await
    .map_err(|e| AppError::Database(e.to_string()))?;

    let mut results = Vec::new();
    for (aid,) in agents {
        match check_agent_health(aid, app.clone(), state.clone()).await {
            Ok(hc) => results.push(hc),
            Err(_) => {} // skip failed checks
        }
    }
    Ok(results)
}

#[tauri::command]
#[specta::specta]
pub async fn list_health_checks(
    agent_id: String,
    limit: Option<i32>,
    app: tauri::AppHandle,
) -> Result<Vec<HealthCheck>, AppError> {
    let pool = get_pool(&app).await?;
    let lim = limit.unwrap_or(20);
    let rows = sqlx::query_as::<_, (String, String, String, Option<i32>, Option<String>, String)>(
        "SELECT id, agent_id, status, latency_ms, error, checked_at FROM health_checks WHERE agent_id = ? ORDER BY checked_at DESC LIMIT ?"
    ).bind(&agent_id).bind(lim).fetch_all(&pool).await
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(rows.into_iter().map(|r| HealthCheck {
        id: r.0, agent_id: r.1, status: r.2, latency_ms: r.3, error: r.4, checked_at: r.5,
    }).collect())
}

// --- Shared Test Suites ---

#[tauri::command]
#[specta::specta]
pub async fn export_test_suite(
    suite_id: String,
    app: tauri::AppHandle,
) -> Result<String, AppError> {
    let pool = get_pool(&app).await?;

    let suite = sqlx::query_as::<_, (String, String, String)>(
        "SELECT name, description, run_mode FROM test_suites WHERE id = ?"
    ).bind(&suite_id).fetch_optional(&pool).await
    .map_err(|e| AppError::Database(e.to_string()))?
    .ok_or_else(|| AppError::NotFound(format!("Suite {suite_id} not found")))?;

    let steps = sqlx::query_as::<_, (String, String, String, String, i32)>(
        "SELECT name, skill_name, request_json, assertions_json, timeout_ms FROM test_steps WHERE suite_id = ? ORDER BY sort_order"
    ).bind(&suite_id).fetch_all(&pool).await
    .map_err(|e| AppError::Database(e.to_string()))?;

    let export = SharedSuiteExport {
        suite_name: suite.0,
        description: suite.1,
        run_mode: suite.2,
        steps: steps.into_iter().map(|s| SharedStepExport {
            name: s.0, skill_name: s.1, request_json: s.2,
            assertions_json: s.3, timeout_ms: s.4,
        }).collect(),
    };

    Ok(serde_json::to_string_pretty(&export)?)
}

#[tauri::command]
#[specta::specta]
pub async fn import_test_suite(
    json_data: String,
    agent_id: String,
    workspace_id: String,
    app: tauri::AppHandle,
) -> Result<String, AppError> {
    let pool = get_pool(&app).await?;
    let import: SharedSuiteExport = serde_json::from_str(&json_data)?;

    let suite_id = nanoid::nanoid!();
    sqlx::query(
        "INSERT INTO test_suites (id, name, description, agent_id, workspace_id, run_mode, shared) VALUES (?, ?, ?, ?, ?, ?, 1)"
    ).bind(&suite_id).bind(&import.suite_name).bind(&import.description)
    .bind(&agent_id).bind(&workspace_id).bind(&import.run_mode)
    .execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;

    for (i, step) in import.steps.iter().enumerate() {
        let step_id = nanoid::nanoid!();
        sqlx::query(
            "INSERT INTO test_steps (id, suite_id, sort_order, name, agent_id, skill_name, request_json, assertions_json, timeout_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(&step_id).bind(&suite_id).bind(i as i32).bind(&step.name)
        .bind(&agent_id).bind(&step.skill_name).bind(&step.request_json)
        .bind(&step.assertions_json).bind(step.timeout_ms)
        .execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;
    }

    Ok(suite_id)
}
