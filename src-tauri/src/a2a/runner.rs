use std::collections::HashMap;
use std::time::Instant;

use serde::{Deserialize, Serialize};
use specta::Type;
use sqlx::SqlitePool;

use crate::a2a::assertions::{evaluate_assertions, Assertion};
use crate::a2a::client::send_task_rpc;
use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Suite {
    pub id: String,
    pub name: String,
    pub description: String,
    pub agent_id: Option<String>,
    pub workspace_id: String,
    pub run_mode: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TestStep {
    pub id: String,
    pub suite_id: String,
    pub sort_order: i32,
    pub name: String,
    pub agent_id: String,
    pub skill_name: String,
    pub request_json: String,
    pub assertions_json: String,
    pub timeout_ms: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SuiteRun {
    pub id: String,
    pub suite_id: String,
    pub status: String,
    pub total_steps: i32,
    pub passed_steps: i32,
    pub failed_steps: i32,
    pub duration_ms: i32,
    pub started_at: String,
    pub finished_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct StepResult {
    pub id: String,
    pub run_id: String,
    pub step_id: String,
    pub status: String,
    pub response_json: Option<String>,
    pub assertion_results_json: Option<String>,
    pub error_message: Option<String>,
    pub duration_ms: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SuiteRunDetail {
    pub run: SuiteRun,
    pub step_results: Vec<StepResult>,
}

/// Execute a single test step: send the task, evaluate assertions, return result.
pub async fn execute_step(
    client: &reqwest::Client,
    pool: &SqlitePool,
    step: &TestStep,
    run_id: &str,
) -> Result<StepResult, AppError> {
    let step_result_id = nanoid::nanoid!();

    // Insert pending step result
    sqlx::query(
        "INSERT INTO step_results (id, run_id, step_id, status) VALUES (?, ?, ?, 'running')"
    )
    .bind(&step_result_id)
    .bind(run_id)
    .bind(&step.id)
    .execute(pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    // Look up agent URL and headers
    let agent_row = sqlx::query_as::<_, (String,)>("SELECT url FROM agents WHERE id = ?")
        .bind(&step.agent_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .ok_or_else(|| AppError::NotFound(format!("Agent {} not found", step.agent_id)))?;
    let agent_url = agent_row.0;

    // Load per-agent default headers
    let headers_key = format!("card:{}:headers", step.agent_id);
    let extra_headers: Option<HashMap<String, String>> = sqlx::query_as::<_, (String,)>(
        "SELECT value FROM settings WHERE key = ?"
    )
    .bind(&headers_key)
    .fetch_optional(pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?
    .and_then(|row| serde_json::from_str(&row.0).ok());

    // Parse request payload
    let payload: serde_json::Value = serde_json::from_str(&step.request_json)?;

    let timeout_secs = (step.timeout_ms / 1000).max(1) as u64;
    let start = Instant::now();

    // Execute the task
    let result = send_task_rpc(
        client,
        &agent_url,
        &payload,
        None,
        extra_headers.as_ref(),
        timeout_secs,
    )
    .await;

    let duration_ms = start.elapsed().as_millis() as i32;

    match result {
        Ok(response) => {
            // Evaluate assertions
            let assertions: Vec<Assertion> =
                serde_json::from_str(&step.assertions_json).unwrap_or_default();
            let assertion_results = evaluate_assertions(&response, &assertions, duration_ms);
            let all_passed = assertion_results.iter().all(|r| r.passed);
            let status = if all_passed { "passed" } else { "failed" };

            let response_str = serde_json::to_string(&response)?;
            let assertion_results_str = serde_json::to_string(&assertion_results)?;

            sqlx::query(
                "UPDATE step_results SET status = ?, response_json = ?, assertion_results_json = ?, duration_ms = ? WHERE id = ?"
            )
            .bind(status)
            .bind(&response_str)
            .bind(&assertion_results_str)
            .bind(duration_ms)
            .bind(&step_result_id)
            .execute(pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

            Ok(StepResult {
                id: step_result_id,
                run_id: run_id.to_string(),
                step_id: step.id.clone(),
                status: status.to_string(),
                response_json: Some(response_str),
                assertion_results_json: Some(assertion_results_str),
                error_message: None,
                duration_ms,
            })
        }
        Err(e) => {
            let error_msg = e.to_string();
            sqlx::query(
                "UPDATE step_results SET status = 'failed', error_message = ?, duration_ms = ? WHERE id = ?"
            )
            .bind(&error_msg)
            .bind(duration_ms)
            .bind(&step_result_id)
            .execute(pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

            Ok(StepResult {
                id: step_result_id,
                run_id: run_id.to_string(),
                step_id: step.id.clone(),
                status: "failed".to_string(),
                response_json: None,
                assertion_results_json: None,
                error_message: Some(error_msg),
                duration_ms,
            })
        }
    }
}

/// Run an entire suite: create a run record, execute steps, update totals.
pub async fn run_suite(
    client: &reqwest::Client,
    pool: &SqlitePool,
    suite_id: &str,
) -> Result<String, AppError> {
    let run_id = nanoid::nanoid!();

    // Load steps ordered by sort_order
    let steps: Vec<TestStep> = sqlx::query_as::<_, (String, String, i32, String, String, String, String, String, i32)>(
        "SELECT id, suite_id, sort_order, name, agent_id, skill_name, request_json, assertions_json, timeout_ms FROM test_steps WHERE suite_id = ? ORDER BY sort_order"
    )
    .bind(suite_id)
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?
    .into_iter()
    .map(|row| TestStep {
        id: row.0,
        suite_id: row.1,
        sort_order: row.2,
        name: row.3,
        agent_id: row.4,
        skill_name: row.5,
        request_json: row.6,
        assertions_json: row.7,
        timeout_ms: row.8,
    })
    .collect();

    let total = steps.len() as i32;

    // Load suite run_mode
    let run_mode: String = sqlx::query_as::<_, (String,)>(
        "SELECT run_mode FROM test_suites WHERE id = ?"
    )
    .bind(suite_id)
    .fetch_one(pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?
    .0;

    // Create run record
    sqlx::query(
        "INSERT INTO suite_runs (id, suite_id, status, total_steps) VALUES (?, ?, 'running', ?)"
    )
    .bind(&run_id)
    .bind(suite_id)
    .bind(total)
    .execute(pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    let start = Instant::now();
    let mut passed = 0i32;
    let mut failed = 0i32;

    if run_mode == "parallel" {
        let mut handles = Vec::new();
        for step in &steps {
            let client = client.clone();
            let pool = pool.clone();
            let step = step.clone();
            let run_id = run_id.clone();
            handles.push(tokio::spawn(async move {
                execute_step(&client, &pool, &step, &run_id).await
            }));
        }
        for handle in handles {
            match handle.await {
                Ok(Ok(result)) => {
                    if result.status == "passed" { passed += 1; } else { failed += 1; }
                }
                _ => { failed += 1; }
            }
        }
    } else {
        // Sequential
        for step in &steps {
            match execute_step(client, pool, step, &run_id).await {
                Ok(result) => {
                    if result.status == "passed" { passed += 1; } else { failed += 1; }
                }
                Err(_) => { failed += 1; }
            }
        }
    }

    let duration_ms = start.elapsed().as_millis() as i32;
    let status = if failed == 0 { "passed" } else { "failed" };

    sqlx::query(
        "UPDATE suite_runs SET status = ?, passed_steps = ?, failed_steps = ?, duration_ms = ?, finished_at = datetime('now') WHERE id = ?"
    )
    .bind(status)
    .bind(passed)
    .bind(failed)
    .bind(duration_ms)
    .bind(&run_id)
    .execute(pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(run_id)
}
