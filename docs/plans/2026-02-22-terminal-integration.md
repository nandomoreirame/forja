# Terminal Integration (xterm.js + portable-pty) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use implement-plan to implement this plan task-by-task.

**Goal:** Replace the "Project loaded" placeholder with a functional xterm.js terminal connected to a `claude` PTY process via Tauri IPC.

**Architecture:** Rust backend manages the PTY lifecycle using `portable-pty` (spawn, read, write, resize, kill). A reader thread streams output via Tauri Events (`pty:data`, `pty:exit`). React frontend renders the terminal using `@xterm/xterm` with Catppuccin Mocha theme, receiving output events and sending input via Tauri Commands.

**Tech Stack:** portable-pty 0.9 (Rust), @xterm/xterm 6.x + @xterm/addon-fit + @xterm/addon-web-links (TypeScript), Tauri 2 IPC (Commands + Events), Vitest (frontend tests), Rust #[cfg(test)] (backend tests)

---

## Task 1: Add portable-pty dependency

**Files:**

- Modify: `backend/Cargo.toml`

**Step 1: Add portable-pty to dependencies**

In `backend/Cargo.toml`, add under `[dependencies]`:

```toml
portable-pty = "0.9"
```

**Step 2: Verify it compiles**

```bash
cd backend && cargo check
```

Expected: compiles without errors.

**Step 3: Commit**

```bash
git add backend/Cargo.toml
git commit -m "chore(backend): add portable-pty dependency for PTY management"
```

---

## Task 2: Create PTY module with types and spawn test

**Files:**

- Create: `backend/src/pty.rs`
- Modify: `backend/src/lib.rs` (add `mod pty;`)

**Step 1: Write the failing test for PTY spawn**

Create `backend/src/pty.rs` with the test first:

```rust
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
}
```

Add the minimal module structure above the tests:

```rust
use std::io::Read;

// Types and implementation will go here
```

And in `backend/src/lib.rs`, add near the top:

```rust
mod pty;
```

**Step 2: Run test to verify it passes**

```bash
cd backend && cargo test test_spawn_reads_output -- --nocapture
```

Expected: PASS (this test validates that portable-pty works correctly on this system).

**Step 3: Commit**

```bash
git add backend/src/pty.rs backend/src/lib.rs
git commit -m "test(backend): add PTY spawn output test with portable-pty"
```

---

## Task 3: Implement PtySession struct and spawn logic

**Files:**

- Modify: `backend/src/pty.rs`

**Step 1: Write tests for PtySession lifecycle**

Add these tests to `backend/src/pty.rs` in the `tests` module:

```rust
    #[test]
    fn test_pty_session_write_and_read() {
        // Use 'cat' which echoes input back
        let session = PtySession::spawn("cat", &std::env::temp_dir().to_string_lossy(), 24, 80)
            .expect("Failed to spawn cat");

        let reader = session.reader;
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
            match reader.lock().unwrap().read(&mut buf) {
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
```

**Step 2: Run tests to verify they fail**

```bash
cd backend && cargo test pty::tests -- --nocapture 2>&1 | head -30
```

Expected: FAIL with `PtySession` not found.

**Step 3: Implement PtySession**

Add the implementation above the `#[cfg(test)]` block in `backend/src/pty.rs`:

```rust
use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use std::io::{Read, Write};
use std::sync::Mutex;

pub struct PtySession {
    writer: Mutex<Box<dyn Write + Send>>,
    pub reader: Mutex<Box<dyn Read + Send>>,
    child: Mutex<Box<dyn portable_pty::Child + Send + Sync>>,
    master: Mutex<Box<dyn MasterPty + Send>>,
}

impl PtySession {
    pub fn spawn(
        command: &str,
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
        cmd.cwd(cwd);

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
```

**Step 4: Run tests to verify they pass**

```bash
cd backend && cargo test pty::tests -- --nocapture
```

Expected: ALL PASS.

**Step 5: Commit**

```bash
git add backend/src/pty.rs
git commit -m "feat(backend): implement PtySession with spawn, write, resize, kill"
```

---

## Task 4: Implement Tauri commands for PTY

**Files:**

- Modify: `backend/src/pty.rs` (add Tauri commands)

**Step 1: Add Tauri commands**

Add the following Tauri state and commands to `backend/src/pty.rs`, below the `PtySession` impl block:

```rust
use std::sync::Arc;
use tauri::Emitter;

pub struct PtyState {
    pub session: Arc<Mutex<Option<PtySession>>>,
}

impl Default for PtyState {
    fn default() -> Self {
        Self {
            session: Arc::new(Mutex::new(None)),
        }
    }
}

#[tauri::command]
pub async fn spawn_pty(
    state: tauri::State<'_, PtyState>,
    app: tauri::AppHandle,
    path: String,
) -> Result<(), String> {
    // Close existing session if any
    {
        let mut guard = state.session.lock().map_err(|e| e.to_string())?;
        if let Some(old_session) = guard.take() {
            let _ = old_session.kill();
        }
    }

    let session = PtySession::spawn("claude", &path, 24, 80)?;

    // Take the reader out for the streaming thread
    let reader = {
        let mut r = session.reader.lock().map_err(|e| e.to_string())?;
        // We need to move the reader out, so we swap it with a dummy
        // Actually, we should restructure: reader should be separate from session
        // For now, let's use try_clone_reader approach differently
        drop(r);
        // Re-get reader from master before storing session
        session
            .master
            .lock()
            .map_err(|e| e.to_string())?
            .try_clone_reader()
            .map_err(|e| e.to_string())?
    };

    // Store session
    {
        let mut guard = state.session.lock().map_err(|e| e.to_string())?;
        *guard = Some(session);
    }

    // Start reader thread
    let app_handle = app.clone();
    std::thread::spawn(move || {
        let mut reader = reader;
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => {
                    let _ = app_handle.emit("pty:exit", 0);
                    break;
                }
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app_handle.emit("pty:data", &data);
                }
                Err(_) => {
                    let _ = app_handle.emit("pty:exit", 1);
                    break;
                }
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn write_pty(
    state: tauri::State<'_, PtyState>,
    data: String,
) -> Result<(), String> {
    let guard = state.session.lock().map_err(|e| e.to_string())?;
    let session = guard.as_ref().ok_or("No active PTY session")?;
    session.write(data.as_bytes())
}

#[tauri::command]
pub async fn resize_pty(
    state: tauri::State<'_, PtyState>,
    rows: u16,
    cols: u16,
) -> Result<(), String> {
    let guard = state.session.lock().map_err(|e| e.to_string())?;
    let session = guard.as_ref().ok_or("No active PTY session")?;
    session.resize(rows, cols)
}

#[tauri::command]
pub async fn close_pty(
    state: tauri::State<'_, PtyState>,
) -> Result<(), String> {
    let mut guard = state.session.lock().map_err(|e| e.to_string())?;
    if let Some(session) = guard.take() {
        session.kill()?;
    }
    Ok(())
}
```

**NOTE:** The `spawn_pty` command uses `try_clone_reader()` a second time from the master to get a separate reader for the streaming thread. This is necessary because the first reader stored in `PtySession` is for testing purposes. In production, we stream via the thread.

**Step 2: Verify compilation**

```bash
cd backend && cargo check
```

Expected: compiles without errors.

**Step 3: Commit**

```bash
git add backend/src/pty.rs
git commit -m "feat(backend): add Tauri commands for PTY (spawn, write, resize, close)"
```

---

## Task 5: Register PTY module in lib.rs

**Files:**

- Modify: `backend/src/lib.rs`

**Step 1: Update lib.rs to register PTY commands and state**

Replace the full content of `backend/src/lib.rs`:

```rust
mod file_tree;
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
            file_tree::read_directory_tree_command,
            pty::spawn_pty,
            pty::write_pty,
            pty::resize_pty,
            pty::close_pty,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            thread::spawn(move || {
                let mut collector = MetricsCollector::new();
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
```

**Step 2: Run all backend tests**

```bash
cd backend && cargo test -- --nocapture
```

Expected: ALL PASS (file_tree tests + pty tests).

**Step 3: Verify full compilation**

```bash
cd backend && cargo build
```

Expected: builds successfully.

**Step 4: Commit**

```bash
git add backend/src/lib.rs
git commit -m "feat(backend): register PTY commands and state in Tauri app"
```

---

## Task 6: Install xterm.js packages

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Step 1: Install packages**

```bash
pnpm add @xterm/xterm @xterm/addon-fit @xterm/addon-web-links
```

**Step 2: Verify install**

```bash
pnpm ls @xterm/xterm @xterm/addon-fit @xterm/addon-web-links
```

Expected: all three packages listed with version numbers.

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(frontend): add xterm.js packages for terminal emulation"
```

---

## Task 7: Create terminal theme constants

**Files:**

- Create: `frontend/lib/terminal-theme.ts`
- Create: `frontend/lib/__tests__/terminal-theme.test.ts`

**Step 1: Write the failing test**

Create `frontend/lib/__tests__/terminal-theme.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { TERMINAL_THEME, TERMINAL_OPTIONS } from "../terminal-theme";

describe("TERMINAL_THEME", () => {
  it("has Catppuccin Mocha background color", () => {
    expect(TERMINAL_THEME.background).toBe("#1e1e2e");
  });

  it("has Catppuccin Mocha foreground color", () => {
    expect(TERMINAL_THEME.foreground).toBe("#cdd6f4");
  });

  it("has Catppuccin Rosewater cursor color", () => {
    expect(TERMINAL_THEME.cursor).toBe("#f5e0dc");
  });

  it("has all required ANSI colors", () => {
    expect(TERMINAL_THEME.black).toBeDefined();
    expect(TERMINAL_THEME.red).toBeDefined();
    expect(TERMINAL_THEME.green).toBeDefined();
    expect(TERMINAL_THEME.yellow).toBeDefined();
    expect(TERMINAL_THEME.blue).toBeDefined();
    expect(TERMINAL_THEME.magenta).toBeDefined();
    expect(TERMINAL_THEME.cyan).toBeDefined();
    expect(TERMINAL_THEME.white).toBeDefined();
    expect(TERMINAL_THEME.brightBlack).toBeDefined();
    expect(TERMINAL_THEME.brightWhite).toBeDefined();
  });
});

describe("TERMINAL_OPTIONS", () => {
  it("uses JetBrains Mono font family", () => {
    expect(TERMINAL_OPTIONS.fontFamily).toContain("JetBrains Mono");
  });

  it("uses 13px font size", () => {
    expect(TERMINAL_OPTIONS.fontSize).toBe(13);
  });

  it("sets cursorBlink to true", () => {
    expect(TERMINAL_OPTIONS.cursorBlink).toBe(true);
  });

  it("includes the theme", () => {
    expect(TERMINAL_OPTIONS.theme).toBe(TERMINAL_THEME);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm vitest run frontend/lib/__tests__/terminal-theme.test.ts
```

Expected: FAIL with module not found.

**Step 3: Implement terminal theme**

Create `frontend/lib/terminal-theme.ts`:

```typescript
import type { ITheme, ITerminalOptions } from "@xterm/xterm";

export const TERMINAL_THEME: ITheme = {
  background: "#1e1e2e",
  foreground: "#cdd6f4",
  cursor: "#f5e0dc",
  cursorAccent: "#11111b",
  selectionBackground: "#313244",
  selectionForeground: "#cdd6f4",
  black: "#45475a",
  red: "#f38ba8",
  green: "#a6e3a1",
  yellow: "#f9e2af",
  blue: "#89b4fa",
  magenta: "#f5c2e7",
  cyan: "#94e2d5",
  white: "#a6adc8",
  brightBlack: "#585b70",
  brightRed: "#f38ba8",
  brightGreen: "#a6e3a1",
  brightYellow: "#f9e2af",
  brightBlue: "#89b4fa",
  brightMagenta: "#f5c2e7",
  brightCyan: "#94e2d5",
  brightWhite: "#bac2de",
};

export const TERMINAL_OPTIONS: ITerminalOptions = {
  theme: TERMINAL_THEME,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Menlo', monospace",
  fontSize: 13,
  lineHeight: 1.4,
  cursorBlink: true,
  cursorStyle: "block",
  scrollback: 10000,
  allowProposedApi: true,
};
```

**Step 4: Run test to verify it passes**

```bash
pnpm vitest run frontend/lib/__tests__/terminal-theme.test.ts
```

Expected: ALL PASS.

**Step 5: Commit**

```bash
git add frontend/lib/terminal-theme.ts frontend/lib/__tests__/terminal-theme.test.ts
git commit -m "feat(frontend): add Catppuccin Mocha terminal theme constants"
```

---

## Task 8: Create use-pty hook

**Files:**

- Create: `frontend/hooks/use-pty.ts`
- Create: `frontend/hooks/__tests__/use-pty.test.ts`

**Step 1: Write the failing tests**

Create `frontend/hooks/__tests__/use-pty.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePty } from "../use-pty";

const mockInvoke = vi.fn();
const mockListen = vi.fn();
let listenCallbacks: Record<string, (event: { payload: unknown }) => void> = {};

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: (event: string, callback: (event: { payload: unknown }) => void) => {
    listenCallbacks[event] = callback;
    mockListen(event, callback);
    return Promise.resolve(() => {
      delete listenCallbacks[event];
    });
  },
}));

describe("usePty", () => {
  beforeEach(() => {
    mockInvoke.mockClear();
    mockListen.mockClear();
    listenCallbacks = {};
    mockInvoke.mockResolvedValue(undefined);
  });

  it("starts with isRunning as false", () => {
    const { result } = renderHook(() => usePty());
    expect(result.current.isRunning).toBe(false);
  });

  it("calls spawn_pty when spawn is called", async () => {
    const { result } = renderHook(() => usePty());

    await act(async () => {
      await result.current.spawn("/test/path");
    });

    expect(mockInvoke).toHaveBeenCalledWith("spawn_pty", { path: "/test/path" });
    expect(result.current.isRunning).toBe(true);
  });

  it("calls write_pty when write is called", async () => {
    const { result } = renderHook(() => usePty());

    await act(async () => {
      await result.current.spawn("/test/path");
    });

    await act(async () => {
      await result.current.write("hello");
    });

    expect(mockInvoke).toHaveBeenCalledWith("write_pty", { data: "hello" });
  });

  it("calls resize_pty when resize is called", async () => {
    const { result } = renderHook(() => usePty());

    await act(async () => {
      await result.current.resize(48, 120);
    });

    expect(mockInvoke).toHaveBeenCalledWith("resize_pty", { rows: 48, cols: 120 });
  });

  it("calls close_pty when close is called", async () => {
    const { result } = renderHook(() => usePty());

    await act(async () => {
      await result.current.spawn("/test/path");
    });

    await act(async () => {
      await result.current.close();
    });

    expect(mockInvoke).toHaveBeenCalledWith("close_pty");
    expect(result.current.isRunning).toBe(false);
  });

  it("sets up pty:data and pty:exit listeners on mount", () => {
    renderHook(() => usePty());

    expect(mockListen).toHaveBeenCalledWith("pty:data", expect.any(Function));
    expect(mockListen).toHaveBeenCalledWith("pty:exit", expect.any(Function));
  });

  it("calls onData callback when pty:data event is received", () => {
    const onData = vi.fn();
    renderHook(() => usePty({ onData }));

    act(() => {
      listenCallbacks["pty:data"]?.({ payload: "hello world" });
    });

    expect(onData).toHaveBeenCalledWith("hello world");
  });

  it("sets isRunning to false when pty:exit event is received", async () => {
    const onExit = vi.fn();
    const { result } = renderHook(() => usePty({ onExit }));

    await act(async () => {
      await result.current.spawn("/test/path");
    });

    expect(result.current.isRunning).toBe(true);

    act(() => {
      listenCallbacks["pty:exit"]?.({ payload: 0 });
    });

    expect(result.current.isRunning).toBe(false);
    expect(onExit).toHaveBeenCalledWith(0);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
pnpm vitest run frontend/hooks/__tests__/use-pty.test.ts
```

Expected: FAIL with module not found.

**Step 3: Implement use-pty hook**

Create `frontend/hooks/use-pty.ts`:

```typescript
import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

interface UsePtyOptions {
  onData?: (data: string) => void;
  onExit?: (code: number) => void;
}

export function usePty(options?: UsePtyOptions) {
  const [isRunning, setIsRunning] = useState(false);
  const onDataRef = useRef(options?.onData);
  const onExitRef = useRef(options?.onExit);

  // Keep refs up to date
  onDataRef.current = options?.onData;
  onExitRef.current = options?.onExit;

  useEffect(() => {
    const unlistenData = listen<string>("pty:data", (event) => {
      onDataRef.current?.(event.payload);
    });

    const unlistenExit = listen<number>("pty:exit", (event) => {
      setIsRunning(false);
      onExitRef.current?.(event.payload);
    });

    return () => {
      unlistenData.then((fn) => fn());
      unlistenExit.then((fn) => fn());
    };
  }, []);

  const spawn = useCallback(async (path: string) => {
    await invoke("spawn_pty", { path });
    setIsRunning(true);
  }, []);

  const write = useCallback(async (data: string) => {
    await invoke("write_pty", { data });
  }, []);

  const resize = useCallback(async (rows: number, cols: number) => {
    await invoke("resize_pty", { rows, cols });
  }, []);

  const close = useCallback(async () => {
    await invoke("close_pty");
    setIsRunning(false);
  }, []);

  return { isRunning, spawn, write, resize, close };
}
```

**Step 4: Run tests to verify they pass**

```bash
pnpm vitest run frontend/hooks/__tests__/use-pty.test.ts
```

Expected: ALL PASS.

**Step 5: Commit**

```bash
git add frontend/hooks/use-pty.ts frontend/hooks/__tests__/use-pty.test.ts
git commit -m "feat(frontend): add use-pty hook for Tauri PTY communication"
```

---

## Task 9: Create TerminalPane component

**Files:**

- Create: `frontend/components/terminal-pane.tsx`
- Create: `frontend/components/__tests__/terminal-pane.test.tsx`

**Step 1: Write the failing tests**

Create `frontend/components/__tests__/terminal-pane.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TerminalPane } from "../terminal-pane";

// Mock xterm.js — it requires a real DOM with canvas
const mockOpen = vi.fn();
const mockWrite = vi.fn();
const mockDispose = vi.fn();
const mockOnData = vi.fn();
const mockLoadAddon = vi.fn();

vi.mock("@xterm/xterm", () => ({
  Terminal: vi.fn().mockImplementation(() => ({
    open: mockOpen,
    write: mockWrite,
    dispose: mockDispose,
    onData: mockOnData.mockReturnValue({ dispose: vi.fn() }),
    loadAddon: mockLoadAddon,
    rows: 24,
    cols: 80,
  })),
}));

vi.mock("@xterm/addon-fit", () => ({
  FitAddon: vi.fn().mockImplementation(() => ({
    fit: vi.fn(),
    proposeDimensions: vi.fn().mockReturnValue({ rows: 24, cols: 80 }),
    dispose: vi.fn(),
  })),
}));

vi.mock("@xterm/addon-web-links", () => ({
  WebLinksAddon: vi.fn().mockImplementation(() => ({
    dispose: vi.fn(),
  })),
}));

// Mock use-pty hook
const mockSpawn = vi.fn().mockResolvedValue(undefined);
const mockPtyWrite = vi.fn().mockResolvedValue(undefined);
const mockResize = vi.fn().mockResolvedValue(undefined);
const mockClose = vi.fn().mockResolvedValue(undefined);

vi.mock("@/hooks/use-pty", () => ({
  usePty: (options?: { onData?: (data: string) => void; onExit?: (code: number) => void }) => {
    // Store callbacks for later invocation in tests
    if (options?.onData) {
      (globalThis as Record<string, unknown>).__ptyOnData = options.onData;
    }
    if (options?.onExit) {
      (globalThis as Record<string, unknown>).__ptyOnExit = options.onExit;
    }
    return {
      isRunning: true,
      spawn: mockSpawn,
      write: mockPtyWrite,
      resize: mockResize,
      close: mockClose,
    };
  },
}));

describe("TerminalPane", () => {
  beforeEach(() => {
    mockOpen.mockClear();
    mockWrite.mockClear();
    mockDispose.mockClear();
    mockOnData.mockClear();
    mockLoadAddon.mockClear();
    mockSpawn.mockClear();
    mockPtyWrite.mockClear();
    mockResize.mockClear();
    mockClose.mockClear();
  });

  it("renders terminal container with correct role", () => {
    render(<TerminalPane path="/test/project" />);

    const container = screen.getByRole("region", { name: /terminal/i });
    expect(container).toBeInTheDocument();
  });

  it("creates xterm Terminal instance on mount", () => {
    const { Terminal } = require("@xterm/xterm");
    render(<TerminalPane path="/test/project" />);

    expect(Terminal).toHaveBeenCalled();
    expect(mockOpen).toHaveBeenCalled();
  });

  it("loads FitAddon and WebLinksAddon", () => {
    render(<TerminalPane path="/test/project" />);

    // Two addons loaded
    expect(mockLoadAddon).toHaveBeenCalledTimes(2);
  });

  it("calls spawn with the project path on mount", () => {
    render(<TerminalPane path="/my/project" />);

    expect(mockSpawn).toHaveBeenCalledWith("/my/project");
  });

  it("calls close on unmount", () => {
    const { unmount } = render(<TerminalPane path="/test/project" />);
    unmount();

    expect(mockClose).toHaveBeenCalled();
    expect(mockDispose).toHaveBeenCalled();
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
pnpm vitest run frontend/components/__tests__/terminal-pane.test.tsx
```

Expected: FAIL with module not found.

**Step 3: Implement TerminalPane component**

Create `frontend/components/terminal-pane.tsx`:

```tsx
import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { usePty } from "@/hooks/use-pty";
import { TERMINAL_OPTIONS } from "@/lib/terminal-theme";
import "@xterm/xterm/css/xterm.css";

interface TerminalPaneProps {
  path: string;
}

export function TerminalPane({ path }: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const { spawn, write, resize, close } = usePty({
    onData: (data) => {
      terminalRef.current?.write(data);
    },
    onExit: () => {
      terminalRef.current?.write("\r\n\x1b[1;33m[Session ended]\x1b[0m\r\n");
    },
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal(TERMINAL_OPTIONS);
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.open(containerRef.current);

    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Send input to PTY
    const dataDisposable = terminal.onData((data) => {
      write(data);
    });

    // Spawn claude process
    spawn(path);

    // Resize PTY when terminal dimensions change
    const dims = fitAddon.proposeDimensions();
    if (dims) {
      resize(dims.rows, dims.cols);
    }

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
      const newDims = fitAddon.proposeDimensions();
      if (newDims) {
        resize(newDims.rows, newDims.cols);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      dataDisposable.dispose();
      close();
      terminal.dispose();
    };
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Claude Code Terminal"
      className="h-full w-full bg-ctp-base"
    />
  );
}
```

**Step 4: Run tests to verify they pass**

```bash
pnpm vitest run frontend/components/__tests__/terminal-pane.test.tsx
```

Expected: ALL PASS.

**Step 5: Commit**

```bash
git add frontend/components/terminal-pane.tsx frontend/components/__tests__/terminal-pane.test.tsx
git commit -m "feat(frontend): add TerminalPane component with xterm.js integration"
```

---

## Task 10: Update App.tsx to use TerminalPane

**Files:**

- Modify: `frontend/App.tsx`

**Step 1: Replace placeholder with TerminalPane**

Update `frontend/App.tsx`. Replace the "Project loaded" block with the TerminalPane:

```tsx
import { useEffect } from "react";
import { Anvil, FolderOpen, PanelLeft } from "lucide-react";
import { Titlebar } from "./components/titlebar";
import { Statusbar } from "./components/statusbar";
import { FileTreeSidebar } from "./components/file-tree-sidebar";
import { TerminalPane } from "./components/terminal-pane";
import { useFileTreeStore } from "./stores/file-tree";

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-6 items-center justify-center rounded bg-ctp-surface0 px-1.5 py-0.5 font-mono text-[11px] text-ctp-overlay1">
      {children}
    </kbd>
  );
}

function EmptyState() {
  const { openProject, toggleSidebar } = useFileTreeStore();
  const isMac = navigator.userAgent.includes("Mac");
  const mod = isMac ? "\u2318" : "Ctrl";

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10">
      <div className="flex flex-col items-center gap-4">
        <Anvil className="h-16 w-16 text-brand" strokeWidth={1.5} />
        <h1 className="text-3xl font-bold text-ctp-text">Forja for Vibe Coders</h1>
        <p className="text-sm text-ctp-overlay1">
          A dedicated desktop client for vibe coders
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={openProject}
          className="group flex items-center justify-between gap-8 rounded-md px-4 py-2 text-left transition-colors hover:bg-ctp-mantle"
        >
          <span className="flex items-center gap-2 text-sm text-ctp-subtext0 group-hover:text-ctp-text">
            <FolderOpen className="h-4 w-4" strokeWidth={1.5} />
            Open Project
          </span>
          <span className="flex items-center gap-1">
            <Kbd>{mod}</Kbd>
            <span className="text-[11px] text-ctp-surface1">+</span>
            <Kbd>O</Kbd>
          </span>
        </button>

        <button
          onClick={toggleSidebar}
          className="group flex items-center justify-between gap-8 rounded-md px-4 py-2 text-left transition-colors hover:bg-ctp-mantle"
        >
          <span className="flex items-center gap-2 text-sm text-ctp-subtext0 group-hover:text-ctp-text">
            <PanelLeft className="h-4 w-4" strokeWidth={1.5} />
            Toggle Sidebar
          </span>
          <span className="flex items-center gap-1">
            <Kbd>{mod}</Kbd>
            <span className="text-[11px] text-ctp-surface1">+</span>
            <Kbd>B</Kbd>
          </span>
        </button>
      </div>
    </div>
  );
}

function App() {
  const { tree, currentPath, toggleSidebar, openProject } = useFileTreeStore();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key === "b") {
        event.preventDefault();
        toggleSidebar();
      }
      if (mod && event.key === "o") {
        event.preventDefault();
        openProject();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleSidebar, openProject]);

  return (
    <div className="relative flex h-full flex-col bg-ctp-base">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        {tree && currentPath ? (
          <TerminalPane path={currentPath} />
        ) : (
          <EmptyState />
        )}
      </div>
      <Statusbar />
      <FileTreeSidebar />
    </div>
  );
}

export default App;
```

**Step 2: Run all frontend tests**

```bash
pnpm vitest run
```

Expected: ALL PASS.

**Step 3: Verify TypeScript compilation**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

**Step 4: Commit**

```bash
git add frontend/App.tsx
git commit -m "feat(frontend): replace project placeholder with TerminalPane"
```

---

## Task 11: Run full integration check

**Step 1: Run all backend tests**

```bash
cd backend && cargo test -- --nocapture
```

Expected: ALL PASS.

**Step 2: Run all frontend tests**

```bash
pnpm vitest run
```

Expected: ALL PASS.

**Step 3: Build the full app**

```bash
pnpm tauri build --debug
```

Expected: builds without errors.

**Step 4: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "test: verify full integration of terminal PTY system"
```

---

## Implementation Notes

### Data Flow

```
[User types in xterm.js]
  → terminal.onData(data)
  → invoke("write_pty", { data })
  → Rust: session.writer.write_all(data)
  → PTY stdin
  → claude process receives input

[claude produces output]
  → PTY stdout
  → Rust reader thread: reader.read(&mut buf)
  → app.emit("pty:data", data)
  → listen("pty:data") in use-pty hook
  → onData callback
  → terminal.write(data) in TerminalPane
  → xterm.js renders output
```

### Known Limitations (to address in future tasks)

1. **No claude CLI detection** - If `claude` is not installed, spawn_pty will fail with a generic error. A dedicated check should be added before spawning.
2. **No session restart** - When the PTY exits, there's no UI to restart. The `[Session ended]` message is shown but no restart button.
3. **No markdown rendering** - All output is raw terminal (VT sequences rendered by xterm.js). Hybrid rendering comes in a future task.
4. **Single session** - Only one PTY session at a time. Multi-session support is out of MVP scope.
5. **PTY output as lossy UTF-8** - Using `String::from_utf8_lossy` which may lose binary data. For claude CLI output this is acceptable.

### Dependencies Added

**Rust (Cargo.toml):**

- `portable-pty = "0.9"` - Cross-platform PTY management

**Frontend (package.json):**

- `@xterm/xterm` - Terminal emulator
- `@xterm/addon-fit` - Auto-resize terminal to container
- `@xterm/addon-web-links` - Clickable URLs in terminal output
