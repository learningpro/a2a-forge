use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::Deserialize;
use sqlx::Row;

use crate::a2a::types::{AgentCard, AgentRow};
use crate::db::get_pool;
use crate::error::AppError;
use crate::state::AppState;

/// Helper: fetch an agent card from a base URL.
async fn fetch_card(
    base_url: &str,
    http: &reqwest::Client,
) -> Result<AgentCard, AppError> {
    let url = format!(
        "{}/.well-known/agent.json",
        base_url.trim_end_matches('/')
    );
    let resp = http
        .get(&url)
        .timeout(Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| AppError::Http(format!("Network error — check the URL: {e}")))?;

    let status = resp.status();
    if !status.is_success() {
        return Err(AppError::Http(format!(
            "HTTP {status} from agent endpoint"
        )));
    }

    resp.json::<AgentCard>()
        .await
        .map_err(|_| AppError::Serialization("Invalid JSON — not a valid agent card".into()))
}

#[tauri::command]
#[specta::specta]
pub async fn fetch_agent_card(
    base_url: String,
    state: tauri::State<'_, AppState>,
) -> Result<AgentCard, AppError> {
    fetch_card(&base_url, &state.http_client).await
}

#[tauri::command]
#[specta::specta]
pub async fn add_agent(
    base_url: String,
    nickname: Option<String>,
    workspace_id: String,
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<AgentRow, AppError> {
    let card = fetch_card(&base_url, &state.http_client).await?;
    let id = uuid::Uuid::new_v4().to_string();
    let card_json =
        serde_json::to_string(&card).map_err(|e| AppError::Serialization(e.to_string()))?;
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    let pool = get_pool(&app).await?;
    sqlx::query(
        "INSERT INTO agents (id, url, nickname, card_json, last_fetched_at, workspace_id) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&base_url)
    .bind(&nickname)
    .bind(&card_json)
    .bind(now)
    .bind(&workspace_id)
    .execute(&pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(AgentRow {
        id,
        url: base_url,
        nickname,
        card,
        last_fetched_at: now.to_string(),
        workspace_id,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn list_agents(
    workspace_id: String,
    app: tauri::AppHandle,
) -> Result<Vec<AgentRow>, AppError> {
    let pool = get_pool(&app).await?;
    let rows = sqlx::query(
        "SELECT id, url, nickname, card_json, last_fetched_at, workspace_id FROM agents WHERE workspace_id = ? ORDER BY rowid ASC",
    )
    .bind(&workspace_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    let mut agents = Vec::with_capacity(rows.len());
    for row in rows {
        let card_json: String = row
            .try_get("card_json")
            .map_err(|e| AppError::Database(e.to_string()))?;
        let card: AgentCard = serde_json::from_str(&card_json)?;
        agents.push(AgentRow {
            id: row.try_get("id").map_err(|e| AppError::Database(e.to_string()))?,
            url: row.try_get("url").map_err(|e| AppError::Database(e.to_string()))?,
            nickname: row.try_get("nickname").map_err(|e| AppError::Database(e.to_string()))?,
            card,
            last_fetched_at: row
                .try_get::<i64, _>("last_fetched_at")
                .map_err(|e| AppError::Database(e.to_string()))?
                .to_string(),
            workspace_id: row
                .try_get("workspace_id")
                .map_err(|e| AppError::Database(e.to_string()))?,
        });
    }
    Ok(agents)
}

#[tauri::command]
#[specta::specta]
pub async fn delete_agent(
    agent_id: String,
    app: tauri::AppHandle,
) -> Result<(), AppError> {
    let pool = get_pool(&app).await?;
    sqlx::query("DELETE FROM agents WHERE id = ?")
        .bind(&agent_id)
        .execute(&pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn refresh_agent(
    agent_id: String,
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<AgentRow, AppError> {
    let pool = get_pool(&app).await?;

    // Get existing agent URL
    let row = sqlx::query("SELECT url, nickname, workspace_id FROM agents WHERE id = ?")
        .bind(&agent_id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .ok_or_else(|| AppError::NotFound(format!("Agent {agent_id} not found")))?;

    let url: String = row.try_get("url").map_err(|e| AppError::Database(e.to_string()))?;
    let nickname: Option<String> = row.try_get("nickname").map_err(|e| AppError::Database(e.to_string()))?;
    let workspace_id: String = row
        .try_get("workspace_id")
        .map_err(|e| AppError::Database(e.to_string()))?;

    // Re-fetch card
    let card = fetch_card(&url, &state.http_client).await?;
    let card_json =
        serde_json::to_string(&card).map_err(|e| AppError::Serialization(e.to_string()))?;
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    sqlx::query("UPDATE agents SET card_json = ?, last_fetched_at = ? WHERE id = ?")
        .bind(&card_json)
        .bind(now)
        .bind(&agent_id)
        .execute(&pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(AgentRow {
        id: agent_id,
        url,
        nickname,
        card,
        last_fetched_at: now.to_string(),
        workspace_id,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn rename_agent(
    agent_id: String,
    nickname: String,
    app: tauri::AppHandle,
) -> Result<(), AppError> {
    let pool = get_pool(&app).await?;
    sqlx::query("UPDATE agents SET nickname = ? WHERE id = ?")
        .bind(&nickname)
        .bind(&agent_id)
        .execute(&pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn export_agents(
    workspace_id: String,
    app: tauri::AppHandle,
) -> Result<String, AppError> {
    let pool = get_pool(&app).await?;
    let rows = sqlx::query(
        "SELECT url, nickname, workspace_id FROM agents WHERE workspace_id = ? ORDER BY rowid ASC",
    )
    .bind(&workspace_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    let mut entries = Vec::with_capacity(rows.len());
    for row in rows {
        let url: String = row.try_get("url").map_err(|e| AppError::Database(e.to_string()))?;
        let nickname: Option<String> =
            row.try_get("nickname").map_err(|e| AppError::Database(e.to_string()))?;
        let wid: String = row
            .try_get("workspace_id")
            .map_err(|e| AppError::Database(e.to_string()))?;
        entries.push(serde_json::json!({
            "baseUrl": url,
            "nickname": nickname,
            "workspaceId": wid,
        }));
    }

    serde_json::to_string_pretty(&entries).map_err(|e| AppError::Serialization(e.to_string()))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ImportEntry {
    base_url: String,
    nickname: Option<String>,
}

#[tauri::command]
#[specta::specta]
pub async fn import_agents(
    json_data: String,
    workspace_id: String,
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<AgentRow>, AppError> {
    let entries: Vec<ImportEntry> = serde_json::from_str(&json_data)
        .map_err(|e| AppError::Serialization(format!("Invalid import JSON: {e}")))?;

    let mut results = Vec::new();
    for entry in entries {
        match add_agent_inner(
            &entry.base_url,
            entry.nickname.as_deref(),
            &workspace_id,
            &app,
            &state.http_client,
        )
        .await
        {
            Ok(row) => results.push(row),
            Err(e) => {
                log::warn!("Skipping import of {}: {e}", entry.base_url);
            }
        }
    }
    Ok(results)
}

/// Shared add-agent logic used by both add_agent command and import_agents.
async fn add_agent_inner(
    base_url: &str,
    nickname: Option<&str>,
    workspace_id: &str,
    app: &tauri::AppHandle,
    http: &reqwest::Client,
) -> Result<AgentRow, AppError> {
    let card = fetch_card(base_url, http).await?;
    let id = uuid::Uuid::new_v4().to_string();
    let card_json =
        serde_json::to_string(&card).map_err(|e| AppError::Serialization(e.to_string()))?;
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    let pool = get_pool(app).await?;
    sqlx::query(
        "INSERT INTO agents (id, url, nickname, card_json, last_fetched_at, workspace_id) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(base_url)
    .bind(nickname)
    .bind(&card_json)
    .bind(now)
    .bind(workspace_id)
    .execute(&pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(AgentRow {
        id,
        url: base_url.to_string(),
        nickname: nickname.map(|s| s.to_string()),
        card,
        last_fetched_at: now.to_string(),
        workspace_id: workspace_id.to_string(),
    })
}
