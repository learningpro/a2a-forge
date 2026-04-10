use crate::credentials;
use crate::error::AppError;

#[tauri::command]
#[specta::specta]
pub async fn store_agent_headers(
    agent_id: String,
    headers_json: String,
) -> Result<(), AppError> {
    let key = format!("agent-headers:{agent_id}");
    credentials::store_credential(&key, &headers_json).await
}

#[tauri::command]
#[specta::specta]
pub async fn retrieve_agent_headers(
    agent_id: String,
) -> Result<Option<String>, AppError> {
    let key = format!("agent-headers:{agent_id}");
    credentials::retrieve_credential(&key).await
}

#[tauri::command]
#[specta::specta]
pub async fn delete_agent_headers(
    agent_id: String,
) -> Result<(), AppError> {
    let key = format!("agent-headers:{agent_id}");
    credentials::delete_credential(&key).await
}
