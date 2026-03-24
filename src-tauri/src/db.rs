use tauri_plugin_sql::{Migration, MigrationKind};

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
    ]
}
