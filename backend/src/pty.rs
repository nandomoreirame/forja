use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use tauri::Emitter;

pub struct PtySession {
    writer: Mutex<Box<dyn Write + Send>>,
    #[cfg_attr(not(test), allow(dead_code))]
    pub reader: Mutex<Box<dyn Read + Send>>,
    child: Mutex<Box<dyn portable_pty::Child + Send + Sync>>,
    master: Mutex<Box<dyn MasterPty + Send>>,
}

impl PtySession {
    #[cfg(test)]
    pub fn spawn(
        command: &str,
        cwd: &str,
        rows: u16,
        cols: u16,
    ) -> Result<Self, String> {
        Self::spawn_with_args(command, &[], cwd, rows, cols)
    }

    pub fn spawn_with_args(
        command: &str,
        args: &[&str],
        cwd: &str,
        rows: u16,
        cols: u16,
    ) -> Result<Self, String> {
        let pty_system = native_pty_system();
        let size = PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        };

        let pair = pty_system.openpty(size).map_err(|e| e.to_string())?;

        let mut cmd = CommandBuilder::new(command);
        for arg in args {
            cmd.arg(arg);
        }
        cmd.cwd(cwd);
        cmd.env("TERM", "xterm-256color");

        let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
        drop(pair.slave);

        let reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
        let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

        Ok(Self {
            writer: Mutex::new(writer),
            reader: Mutex::new(reader),
            child: Mutex::new(child),
            master: Mutex::new(pair.master),
        })
    }

    pub fn write(&self, data: &[u8]) -> Result<(), String> {
        self.writer
            .lock()
            .map_err(|e| e.to_string())?
            .write_all(data)
            .map_err(|e| e.to_string())
    }

    pub fn resize(&self, rows: u16, cols: u16) -> Result<(), String> {
        self.master
            .lock()
            .map_err(|e| e.to_string())?
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())
    }

    pub fn kill(&self) -> Result<(), String> {
        self.child
            .lock()
            .map_err(|e| e.to_string())?
            .kill()
            .map_err(|e| e.to_string())
    }
}

#[derive(Clone, serde::Serialize)]
pub struct PtyDataPayload {
    pub tab_id: String,
    pub data: String,
}

#[derive(Clone, serde::Serialize)]
pub struct PtyExitPayload {
    pub tab_id: String,
    pub code: i32,
}

fn get_user_shell() -> String {
    std::env::var("SHELL").unwrap_or_else(|_| "bash".to_string())
}

fn spawn_session(cwd: &str, session_type: Option<&str>) -> Result<PtySession, String> {
    let shell = get_user_shell();
    match session_type {
        Some("terminal") => PtySession::spawn_with_args(&shell, &["-l"], cwd, 24, 80),
        _ => PtySession::spawn_with_args(&shell, &["-l", "-c", "exec claude --dangerously-skip-permissions --verbose"], cwd, 24, 80),
    }
}

pub struct PtyState {
    pub sessions: Arc<Mutex<HashMap<String, PtySession>>>,
}

impl Default for PtyState {
    fn default() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

#[tauri::command]
pub async fn spawn_pty(
    state: tauri::State<'_, PtyState>,
    app: tauri::AppHandle,
    tab_id: String,
    path: String,
    session_type: Option<String>,
    window_label: String,
) -> Result<String, String> {
    let session = spawn_session(&path, session_type.as_deref())?;

    let reader = session
        .master
        .lock()
        .map_err(|e| e.to_string())?
        .try_clone_reader()
        .map_err(|e| e.to_string())?;

    // Store session
    {
        let mut sessions = state.sessions.lock().map_err(|e| e.to_string())?;
        sessions.insert(tab_id.clone(), session);
    }

    // Start reader thread scoped to this tab_id + window_label
    let app_handle = app.clone();
    let reader_tab_id = tab_id.clone();
    let reader_window_label = window_label;
    std::thread::spawn(move || {
        let mut reader = reader;
        let mut buf = [0u8; 32768];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => {
                    let _ = app_handle.emit_to(&reader_window_label, "pty:exit", PtyExitPayload {
                        tab_id: reader_tab_id.clone(),
                        code: 0,
                    });
                    break;
                }
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app_handle.emit_to(&reader_window_label, "pty:data", PtyDataPayload {
                        tab_id: reader_tab_id.clone(),
                        data,
                    });
                }
                Err(_) => {
                    let _ = app_handle.emit_to(&reader_window_label, "pty:exit", PtyExitPayload {
                        tab_id: reader_tab_id.clone(),
                        code: 1,
                    });
                    break;
                }
            }
        }
    });

    Ok(tab_id)
}

#[tauri::command]
pub async fn write_pty(
    state: tauri::State<'_, PtyState>,
    tab_id: String,
    data: String,
) -> Result<(), String> {
    let sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    let session = sessions.get(&tab_id).ok_or(format!("No PTY session for tab {}", tab_id))?;
    session.write(data.as_bytes())
}

#[tauri::command]
pub async fn resize_pty(
    state: tauri::State<'_, PtyState>,
    tab_id: String,
    rows: u16,
    cols: u16,
) -> Result<(), String> {
    let sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    let session = sessions.get(&tab_id).ok_or(format!("No PTY session for tab {}", tab_id))?;
    session.resize(rows, cols)
}

#[tauri::command]
pub async fn close_pty(
    state: tauri::State<'_, PtyState>,
    tab_id: String,
) -> Result<(), String> {
    let mut sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    if let Some(session) = sessions.remove(&tab_id) {
        session.kill()?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_spawn_reads_output() {
        let pty_system = portable_pty::native_pty_system();
        let size = portable_pty::PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        };

        let pair = pty_system.openpty(size).expect("Failed to open PTY");

        let mut cmd = portable_pty::CommandBuilder::new("echo");
        cmd.arg("hello-from-pty");

        let mut child = pair.slave.spawn_command(cmd).expect("Failed to spawn");
        drop(pair.slave);

        let mut reader = pair.master.try_clone_reader().expect("Failed to clone reader");

        child.wait().expect("Failed to wait for child");

        let mut output = String::new();
        // Read with a small buffer to get available output
        let mut buf = [0u8; 1024];
        if let Ok(n) = reader.read(&mut buf) {
            output = String::from_utf8_lossy(&buf[..n]).to_string();
        }

        assert!(
            output.contains("hello-from-pty"),
            "Expected output to contain 'hello-from-pty', got: {:?}",
            output
        );
    }

    #[test]
    fn test_pty_session_write_and_read() {
        // Use 'cat' which echoes input back
        let session = PtySession::spawn("cat", &std::env::temp_dir().to_string_lossy(), 24, 80)
            .expect("Failed to spawn cat");

        let input = "test-input\n";
        session.write(input.as_bytes()).expect("Failed to write");

        let mut buf = [0u8; 1024];
        let mut output = String::new();

        // cat echoes input, so we should see our input
        // Use a short timeout approach: read in a loop with a deadline
        let start = std::time::Instant::now();
        let timeout = std::time::Duration::from_secs(3);
        let mut total_read = 0;

        while start.elapsed() < timeout {
            match session.reader.lock().unwrap().read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    output.push_str(&String::from_utf8_lossy(&buf[..n]));
                    total_read += n;
                    if output.contains("test-input") {
                        break;
                    }
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    std::thread::sleep(std::time::Duration::from_millis(50));
                }
                Err(_) => break,
            }
        }

        assert!(
            output.contains("test-input"),
            "Expected echoed input, got: {:?} (read {} bytes)",
            output,
            total_read
        );

        session.kill().expect("Failed to kill");
    }

    #[test]
    fn test_pty_session_resize() {
        let session = PtySession::spawn("cat", &std::env::temp_dir().to_string_lossy(), 24, 80)
            .expect("Failed to spawn cat");

        let result = session.resize(48, 120);
        assert!(result.is_ok(), "Resize failed: {:?}", result.err());

        session.kill().expect("Failed to kill");
    }

    #[test]
    fn test_pty_session_kill() {
        let session = PtySession::spawn("cat", &std::env::temp_dir().to_string_lossy(), 24, 80)
            .expect("Failed to spawn cat");

        let result = session.kill();
        assert!(result.is_ok(), "Kill failed: {:?}", result.err());
    }

    #[test]
    fn test_spawn_with_args_passes_arguments() {
        let session = PtySession::spawn_with_args(
            "echo",
            &["hello", "from", "args"],
            &std::env::temp_dir().to_string_lossy(),
            24,
            80,
        )
        .expect("Failed to spawn echo with args");

        let mut buf = [0u8; 1024];
        let mut output = String::new();

        let start = std::time::Instant::now();
        let timeout = std::time::Duration::from_secs(3);

        while start.elapsed() < timeout {
            match session.reader.lock().unwrap().read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    output.push_str(&String::from_utf8_lossy(&buf[..n]));
                    if output.contains("hello") {
                        break;
                    }
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    std::thread::sleep(std::time::Duration::from_millis(50));
                }
                Err(_) => break,
            }
        }

        assert!(
            output.contains("hello from args"),
            "Expected 'hello from args', got: {:?}",
            output
        );
    }

    #[test]
    fn test_spawn_session_terminal_uses_login_shell() {
        // Terminal session should spawn a login shell that has TERM set
        let session = spawn_session(
            &std::env::temp_dir().to_string_lossy(),
            Some("terminal"),
        )
        .expect("Failed to spawn terminal session");

        // Write a command to check TERM, then exit
        session.write(b"printenv TERM && exit\n").expect("Failed to write");

        let mut buf = [0u8; 4096];
        let mut output = String::new();

        let start = std::time::Instant::now();
        let timeout = std::time::Duration::from_secs(5);

        while start.elapsed() < timeout {
            match session.reader.lock().unwrap().read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    output.push_str(&String::from_utf8_lossy(&buf[..n]));
                    if output.contains("xterm-256color") {
                        break;
                    }
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    std::thread::sleep(std::time::Duration::from_millis(50));
                }
                Err(_) => break,
            }
        }

        assert!(
            output.contains("xterm-256color"),
            "Expected TERM=xterm-256color in terminal session, got: {:?}",
            output
        );

        let _ = session.kill();
    }

    #[test]
    fn test_pty_state_default_is_empty() {
        let state = PtyState::default();
        let sessions = state.sessions.lock().unwrap();
        assert!(sessions.is_empty());
    }

    #[test]
    fn test_spawn_sets_term_env_var() {
        let session = PtySession::spawn_with_args(
            "printenv",
            &["TERM"],
            &std::env::temp_dir().to_string_lossy(),
            24,
            80,
        )
        .expect("Failed to spawn printenv TERM");

        let mut buf = [0u8; 1024];
        let mut output = String::new();

        let start = std::time::Instant::now();
        let timeout = std::time::Duration::from_secs(3);

        while start.elapsed() < timeout {
            match session.reader.lock().unwrap().read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    output.push_str(&String::from_utf8_lossy(&buf[..n]));
                    if output.contains("xterm") {
                        break;
                    }
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    std::thread::sleep(std::time::Duration::from_millis(50));
                }
                Err(_) => break,
            }
        }

        assert!(
            output.contains("xterm-256color"),
            "Expected 'xterm-256color' from printenv TERM, got: {:?}",
            output
        );
    }

    #[test]
    fn test_spawn_inherits_path_env_var() {
        let session = PtySession::spawn_with_args(
            "printenv",
            &["PATH"],
            &std::env::temp_dir().to_string_lossy(),
            24,
            80,
        )
        .expect("Failed to spawn printenv PATH");

        let mut buf = [0u8; 4096];
        let mut output = String::new();

        let start = std::time::Instant::now();
        let timeout = std::time::Duration::from_secs(3);

        while start.elapsed() < timeout {
            match session.reader.lock().unwrap().read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    output.push_str(&String::from_utf8_lossy(&buf[..n]));
                    if output.contains("/") {
                        break;
                    }
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    std::thread::sleep(std::time::Duration::from_millis(50));
                }
                Err(_) => break,
            }
        }

        assert!(
            !output.trim().is_empty(),
            "Expected PATH value (inherited from parent), got empty output",
        );
    }
}
