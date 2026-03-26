use serde::{Deserialize, Serialize};
use specta::Type;
use sqlx::SqlitePool;

use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct InterceptRule {
    pub id: String,
    pub name: String,
    pub enabled: bool,
    pub match_type: String,   // "all" | "agent" | "skill" | "method"
    pub match_value: String,
    pub action_type: String,  // "modify_request" | "modify_response" | "delay" | "error" | "mock"
    pub action_json: String,
    pub priority: i32,
    pub workspace_id: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DelayAction {
    pub delay_ms: u64,
    #[serde(default)]
    pub jitter_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorAction {
    pub status_code: u16,
    pub body: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MockAction {
    pub response: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModifyHeadersAction {
    #[serde(default)]
    pub headers: std::collections::HashMap<String, String>,
}

/// Check if a rule matches the given request context.
pub fn rule_matches(
    rule: &InterceptRule,
    agent_id: &str,
    skill_id: &str,
    method: &str,
) -> bool {
    if !rule.enabled {
        return false;
    }
    match rule.match_type.as_str() {
        "all" => true,
        "agent" => rule.match_value == agent_id,
        "skill" => rule.match_value == skill_id,
        "method" => rule.match_value == method,
        _ => false,
    }
}

/// Apply interceptor rules to a request. Returns:
/// - Ok(None) if request should be forwarded normally
/// - Ok(Some(response)) if a mock/error response should be returned directly
/// - Also applies delay if configured
pub async fn apply_request_rules(
    rules: &[InterceptRule],
    agent_id: &str,
    skill_id: &str,
    method: &str,
    payload: &mut serde_json::Value,
) -> Result<Option<(u16, serde_json::Value)>, AppError> {
    let mut sorted_rules: Vec<&InterceptRule> = rules.iter()
        .filter(|r| rule_matches(r, agent_id, skill_id, method))
        .collect();
    sorted_rules.sort_by(|a, b| b.priority.cmp(&a.priority));

    for rule in sorted_rules {
        match rule.action_type.as_str() {
            "delay" => {
                if let Ok(action) = serde_json::from_str::<DelayAction>(&rule.action_json) {
                    let jitter = if action.jitter_ms > 0 {
                        use std::time::{SystemTime, UNIX_EPOCH};
                        let seed = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().subsec_nanos() as u64;
                        seed % (action.jitter_ms + 1)
                    } else {
                        0
                    };
                    let total_delay = action.delay_ms + jitter;
                    tokio::time::sleep(std::time::Duration::from_millis(total_delay)).await;
                }
            }
            "error" => {
                if let Ok(action) = serde_json::from_str::<ErrorAction>(&rule.action_json) {
                    return Ok(Some((action.status_code, action.body)));
                }
            }
            "mock" => {
                if let Ok(action) = serde_json::from_str::<MockAction>(&rule.action_json) {
                    return Ok(Some((200, action.response)));
                }
            }
            "modify_request" => {
                if let Ok(action) = serde_json::from_str::<ModifyHeadersAction>(&rule.action_json) {
                    // Add extra headers info to payload metadata for downstream use
                    if !action.headers.is_empty() {
                        if let Some(obj) = payload.as_object_mut() {
                            obj.insert("_proxyHeaders".into(), serde_json::to_value(&action.headers).unwrap_or_default());
                        }
                    }
                }
            }
            _ => {}
        }
    }

    Ok(None)
}

/// Apply response interceptor rules.
pub fn apply_response_rules(
    rules: &[InterceptRule],
    agent_id: &str,
    skill_id: &str,
    method: &str,
    response: &mut serde_json::Value,
) {
    let mut sorted_rules: Vec<&InterceptRule> = rules.iter()
        .filter(|r| rule_matches(r, agent_id, skill_id, method) && r.action_type == "modify_response")
        .collect();
    sorted_rules.sort_by(|a, b| b.priority.cmp(&a.priority));

    for rule in sorted_rules {
        if let Ok(action) = serde_json::from_str::<ModifyHeadersAction>(&rule.action_json) {
            // For response modification, we inject metadata
            if let Some(obj) = response.as_object_mut() {
                obj.insert("_proxyModified".into(), serde_json::json!(true));
                if !action.headers.is_empty() {
                    obj.insert("_proxyResponseHeaders".into(), serde_json::to_value(&action.headers).unwrap_or_default());
                }
            }
        }
    }
}

/// Load all enabled rules for a workspace from the database.
pub async fn load_rules(pool: &SqlitePool, workspace_id: &str) -> Result<Vec<InterceptRule>, AppError> {
    let rows = sqlx::query_as::<_, (String, String, bool, String, String, String, String, i32, String, String)>(
        "SELECT id, name, enabled, match_type, match_value, action_type, action_json, priority, workspace_id, created_at FROM intercept_rules WHERE workspace_id = ? ORDER BY priority DESC"
    )
    .bind(workspace_id)
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(rows.into_iter().map(|r| InterceptRule {
        id: r.0, name: r.1, enabled: r.2, match_type: r.3, match_value: r.4,
        action_type: r.5, action_json: r.6, priority: r.7, workspace_id: r.8, created_at: r.9,
    }).collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_rule(match_type: &str, match_value: &str, action_type: &str) -> InterceptRule {
        InterceptRule {
            id: "r1".into(), name: "test".into(), enabled: true,
            match_type: match_type.into(), match_value: match_value.into(),
            action_type: action_type.into(), action_json: "{}".into(),
            priority: 0, workspace_id: "default".into(), created_at: "".into(),
        }
    }

    #[test]
    fn test_rule_matches_all() {
        let rule = make_rule("all", "", "delay");
        assert!(rule_matches(&rule, "any", "any", "any"));
    }

    #[test]
    fn test_rule_matches_agent() {
        let rule = make_rule("agent", "agent-1", "delay");
        assert!(rule_matches(&rule, "agent-1", "skill", "method"));
        assert!(!rule_matches(&rule, "agent-2", "skill", "method"));
    }

    #[test]
    fn test_rule_matches_skill() {
        let rule = make_rule("skill", "image_gen", "delay");
        assert!(rule_matches(&rule, "any", "image_gen", "any"));
        assert!(!rule_matches(&rule, "any", "video_gen", "any"));
    }

    #[test]
    fn test_disabled_rule_no_match() {
        let mut rule = make_rule("all", "", "delay");
        rule.enabled = false;
        assert!(!rule_matches(&rule, "any", "any", "any"));
    }
}
