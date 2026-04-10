use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use rand::RngCore;
use sha2::{Digest, Sha256};

use crate::error::AppError;

const SERVICE_NAME: &str = "com.a2aforge.app";

/// Store a credential. Tries OS keyring first, falls back to in-memory encrypted cache.
pub async fn store_credential(key: &str, value: &str) -> Result<(), AppError> {
    match store_in_keyring(key, value) {
        Ok(()) => Ok(()),
        Err(keyring_err) => {
            log::warn!(
                "Keyring unavailable for store '{}': {}. Using in-memory encrypted fallback.",
                key, keyring_err
            );
            store_in_encrypted_memory(key, value)
        }
    }
}

/// Retrieve a credential. Tries OS keyring first, falls back to in-memory encrypted cache.
pub async fn retrieve_credential(key: &str) -> Result<Option<String>, AppError> {
    match retrieve_from_keyring(key) {
        Ok(value) => Ok(value),
        Err(keyring_err) => {
            log::warn!(
                "Keyring unavailable for retrieve '{}': {}. Using in-memory encrypted fallback.",
                key, keyring_err
            );
            retrieve_from_encrypted_memory(key)
        }
    }
}

/// Delete a credential from all backends.
pub async fn delete_credential(key: &str) -> Result<(), AppError> {
    let _ = delete_from_keyring(key);
    delete_from_encrypted_memory(key);
    Ok(())
}

/// Convenience: retrieve agent headers as a HashMap.
/// Returns None if no headers are stored.
pub async fn get_agent_headers(agent_id: &str) -> Option<std::collections::HashMap<String, String>> {
    let key = format!("agent-headers:{agent_id}");
    retrieve_credential(&key).await.ok().flatten()
        .and_then(|json| serde_json::from_str(&json).ok())
}

// --- Keyring backend ---

fn store_in_keyring(key: &str, value: &str) -> Result<(), String> {
    let entry = keyring::Entry::new(SERVICE_NAME, key)
        .map_err(|e| format!("keyring entry error: {e}"))?;
    entry
        .set_password(value)
        .map_err(|e| format!("keyring set error: {e}"))
}

fn retrieve_from_keyring(key: &str) -> Result<Option<String>, String> {
    let entry = keyring::Entry::new(SERVICE_NAME, key)
        .map_err(|e| format!("keyring entry error: {e}"))?;
    match entry.get_password() {
        Ok(pw) => Ok(Some(pw)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("keyring get error: {e}")),
    }
}

fn delete_from_keyring(key: &str) -> Result<(), String> {
    let entry = keyring::Entry::new(SERVICE_NAME, key)
        .map_err(|e| format!("keyring entry error: {e}"))?;
    entry
        .delete_credential()
        .map_err(|e| format!("keyring delete error: {e}"))
}

// --- AES-256-GCM encrypted SQLite fallback ---

/// Derive a 256-bit key from machine-specific identifiers.
/// Uses hostname + username + a fixed salt so the key is stable across restarts.
fn derive_machine_key() -> [u8; 32] {
    let hostname = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown-host".to_string());
    let username = whoami::username();

    let mut hasher = Sha256::new();
    hasher.update(SERVICE_NAME.as_bytes());
    hasher.update(b":");
    hasher.update(hostname.as_bytes());
    hasher.update(b":");
    hasher.update(username.as_bytes());
    hasher.finalize().into()
}

/// Encrypt a plaintext value. Returns "nonce_b64:ciphertext_b64".
fn encrypt_value(plaintext: &str) -> Result<String, AppError> {
    let key = derive_machine_key();
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| AppError::Credential(format!("cipher init: {e}")))?;

    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| AppError::Credential(format!("encrypt: {e}")))?;

    Ok(format!("{}:{}", B64.encode(nonce_bytes), B64.encode(ciphertext)))
}

/// Decrypt a "nonce_b64:ciphertext_b64" string back to plaintext.
fn decrypt_value(stored: &str) -> Result<String, AppError> {
    let (nonce_b64, ct_b64) = stored
        .split_once(':')
        .ok_or_else(|| AppError::Credential("invalid encrypted format".into()))?;

    let nonce_bytes = B64
        .decode(nonce_b64)
        .map_err(|e| AppError::Credential(format!("nonce decode: {e}")))?;
    let ciphertext = B64
        .decode(ct_b64)
        .map_err(|e| AppError::Credential(format!("ciphertext decode: {e}")))?;

    let key = derive_machine_key();
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| AppError::Credential(format!("cipher init: {e}")))?;
    let nonce = Nonce::from_slice(&nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext.as_ref())
        .map_err(|e| AppError::Credential(format!("decrypt: {e}")))?;

    String::from_utf8(plaintext)
        .map_err(|e| AppError::Credential(format!("utf8: {e}")))
}

/// In-memory credential store using a static HashMap protected by a Mutex.
/// This is a process-local encrypted cache — credentials are AES-256-GCM encrypted
/// but only persist for the lifetime of the process. They will be lost on restart
/// if the OS keyring is unavailable.
use std::collections::HashMap;
use std::sync::Mutex;
use std::sync::LazyLock;

static CRED_STORE: LazyLock<Mutex<HashMap<String, String>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

fn store_in_encrypted_memory(key: &str, value: &str) -> Result<(), AppError> {
    let encrypted = encrypt_value(value)?;
    let mut store = CRED_STORE
        .lock()
        .map_err(|e| AppError::Credential(format!("lock: {e}")))?;
    store.insert(format!("cred:{key}"), encrypted);
    Ok(())
}

fn retrieve_from_encrypted_memory(key: &str) -> Result<Option<String>, AppError> {
    let store = CRED_STORE
        .lock()
        .map_err(|e| AppError::Credential(format!("lock: {e}")))?;
    match store.get(&format!("cred:{key}")) {
        Some(encrypted) => Ok(Some(decrypt_value(encrypted)?)),
        None => Ok(None),
    }
}

fn delete_from_encrypted_memory(key: &str) {
    if let Ok(mut store) = CRED_STORE.lock() {
        store.remove(&format!("cred:{key}"));
    }
}
