use std::sync::Arc;
use tokio::sync::Mutex;
use std::collections::HashMap;
use tokio::task::AbortHandle;

use crate::proxy::server::ProxyHandle;

pub struct AppState {
    pub http_client: reqwest::Client,
    pub active_tasks: Arc<Mutex<HashMap<String, AbortHandle>>>,
    pub proxy_handle: Mutex<Option<ProxyHandle>>,
    pub recording_session: Mutex<Option<String>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            http_client: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .expect("Failed to build HTTP client"),
            active_tasks: Arc::new(Mutex::new(HashMap::new())),
            proxy_handle: Mutex::new(None),
            recording_session: Mutex::new(None),
        }
    }
}
