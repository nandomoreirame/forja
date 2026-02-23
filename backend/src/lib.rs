mod file_reader;
mod file_tree;
mod git_info;
mod metrics;
mod pty;

use metrics::MetricsCollector;
use pty::PtyState;
use std::thread;
use std::time::Duration;
use tauri::Emitter;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Forja.", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(PtyState::default())
        .invoke_handler(tauri::generate_handler![
            greet,
            file_reader::read_file_command,
            file_tree::read_directory_tree_command,
            pty::spawn_pty,
            pty::write_pty,
            pty::resize_pty,
            pty::close_pty,
            git_info::get_git_info_command,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            thread::spawn(move || {
                let mut collector = MetricsCollector::new();
                // Short pause so sysinfo can compute accurate CPU usage
                thread::sleep(Duration::from_millis(250));

                loop {
                    let metrics = collector.collect();
                    let _ = handle.emit("system-metrics", &metrics);
                    thread::sleep(Duration::from_secs(2));
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
