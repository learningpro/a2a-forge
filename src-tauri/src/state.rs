use tokio::sync::Mutex;
use std::collections::HashMap;
use tokio::task::AbortHandle;

pub struct AppState {
    pub http_client: reqwest::Client,
    pub active_tasks: Mutex<HashMap<String, AbortHandle>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            http_client: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .unwrap(),
            active_tasks: Mutex::new(HashMap::new()),
        }
    }
}
