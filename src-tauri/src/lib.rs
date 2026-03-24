mod a2a;
mod commands;
mod credentials;
mod db;
mod error;
mod state;

use specta_typescript::Typescript;
use tauri_specta::{collect_commands, Builder};

pub fn run() {
    let builder = Builder::<tauri::Wry>::new()
        .commands(collect_commands![
            commands::settings::get_settings,
            commands::settings::save_setting,
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
        ]);

    #[cfg(debug_assertions)]
    builder
        .export(Typescript::default(), "../src/bindings.ts")
        .expect("Failed to export typescript bindings");

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
