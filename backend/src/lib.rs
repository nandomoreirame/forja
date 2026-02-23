mod config;
mod file_reader;
mod file_tree;
mod git_info;
mod metrics;
mod pty;
mod watcher;

use metrics::MetricsCollector;
use pty::PtyState;
use watcher::WatcherState;
use std::sync::atomic::{AtomicU64, Ordering};
use std::thread;
use std::time::Duration;
use tauri::{Emitter, Manager};
use tauri::webview::WebviewWindowBuilder;

static WINDOW_COUNTER: AtomicU64 = AtomicU64::new(0);

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Forja.", name)
}

#[tauri::command]
fn check_claude_installed() -> Result<String, String> {
    if cfg!(target_os = "windows") {
        let cmd = std::process::Command::new("where")
            .arg("claude")
            .output();
        match cmd {
            Ok(output) if output.status.success() => {
                let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                Ok(path)
            }
            Ok(_) => Err("Claude Code CLI not found in PATH".to_string()),
            Err(e) => Err(format!("Failed to check for claude: {}", e)),
        }
    } else {
        // Use a login shell to resolve the full user PATH, since desktop-launched
        // apps inherit a minimal PATH that excludes ~/.local/bin, ~/.nvm, etc.
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "bash".to_string());
        let cmd = std::process::Command::new(&shell)
            .args(["-l", "-c", "which claude"])
            .output();
        match cmd {
            Ok(output) if output.status.success() => {
                let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                Ok(path)
            }
            Ok(_) => Err("Claude Code CLI not found in PATH".to_string()),
            Err(e) => Err(format!("Failed to check for claude: {}", e)),
        }
    }
}

#[tauri::command]
fn get_recent_projects() -> Vec<config::RecentProject> {
    config::load_config().recent_projects
}

#[tauri::command]
fn add_recent_project(path: String) -> Result<(), String> {
    config::add_recent_project(&path)
}

#[tauri::command]
fn open_project_in_new_window(app: tauri::AppHandle, path: String) -> Result<String, String> {
    let id = WINDOW_COUNTER.fetch_add(1, Ordering::SeqCst);
    let label = format!("project-{}", id);

    let encoded_path = urlencoding::encode(&path);
    let url = format!("index.html?project={}", encoded_path);

    WebviewWindowBuilder::new(
        &app,
        &label,
        tauri::WebviewUrl::App(url.into()),
    )
    .title("Forja")
    .inner_size(1200.0, 800.0)
    .min_inner_size(800.0, 600.0)
    .decorations(false)
    .focused(true)
    .build()
    .map_err(|e| format!("Failed to create window: {}", e))?;

    Ok(label)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(PtyState::default())
        .manage(WatcherState::default())
        .invoke_handler(tauri::generate_handler![
            greet,
            file_reader::read_file_command,
            file_tree::read_directory_tree_command,
            pty::spawn_pty,
            pty::write_pty,
            pty::resize_pty,
            pty::close_pty,
            git_info::get_git_info_command,
            check_claude_installed,
            get_recent_projects,
            add_recent_project,
            open_project_in_new_window,
            watcher::start_watcher,
            watcher::stop_watcher,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let label = window.label().to_string();
                if let Some(state) = window.try_state::<WatcherState>() {
                    state.stop_watchers_for_label(&label);
                }
            }
        })
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
