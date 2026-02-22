mod file_tree;
mod metrics;

use metrics::MetricsCollector;
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
        .invoke_handler(tauri::generate_handler![greet, file_tree::read_directory_tree_command])
        .setup(|app| {
            let handle = app.handle().clone();
            thread::spawn(move || {
                let mut collector = MetricsCollector::new();
                // Initial pause so sysinfo can compute accurate CPU usage
                thread::sleep(Duration::from_secs(1));

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
