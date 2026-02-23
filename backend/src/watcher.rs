use notify_debouncer_mini::{new_debouncer, DebounceEventResult};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;
use tauri::Emitter;

const DEBOUNCE_MS: u64 = 500;

type Debouncer = notify_debouncer_mini::Debouncer<notify::RecommendedWatcher>;

pub struct WatcherState {
    /// Map of window_label -> (debouncer, watched_path)
    watchers: Mutex<HashMap<String, (Debouncer, String)>>,
}

impl Default for WatcherState {
    fn default() -> Self {
        Self {
            watchers: Mutex::new(HashMap::new()),
        }
    }
}

impl WatcherState {
    pub fn stop_watchers_for_label(&self, window_label: &str) {
        let mut watchers = self.watchers.lock().unwrap();
        watchers.remove(window_label);
    }
}

#[tauri::command]
pub fn start_watcher(
    path: String,
    window_label: String,
    app: tauri::AppHandle,
    state: tauri::State<'_, WatcherState>,
) -> Result<(), String> {
    // Stop existing watcher for this window first
    stop_watcher_inner(&state, &window_label);

    let git_dir = PathBuf::from(&path).join(".git");
    if !git_dir.exists() {
        return Err("Not a git repository".to_string());
    }

    let target_label = window_label.clone();
    let app_handle = app.clone();
    let debouncer = new_debouncer(
        Duration::from_millis(DEBOUNCE_MS),
        move |result: DebounceEventResult| {
            if let Ok(events) = result {
                if !events.is_empty() {
                    let _ = app_handle.emit_to(&target_label, "git:changed", ());
                }
            }
        },
    )
    .map_err(|e| format!("Failed to create watcher: {}", e))?;

    let mut debouncer = debouncer;
    debouncer
        .watcher()
        .watch(&git_dir, notify::RecursiveMode::Recursive)
        .map_err(|e| format!("Failed to watch .git directory: {}", e))?;

    let mut watchers = state.watchers.lock().unwrap();
    watchers.insert(window_label, (debouncer, path));

    Ok(())
}

#[tauri::command]
pub fn stop_watcher(
    window_label: String,
    state: tauri::State<'_, WatcherState>,
) -> Result<(), String> {
    stop_watcher_inner(&state, &window_label);
    Ok(())
}

fn stop_watcher_inner(state: &WatcherState, window_label: &str) {
    let mut watchers = state.watchers.lock().unwrap();
    watchers.remove(window_label);
}
