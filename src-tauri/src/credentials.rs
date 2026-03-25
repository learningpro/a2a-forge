#![allow(dead_code)]

use crate::error::AppError;

/// Credential storage abstraction.
///
/// Primary backend: tauri-plugin-keyring (OS keychain).
/// Fallback: AES-encrypted SQLite column (for Linux without Secret Service).
///
/// Phase 1 implements the keyring happy path and a fallback stub that
/// returns a clear error. The AES-SQLite fallback will be completed
/// before Phase 3 introduces real credentials.

const SERVICE_NAME: &str = "com.a2aforge.app";

/// Store a credential in the OS keychain.
/// Tries keyring first; falls back to AES-encrypted SQLite (stub in Phase 1).
pub async fn store_credential(key: &str, value: &str) -> Result<(), AppError> {
    match store_in_keyring(key, value) {
        Ok(()) => Ok(()),
        Err(keyring_err) => {
            // Keyring unavailable — attempt AES-SQLite fallback
            log::warn!(
                "Keyring unavailable for store '{}': {}. Attempting fallback.",
                key, keyring_err
            );
            store_in_encrypted_sqlite(key, value).await
        }
    }
}

/// Retrieve a credential from the OS keychain.
/// Tries keyring first; falls back to AES-encrypted SQLite (stub in Phase 1).
pub async fn retrieve_credential(key: &str) -> Result<Option<String>, AppError> {
    match retrieve_from_keyring(key) {
        Ok(value) => Ok(value),
        Err(keyring_err) => {
            log::warn!(
                "Keyring unavailable for retrieve '{}': {}. Attempting fallback.",
                key, keyring_err
            );
            retrieve_from_encrypted_sqlite(key).await
        }
    }
}

/// Delete a credential from all backends.
pub async fn delete_credential(key: &str) -> Result<(), AppError> {
    // Best-effort delete from keyring
    let _ = delete_from_keyring(key);
    // TODO: Also delete from SQLite fallback when implemented
    Ok(())
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

// --- AES-encrypted SQLite fallback (stub) ---

async fn store_in_encrypted_sqlite(_key: &str, _value: &str) -> Result<(), AppError> {
    // TODO (Phase 3): Implement AES-256-GCM encryption using a machine-derived key.
    // Store encrypted blob in SQLite settings table with key prefix "cred:".
    Err(AppError::Credential(
        "AES-SQLite fallback not yet implemented. Install a Secret Service provider (e.g., gnome-keyring) or set credentials via environment variables.".to_string()
    ))
}

async fn retrieve_from_encrypted_sqlite(_key: &str) -> Result<Option<String>, AppError> {
    // TODO (Phase 3): Implement AES-256-GCM decryption.
    Err(AppError::Credential(
        "AES-SQLite fallback not yet implemented. Install a Secret Service provider (e.g., gnome-keyring) or set credentials via environment variables.".to_string()
    ))
}
