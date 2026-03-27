mod a2a;
mod commands;
mod credentials;
mod db;
mod error;
mod proxy;
mod state;

use specta_typescript::Typescript;
use tauri_specta::{collect_commands, Builder};

pub fn run() {
    let builder = Builder::<tauri::Wry>::new()
        .commands(collect_commands![
            commands::settings::get_settings,
            commands::settings::save_setting,
            commands::settings::get_data_path,
            commands::settings::set_data_path,
            commands::agents::fetch_agent_card,
            commands::agents::add_agent,
            commands::agents::list_agents,
            commands::agents::delete_agent,
            commands::agents::refresh_agent,
            commands::agents::import_agents,
            commands::agents::export_agents,
            commands::tasks::send_task,
            commands::tasks::stream_task,
            commands::tasks::cancel_task,
            commands::history::save_history,
            commands::history::list_history,
            commands::history::clear_history,
            commands::saved_tests::save_test,
            commands::saved_tests::list_saved_tests,
            commands::saved_tests::delete_saved_test,
            commands::workspaces::list_workspaces,
            commands::workspaces::create_workspace,
            commands::workspaces::delete_workspace,
            commands::workspaces::set_active_workspace,
            commands::suites::create_suite,
            commands::suites::update_suite,
            commands::suites::delete_suite,
            commands::suites::list_suites,
            commands::suites::get_suite,
            commands::suites::add_step,
            commands::suites::update_step,
            commands::suites::delete_step,
            commands::suites::reorder_steps,
            commands::suites::list_steps,
            commands::suites::run_test_suite,
            commands::suites::get_suite_run,
            commands::suites::list_suite_runs,
            commands::suites::export_report,
            commands::proxy::start_proxy,
            commands::proxy::stop_proxy,
            commands::proxy::get_proxy_status,
            commands::proxy::create_rule,
            commands::proxy::update_rule,
            commands::proxy::delete_rule,
            commands::proxy::list_rules,
            commands::proxy::toggle_rule,
            commands::proxy::start_recording,
            commands::proxy::stop_recording,
            commands::proxy::list_recordings,
            commands::proxy::get_recording,
            commands::proxy::delete_recording,
            commands::proxy::replay_recording,
            commands::community::list_community_agents,
            commands::community::submit_to_community,
            commands::community::toggle_favorite,
            commands::community::list_favorites,
            commands::community::update_favorite,
            commands::community::check_agent_health,
            commands::community::check_all_health,
            commands::community::list_health_checks,
            commands::community::export_test_suite,
            commands::community::import_test_suite,
            commands::workspace::list_env_vars,
            commands::workspace::set_env_var,
            commands::workspace::delete_env_var,
            commands::workspace::create_chain,
            commands::workspace::update_chain,
            commands::workspace::delete_chain,
            commands::workspace::list_chains,
            commands::workspace::add_chain_step,
            commands::workspace::update_chain_step,
            commands::workspace::delete_chain_step,
            commands::workspace::list_chain_steps,
            commands::workspace::run_chain,
            commands::workspace::export_workspace,
            commands::workspace::import_workspace,
            commands::workspace::diff_responses,
        ]);

    #[cfg(debug_assertions)]
    {
        builder
            .export(Typescript::default(), "../src/bindings.ts")
            .expect("Failed to export typescript bindings");

        // Prepend @ts-nocheck to generated bindings (specta generates conflicting types)
        let bindings_path = std::path::Path::new("../src/bindings.ts");
        if let Ok(content) = std::fs::read_to_string(bindings_path) {
            if !content.starts_with("// @ts-nocheck") {
                let patched = format!("// @ts-nocheck\n{}", content);
                let _ = std::fs::write(bindings_path, patched);
            }
        }
    }

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:workbench.db", db::migrations())
                .build(),
        )
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_keyring::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(state::AppState::new())
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            builder.mount_events(app);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
