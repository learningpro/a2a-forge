use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AgentCard {
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    pub url: String,
    pub version: String,
    #[serde(default)]
    pub protocol_version: Option<String>,
    pub capabilities: AgentCapabilities,
    pub skills: Vec<AgentSkill>,
    #[serde(default)]
    pub default_input_modes: Vec<String>,
    #[serde(default)]
    pub default_output_modes: Vec<String>,
    #[serde(default)]
    pub provider: Option<AgentProvider>,
    #[serde(default)]
    pub documentation_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AgentCapabilities {
    #[serde(default)]
    pub streaming: Option<bool>,
    #[serde(default)]
    pub push_notifications: Option<bool>,
    #[serde(default)]
    pub state_transition_history: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AgentSkill {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub tags: Option<Vec<String>>,
    #[serde(default)]
    pub input_modes: Option<Vec<String>>,
    #[serde(default)]
    pub output_modes: Option<Vec<String>>,
    #[serde(default)]
    pub examples: Option<Vec<serde_json::Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AgentProvider {
    #[serde(default)]
    pub organization: Option<String>,
    #[serde(default)]
    pub url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AgentRow {
    pub id: String,
    pub url: String,
    pub nickname: Option<String>,
    pub card: AgentCard,
    pub last_fetched_at: i64,
    pub workspace_id: String,
}
