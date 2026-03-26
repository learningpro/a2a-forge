use crate::a2a::runner::{self, Suite, SuiteRun, SuiteRunDetail, StepResult, TestStep};
use crate::db::get_pool;
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
#[specta::specta]
pub async fn create_suite(
    name: String,
    description: Option<String>,
    agent_id: Option<String>,
    workspace_id: String,
    run_mode: Option<String>,
    app: tauri::AppHandle,
) -> Result<Suite, AppError> {
    let pool = get_pool(&app).await?;
    let id = nanoid::nanoid!();
    let desc = description.unwrap_or_default();
    let mode = run_mode.unwrap_or_else(|| "sequential".into());

    sqlx::query(
        "INSERT INTO test_suites (id, name, description, agent_id, workspace_id, run_mode) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&name)
    .bind(&desc)
    .bind(&agent_id)
    .bind(&workspace_id)
    .bind(&mode)
    .execute(&pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    let row = sqlx::query_as::<_, (String, String, String, Option<String>, String, String, String, String)>(
        "SELECT id, name, description, agent_id, workspace_id, run_mode, created_at, updated_at FROM test_suites WHERE id = ?"
    )
    .bind(&id)
    .fetch_one(&pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Suite {
        id: row.0, name: row.1, description: row.2, agent_id: row.3,
        workspace_id: row.4, run_mode: row.5, created_at: row.6, updated_at: row.7,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn update_suite(
    id: String,
    name: Option<String>,
    description: Option<String>,
    run_mode: Option<String>,
    app: tauri::AppHandle,
) -> Result<(), AppError> {
    let pool = get_pool(&app).await?;
    if let Some(n) = name {
        sqlx::query("UPDATE test_suites SET name = ?, updated_at = datetime('now') WHERE id = ?")
            .bind(&n).bind(&id).execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;
    }
    if let Some(d) = description {
        sqlx::query("UPDATE test_suites SET description = ?, updated_at = datetime('now') WHERE id = ?")
            .bind(&d).bind(&id).execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;
    }
    if let Some(m) = run_mode {
        sqlx::query("UPDATE test_suites SET run_mode = ?, updated_at = datetime('now') WHERE id = ?")
            .bind(&m).bind(&id).execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;
    }
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn delete_suite(id: String, app: tauri::AppHandle) -> Result<(), AppError> {
    let pool = get_pool(&app).await?;
    sqlx::query("DELETE FROM test_suites WHERE id = ?")
        .bind(&id).execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn list_suites(
    workspace_id: String,
    agent_id: Option<String>,
    app: tauri::AppHandle,
) -> Result<Vec<Suite>, AppError> {
    let pool = get_pool(&app).await?;
    let rows = if let Some(aid) = agent_id {
        sqlx::query_as::<_, (String, String, String, Option<String>, String, String, String, String)>(
            "SELECT id, name, description, agent_id, workspace_id, run_mode, created_at, updated_at FROM test_suites WHERE workspace_id = ? AND (agent_id = ? OR agent_id IS NULL) ORDER BY created_at DESC"
        )
        .bind(&workspace_id).bind(&aid)
        .fetch_all(&pool).await
    } else {
        sqlx::query_as::<_, (String, String, String, Option<String>, String, String, String, String)>(
            "SELECT id, name, description, agent_id, workspace_id, run_mode, created_at, updated_at FROM test_suites WHERE workspace_id = ? ORDER BY created_at DESC"
        )
        .bind(&workspace_id)
        .fetch_all(&pool).await
    }.map_err(|e| AppError::Database(e.to_string()))?;

    Ok(rows.into_iter().map(|r| Suite {
        id: r.0, name: r.1, description: r.2, agent_id: r.3,
        workspace_id: r.4, run_mode: r.5, created_at: r.6, updated_at: r.7,
    }).collect())
}

#[tauri::command]
#[specta::specta]
pub async fn get_suite(id: String, app: tauri::AppHandle) -> Result<Suite, AppError> {
    let pool = get_pool(&app).await?;
    let row = sqlx::query_as::<_, (String, String, String, Option<String>, String, String, String, String)>(
        "SELECT id, name, description, agent_id, workspace_id, run_mode, created_at, updated_at FROM test_suites WHERE id = ?"
    )
    .bind(&id)
    .fetch_optional(&pool).await.map_err(|e| AppError::Database(e.to_string()))?
    .ok_or_else(|| AppError::NotFound(format!("Suite {id} not found")))?;

    Ok(Suite {
        id: row.0, name: row.1, description: row.2, agent_id: row.3,
        workspace_id: row.4, run_mode: row.5, created_at: row.6, updated_at: row.7,
    })
}

// --- Steps ---

#[tauri::command]
#[specta::specta]
pub async fn add_step(
    suite_id: String,
    name: String,
    agent_id: String,
    skill_name: String,
    request_json: String,
    assertions_json: Option<String>,
    timeout_ms: Option<i32>,
    app: tauri::AppHandle,
) -> Result<TestStep, AppError> {
    let pool = get_pool(&app).await?;
    let id = nanoid::nanoid!();
    let assertions = assertions_json.unwrap_or_else(|| "[]".into());
    let timeout = timeout_ms.unwrap_or(60000);

    // Get next sort_order
    let max_order: i32 = sqlx::query_as::<_, (i32,)>(
        "SELECT COALESCE(MAX(sort_order), -1) FROM test_steps WHERE suite_id = ?"
    )
    .bind(&suite_id)
    .fetch_one(&pool).await.map_err(|e| AppError::Database(e.to_string()))?.0;

    let sort_order = max_order + 1;

    sqlx::query(
        "INSERT INTO test_steps (id, suite_id, sort_order, name, agent_id, skill_name, request_json, assertions_json, timeout_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id).bind(&suite_id).bind(sort_order).bind(&name)
    .bind(&agent_id).bind(&skill_name).bind(&request_json)
    .bind(&assertions).bind(timeout)
    .execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;

    Ok(TestStep {
        id, suite_id, sort_order, name, agent_id, skill_name,
        request_json, assertions_json: assertions, timeout_ms: timeout,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn update_step(
    id: String,
    name: Option<String>,
    request_json: Option<String>,
    assertions_json: Option<String>,
    timeout_ms: Option<i32>,
    app: tauri::AppHandle,
) -> Result<(), AppError> {
    let pool = get_pool(&app).await?;
    if let Some(n) = name {
        sqlx::query("UPDATE test_steps SET name = ? WHERE id = ?")
            .bind(&n).bind(&id).execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;
    }
    if let Some(r) = request_json {
        sqlx::query("UPDATE test_steps SET request_json = ? WHERE id = ?")
            .bind(&r).bind(&id).execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;
    }
    if let Some(a) = assertions_json {
        sqlx::query("UPDATE test_steps SET assertions_json = ? WHERE id = ?")
            .bind(&a).bind(&id).execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;
    }
    if let Some(t) = timeout_ms {
        sqlx::query("UPDATE test_steps SET timeout_ms = ? WHERE id = ?")
            .bind(t).bind(&id).execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;
    }
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn delete_step(id: String, app: tauri::AppHandle) -> Result<(), AppError> {
    let pool = get_pool(&app).await?;
    sqlx::query("DELETE FROM test_steps WHERE id = ?")
        .bind(&id).execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn reorder_steps(suite_id: String, step_ids: Vec<String>, app: tauri::AppHandle) -> Result<(), AppError> {
    let pool = get_pool(&app).await?;
    for (i, step_id) in step_ids.iter().enumerate() {
        sqlx::query("UPDATE test_steps SET sort_order = ? WHERE id = ? AND suite_id = ?")
            .bind(i as i32).bind(step_id).bind(&suite_id)
            .execute(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;
    }
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn list_steps(suite_id: String, app: tauri::AppHandle) -> Result<Vec<TestStep>, AppError> {
    let pool = get_pool(&app).await?;
    let rows = sqlx::query_as::<_, (String, String, i32, String, String, String, String, String, i32)>(
        "SELECT id, suite_id, sort_order, name, agent_id, skill_name, request_json, assertions_json, timeout_ms FROM test_steps WHERE suite_id = ? ORDER BY sort_order"
    )
    .bind(&suite_id)
    .fetch_all(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;

    Ok(rows.into_iter().map(|r| TestStep {
        id: r.0, suite_id: r.1, sort_order: r.2, name: r.3, agent_id: r.4,
        skill_name: r.5, request_json: r.6, assertions_json: r.7, timeout_ms: r.8,
    }).collect())
}

// --- Run ---

#[tauri::command]
#[specta::specta]
pub async fn run_test_suite(
    suite_id: String,
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<String, AppError> {
    let pool = get_pool(&app).await?;
    let run_id = runner::run_suite(&state.http_client, &pool, &suite_id).await?;
    Ok(run_id)
}

#[tauri::command]
#[specta::specta]
pub async fn get_suite_run(run_id: String, app: tauri::AppHandle) -> Result<SuiteRunDetail, AppError> {
    let pool = get_pool(&app).await?;

    let row = sqlx::query_as::<_, (String, String, String, i32, i32, i32, i32, String, Option<String>)>(
        "SELECT id, suite_id, status, total_steps, passed_steps, failed_steps, duration_ms, started_at, finished_at FROM suite_runs WHERE id = ?"
    )
    .bind(&run_id)
    .fetch_optional(&pool).await.map_err(|e| AppError::Database(e.to_string()))?
    .ok_or_else(|| AppError::NotFound(format!("Run {run_id} not found")))?;

    let run = SuiteRun {
        id: row.0, suite_id: row.1, status: row.2, total_steps: row.3,
        passed_steps: row.4, failed_steps: row.5, duration_ms: row.6,
        started_at: row.7, finished_at: row.8,
    };

    let step_rows = sqlx::query_as::<_, (String, String, String, String, Option<String>, Option<String>, Option<String>, i32)>(
        "SELECT id, run_id, step_id, status, response_json, assertion_results_json, error_message, duration_ms FROM step_results WHERE run_id = ? ORDER BY id"
    )
    .bind(&run_id)
    .fetch_all(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;

    let step_results: Vec<StepResult> = step_rows.into_iter().map(|r| StepResult {
        id: r.0, run_id: r.1, step_id: r.2, status: r.3,
        response_json: r.4, assertion_results_json: r.5,
        error_message: r.6, duration_ms: r.7,
    }).collect();

    Ok(SuiteRunDetail { run, step_results })
}

#[tauri::command]
#[specta::specta]
pub async fn list_suite_runs(
    suite_id: String,
    limit: Option<i32>,
    app: tauri::AppHandle,
) -> Result<Vec<SuiteRun>, AppError> {
    let pool = get_pool(&app).await?;
    let lim = limit.unwrap_or(20);

    let rows = sqlx::query_as::<_, (String, String, String, i32, i32, i32, i32, String, Option<String>)>(
        "SELECT id, suite_id, status, total_steps, passed_steps, failed_steps, duration_ms, started_at, finished_at FROM suite_runs WHERE suite_id = ? ORDER BY started_at DESC LIMIT ?"
    )
    .bind(&suite_id).bind(lim)
    .fetch_all(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;

    Ok(rows.into_iter().map(|r| SuiteRun {
        id: r.0, suite_id: r.1, status: r.2, total_steps: r.3,
        passed_steps: r.4, failed_steps: r.5, duration_ms: r.6,
        started_at: r.7, finished_at: r.8,
    }).collect())
}

// --- Report ---

#[tauri::command]
#[specta::specta]
pub async fn export_report(
    run_id: String,
    format: String,
    app: tauri::AppHandle,
) -> Result<String, AppError> {
    let detail = get_suite_run(run_id.clone(), app.clone()).await?;
    let pool = get_pool(&app).await?;

    // Load step names for the report
    let step_names: std::collections::HashMap<String, String> = {
        let rows = sqlx::query_as::<_, (String, String)>(
            "SELECT ts.id, ts.name FROM test_steps ts JOIN step_results sr ON sr.step_id = ts.id WHERE sr.run_id = ?"
        )
        .bind(&run_id)
        .fetch_all(&pool).await.map_err(|e| AppError::Database(e.to_string()))?;
        rows.into_iter().collect()
    };

    // Load suite name
    let suite_name: String = sqlx::query_as::<_, (String,)>(
        "SELECT name FROM test_suites WHERE id = ?"
    )
    .bind(&detail.run.suite_id)
    .fetch_one(&pool).await.map_err(|e| AppError::Database(e.to_string()))?.0;

    match format.as_str() {
        "json" => {
            let report = serde_json::json!({
                "suite": suite_name,
                "run_id": detail.run.id,
                "status": detail.run.status,
                "summary": {
                    "total": detail.run.total_steps,
                    "passed": detail.run.passed_steps,
                    "failed": detail.run.failed_steps,
                },
                "duration_ms": detail.run.duration_ms,
                "started_at": detail.run.started_at,
                "finished_at": detail.run.finished_at,
                "steps": detail.step_results.iter().map(|sr| {
                    let assertion_results: Vec<serde_json::Value> = sr.assertion_results_json.as_ref()
                        .and_then(|s| serde_json::from_str(s).ok())
                        .unwrap_or_default();
                    serde_json::json!({
                        "name": step_names.get(&sr.step_id).unwrap_or(&sr.step_id),
                        "status": sr.status,
                        "duration_ms": sr.duration_ms,
                        "error": sr.error_message,
                        "assertions": assertion_results,
                    })
                }).collect::<Vec<_>>(),
            });
            Ok(serde_json::to_string_pretty(&report)?)
        }
        "html" => {
            let mut html = String::from(r#"<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Test Report</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; background: #f8f9fa; color: #333; }
.card { background: white; border-radius: 8px; padding: 20px; margin: 16px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.summary { display: flex; gap: 24px; }
.stat { text-align: center; }
.stat .num { font-size: 2em; font-weight: bold; }
.passed { color: #22c55e; }
.failed { color: #ef4444; }
.step { border-left: 4px solid #e5e7eb; padding: 8px 16px; margin: 8px 0; }
.step.pass { border-color: #22c55e; }
.step.fail { border-color: #ef4444; }
.assertion { padding: 4px 0; font-size: 0.9em; }
.assertion.pass { color: #16a34a; }
.assertion.fail { color: #dc2626; }
h1 { margin: 0; }
.meta { color: #666; font-size: 0.9em; }
</style>
</head>
<body>
"#);
            html.push_str(&format!(
                r#"<div class="card"><h1>{}</h1><p class="meta">Run: {} | Duration: {}ms | {}</p></div>"#,
                suite_name, detail.run.id, detail.run.duration_ms,
                detail.run.started_at
            ));

            let status_class = if detail.run.status == "passed" { "passed" } else { "failed" };
            html.push_str(&format!(
                r#"<div class="card"><div class="summary"><div class="stat"><div class="num">{}</div>Total</div><div class="stat"><div class="num passed">{}</div>Passed</div><div class="stat"><div class="num failed">{}</div>Failed</div><div class="stat"><div class="num {}">{}</div>Status</div></div></div>"#,
                detail.run.total_steps, detail.run.passed_steps, detail.run.failed_steps,
                status_class, detail.run.status.to_uppercase()
            ));

            html.push_str(r#"<div class="card"><h2>Steps</h2>"#);
            for sr in &detail.step_results {
                let step_name = step_names.get(&sr.step_id).unwrap_or(&sr.step_id);
                let class = if sr.status == "passed" { "pass" } else { "fail" };
                let icon = if sr.status == "passed" { "&#x2705;" } else { "&#x274C;" };
                html.push_str(&format!(
                    r#"<div class="step {class}">{icon} <strong>{step_name}</strong> — {duration}ms"#,
                    class = class, icon = icon, step_name = step_name, duration = sr.duration_ms
                ));

                if let Some(ref ar_json) = sr.assertion_results_json {
                    if let Ok(results) = serde_json::from_str::<Vec<serde_json::Value>>(ar_json) {
                        for ar in &results {
                            let ap = ar.get("passed").and_then(|v| v.as_bool()).unwrap_or(false);
                            let msg = ar.get("message").and_then(|v| v.as_str()).unwrap_or("");
                            let ac = if ap { "pass" } else { "fail" };
                            let ai = if ap { "&#x2705;" } else { "&#x274C;" };
                            html.push_str(&format!(
                                r#"<div class="assertion {ac}">{ai} {msg}</div>"#,
                                ac = ac, ai = ai, msg = msg
                            ));
                        }
                    }
                }

                if let Some(ref err) = sr.error_message {
                    html.push_str(&format!(r#"<div class="assertion fail">Error: {}</div>"#, err));
                }

                html.push_str("</div>");
            }
            html.push_str("</div></body></html>");

            Ok(html)
        }
        _ => Err(AppError::Serialization(format!("Unknown format: {format}"))),
    }
}
