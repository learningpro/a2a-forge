use sqlx::Sqlite;
use tauri::Manager;
use tauri_plugin_sql::{DbInstances, DbPool, Migration, MigrationKind};

use crate::error::AppError;

pub async fn get_pool(app: &tauri::AppHandle) -> Result<sqlx::Pool<Sqlite>, AppError> {
    let instances = app.state::<DbInstances>();
    let guard = instances.0.read().await;
    let db = guard
        .get("sqlite:workbench.db")
        .ok_or_else(|| AppError::Database("Database not initialized".into()))?;
    match db {
        DbPool::Sqlite(pool) => Ok(pool.clone()),
        #[allow(unreachable_patterns)]
        _ => Err(AppError::Database("Expected SQLite pool".into())),
    }
}

pub fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "enable_wal_and_create_workspaces",
            sql: "
                PRAGMA journal_mode=WAL;
                PRAGMA busy_timeout=5000;
                CREATE TABLE IF NOT EXISTS workspaces (
                    id         TEXT PRIMARY KEY,
                    name       TEXT NOT NULL,
                    created_at INTEGER NOT NULL
                );
                INSERT OR IGNORE INTO workspaces(id, name, created_at)
                    VALUES('default', 'Default', unixepoch());
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_agents",
            sql: "
                CREATE TABLE IF NOT EXISTS agents (
                    id              TEXT PRIMARY KEY,
                    url             TEXT NOT NULL UNIQUE,
                    nickname        TEXT,
                    card_json       TEXT NOT NULL,
                    last_fetched_at INTEGER NOT NULL,
                    workspace_id    TEXT NOT NULL REFERENCES workspaces(id)
                );
                CREATE INDEX idx_agents_workspace ON agents(workspace_id);
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create_history",
            sql: "
                CREATE TABLE IF NOT EXISTS history (
                    id            TEXT PRIMARY KEY,
                    agent_id      TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
                    skill_name    TEXT NOT NULL,
                    request_json  TEXT NOT NULL,
                    response_json TEXT,
                    status        TEXT NOT NULL,
                    duration_ms   INTEGER,
                    created_at    INTEGER NOT NULL
                );
                CREATE INDEX idx_history_agent ON history(agent_id);
                CREATE INDEX idx_history_created ON history(created_at DESC);
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "create_saved_tests",
            sql: "
                CREATE TABLE IF NOT EXISTS saved_tests (
                    id           TEXT PRIMARY KEY,
                    name         TEXT NOT NULL,
                    agent_id     TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
                    skill_name   TEXT NOT NULL,
                    request_json TEXT NOT NULL,
                    created_at   INTEGER NOT NULL
                );
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "create_settings",
            sql: r#"
                CREATE TABLE IF NOT EXISTS settings (
                    key   TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
                INSERT OR IGNORE INTO settings VALUES
                    ('theme', '"system"'),
                    ('timeout_seconds', '30'),
                    ('proxy_url', 'null');
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "create_test_suites_and_runs",
            sql: r#"
                CREATE TABLE IF NOT EXISTS test_suites (
                    id           TEXT PRIMARY KEY,
                    name         TEXT NOT NULL,
                    description  TEXT DEFAULT '',
                    agent_id     TEXT,
                    workspace_id TEXT NOT NULL,
                    run_mode     TEXT DEFAULT 'sequential',
                    created_at   TEXT DEFAULT (datetime('now')),
                    updated_at   TEXT DEFAULT (datetime('now')),
                    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
                    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS test_steps (
                    id              TEXT PRIMARY KEY,
                    suite_id        TEXT NOT NULL,
                    sort_order      INTEGER NOT NULL,
                    name            TEXT NOT NULL,
                    agent_id        TEXT NOT NULL,
                    skill_name      TEXT NOT NULL,
                    request_json    TEXT NOT NULL,
                    assertions_json TEXT DEFAULT '[]',
                    timeout_ms      INTEGER DEFAULT 60000,
                    FOREIGN KEY (suite_id) REFERENCES test_suites(id) ON DELETE CASCADE,
                    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS suite_runs (
                    id           TEXT PRIMARY KEY,
                    suite_id     TEXT NOT NULL,
                    status       TEXT DEFAULT 'running',
                    total_steps  INTEGER DEFAULT 0,
                    passed_steps INTEGER DEFAULT 0,
                    failed_steps INTEGER DEFAULT 0,
                    duration_ms  INTEGER DEFAULT 0,
                    started_at   TEXT DEFAULT (datetime('now')),
                    finished_at  TEXT,
                    FOREIGN KEY (suite_id) REFERENCES test_suites(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS step_results (
                    id                    TEXT PRIMARY KEY,
                    run_id                TEXT NOT NULL,
                    step_id               TEXT NOT NULL,
                    status                TEXT DEFAULT 'pending',
                    response_json         TEXT,
                    assertion_results_json TEXT,
                    error_message         TEXT,
                    duration_ms           INTEGER DEFAULT 0,
                    FOREIGN KEY (run_id) REFERENCES suite_runs(id) ON DELETE CASCADE,
                    FOREIGN KEY (step_id) REFERENCES test_steps(id) ON DELETE CASCADE
                );

                CREATE INDEX idx_test_suites_workspace ON test_suites(workspace_id);
                CREATE INDEX idx_test_steps_suite ON test_steps(suite_id);
                CREATE INDEX idx_suite_runs_suite ON suite_runs(suite_id);
                CREATE INDEX idx_step_results_run ON step_results(run_id);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "create_proxy_tables",
            sql: r#"
                CREATE TABLE IF NOT EXISTS intercept_rules (
                    id           TEXT PRIMARY KEY,
                    name         TEXT NOT NULL,
                    enabled      INTEGER DEFAULT 1,
                    match_type   TEXT NOT NULL,
                    match_value  TEXT DEFAULT '',
                    action_type  TEXT NOT NULL,
                    action_json  TEXT NOT NULL,
                    priority     INTEGER DEFAULT 0,
                    workspace_id TEXT NOT NULL,
                    created_at   TEXT DEFAULT (datetime('now')),
                    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS traffic_records (
                    id            TEXT PRIMARY KEY,
                    session_name  TEXT NOT NULL,
                    agent_id      TEXT,
                    skill_name    TEXT,
                    request_json  TEXT NOT NULL,
                    response_json TEXT,
                    status_code   INTEGER,
                    duration_ms   INTEGER,
                    timestamp     TEXT DEFAULT (datetime('now')),
                    workspace_id  TEXT NOT NULL,
                    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
                );

                CREATE INDEX idx_intercept_rules_workspace ON intercept_rules(workspace_id);
                CREATE INDEX idx_traffic_records_session ON traffic_records(session_name);
                CREATE INDEX idx_traffic_records_workspace ON traffic_records(workspace_id);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "create_community_tables",
            sql: r#"
                CREATE TABLE IF NOT EXISTS community_agents (
                    id           TEXT PRIMARY KEY,
                    name         TEXT NOT NULL,
                    description  TEXT DEFAULT '',
                    url          TEXT NOT NULL UNIQUE,
                    card_json    TEXT NOT NULL,
                    tags         TEXT DEFAULT '[]',
                    author       TEXT DEFAULT '',
                    stars        INTEGER DEFAULT 0,
                    last_checked TEXT DEFAULT (datetime('now')),
                    created_at   TEXT DEFAULT (datetime('now'))
                );

                CREATE TABLE IF NOT EXISTS favorites (
                    id         TEXT PRIMARY KEY,
                    agent_id   TEXT NOT NULL,
                    folder     TEXT DEFAULT 'default',
                    notes      TEXT DEFAULT '',
                    created_at TEXT DEFAULT (datetime('now')),
                    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS health_checks (
                    id         TEXT PRIMARY KEY,
                    agent_id   TEXT NOT NULL,
                    status     TEXT NOT NULL,
                    latency_ms INTEGER,
                    error      TEXT,
                    checked_at TEXT DEFAULT (datetime('now')),
                    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
                );

                ALTER TABLE test_suites ADD COLUMN shared INTEGER DEFAULT 0;
                ALTER TABLE test_suites ADD COLUMN share_code TEXT;

                CREATE INDEX idx_community_agents_url ON community_agents(url);
                CREATE INDEX idx_favorites_agent ON favorites(agent_id);
                CREATE INDEX idx_health_checks_agent ON health_checks(agent_id);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "create_workspace_advanced_tables",
            sql: r#"
                CREATE TABLE IF NOT EXISTS env_variables (
                    id           TEXT PRIMARY KEY,
                    workspace_id TEXT NOT NULL,
                    name         TEXT NOT NULL,
                    value        TEXT NOT NULL,
                    is_secret    INTEGER DEFAULT 0,
                    created_at   TEXT DEFAULT (datetime('now')),
                    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
                    UNIQUE(workspace_id, name)
                );

                CREATE TABLE IF NOT EXISTS request_chains (
                    id           TEXT PRIMARY KEY,
                    name         TEXT NOT NULL,
                    description  TEXT DEFAULT '',
                    workspace_id TEXT NOT NULL,
                    created_at   TEXT DEFAULT (datetime('now')),
                    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS chain_steps (
                    id            TEXT PRIMARY KEY,
                    chain_id      TEXT NOT NULL,
                    sort_order    INTEGER NOT NULL,
                    name          TEXT NOT NULL,
                    agent_id      TEXT NOT NULL,
                    skill_name    TEXT NOT NULL,
                    request_json  TEXT NOT NULL,
                    extract_json  TEXT DEFAULT '{}',
                    timeout_ms    INTEGER DEFAULT 60000,
                    FOREIGN KEY (chain_id) REFERENCES request_chains(id) ON DELETE CASCADE,
                    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
                );

                CREATE INDEX idx_env_variables_workspace ON env_variables(workspace_id);
                CREATE INDEX idx_request_chains_workspace ON request_chains(workspace_id);
                CREATE INDEX idx_chain_steps_chain ON chain_steps(chain_id);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 10,
            description: "remove_agents_url_unique",
            sql: r#"
                CREATE TABLE agents_new (
                    id              TEXT PRIMARY KEY,
                    url             TEXT NOT NULL,
                    nickname        TEXT,
                    card_json       TEXT NOT NULL,
                    last_fetched_at INTEGER NOT NULL,
                    workspace_id    TEXT NOT NULL REFERENCES workspaces(id)
                );
                INSERT INTO agents_new SELECT * FROM agents;
                DROP TABLE agents;
                ALTER TABLE agents_new RENAME TO agents;
                CREATE INDEX idx_agents_workspace ON agents(workspace_id);
            "#,
            kind: MigrationKind::Up,
        },
    ]
}
