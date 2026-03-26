use std::collections::HashMap;
use sqlx::SqlitePool;

use crate::error::AppError;

/// Build an aggregated agent card from all agents in a workspace.
pub async fn build_aggregated_card(
    pool: &SqlitePool,
    workspace_id: &str,
) -> Result<serde_json::Value, AppError> {
    let rows = sqlx::query_as::<_, (String, String, String)>(
        "SELECT id, url, card_json FROM agents WHERE workspace_id = ?"
    )
    .bind(workspace_id)
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    let mut all_skills: Vec<serde_json::Value> = Vec::new();
    let mut agent_urls: HashMap<String, String> = HashMap::new();

    for (agent_id, url, card_json) in &rows {
        if let Ok(card) = serde_json::from_str::<serde_json::Value>(card_json) {
            if let Some(skills) = card.get("skills").and_then(|s| s.as_array()) {
                for skill in skills {
                    let mut skill = skill.clone();
                    // Tag each skill with the source agent URL for routing
                    if let Some(obj) = skill.as_object_mut() {
                        obj.insert("_agentId".into(), serde_json::json!(agent_id));
                        obj.insert("_agentUrl".into(), serde_json::json!(url));
                    }
                    all_skills.push(skill);
                }
            }
            agent_urls.insert(agent_id.clone(), url.clone());
        }
    }

    Ok(serde_json::json!({
        "name": "A2A-Forge Local Registry",
        "description": "Aggregated agent registry proxy",
        "url": "http://localhost:9339",
        "version": "0.3.0",
        "protocolVersion": "0.2",
        "capabilities": {
            "streaming": false,
            "pushNotifications": false,
        },
        "skills": all_skills,
        "_registeredAgents": agent_urls,
    }))
}

/// Resolve which real agent URL to forward a request to, based on skill_id in the payload.
pub async fn resolve_agent_url(
    pool: &SqlitePool,
    workspace_id: &str,
    payload: &serde_json::Value,
) -> Result<(String, String), AppError> {
    // Extract skill_id from params
    let skill_id = payload
        .get("params")
        .and_then(|p| p.get("skill_id"))
        .and_then(|v| v.as_str())
        .unwrap_or("");

    // Find which agent has this skill
    let rows = sqlx::query_as::<_, (String, String, String)>(
        "SELECT id, url, card_json FROM agents WHERE workspace_id = ?"
    )
    .bind(workspace_id)
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    for (agent_id, url, card_json) in &rows {
        if let Ok(card) = serde_json::from_str::<serde_json::Value>(card_json) {
            if let Some(skills) = card.get("skills").and_then(|s| s.as_array()) {
                for skill in skills {
                    if skill.get("id").and_then(|v| v.as_str()) == Some(skill_id) {
                        return Ok((agent_id.clone(), url.clone()));
                    }
                }
            }
        }
    }

    // Fallback: if only one agent, use it
    if rows.len() == 1 {
        return Ok((rows[0].0.clone(), rows[0].1.clone()));
    }

    Err(AppError::NotFound(format!(
        "No agent found with skill '{skill_id}'"
    )))
}
