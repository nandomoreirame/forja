# Windows Support Plan

**Date:** 2026-03-11
**Status:** Draft
**Complexity:** Medium

## Goal

Enable Forja to build, distribute, and run on Windows (x64/arm64).

## Current State

- Electron supports Windows natively
- All major dependencies (`node-pty`, `chokidar`, `systeminformation`, `electron-store`) support Windows
- PTY shell detection already has a `win32` branch returning `powershell.exe`
- ~15 platform-specific issues identified across ~8 files

## Issues Summary

### Critical (blocks build)

| # | File | Issue |
|---|------|-------|
| 1 | `electron-builder.yml` | No `win:` target defined; orphaned `nsis:` block. Missing `.ico` icon |
| 2 | `.github/workflows/release.yml` | No `windows-latest` runner in build matrix |

### High (app crashes or broken functionality)

| # | File | Line | Issue |
|---|------|------|-------|
| 3 | `electron/cli-detector.ts` | 43 | Uses `which` command — does not exist on Windows. Needs `where.exe` |
| 4 | `electron/pty.ts` | 173-178 | `resolveShellPath()` only adds Unix paths to PATH |

### Medium (works but incorrect or insecure)

| # | File | Line | Issue |
|---|------|------|-------|
| 5 | `electron/pty.ts` | 31-36 | `SAFE_ENV_KEYS` missing `APPDATA`, `USERPROFILE`, `COMSPEC`, `TEMP`, `TMP`, `PATHEXT`, `USERNAME`, `SystemRoot` |
| 6 | `electron/config.ts` | 54 | Config forced to `~/.config/forja` instead of `%APPDATA%` |
| 7 | `electron/user-settings.ts` | 148 | Same XDG path issue |
| 8 | `electron/main.ts` | 598 | IPC handler `app:getForjaConfigPath` returns XDG path |
| 9 | `electron/context/context-hub.ts` | 62 | Context hub root hardcoded to `~/.config/forja/context` |
| 10 | `electron/file-writer.ts` | 4 | Forbidden path list is Unix-only (`/etc`, `/usr`, etc.) |
| 11 | `electron/file-operations.ts` | 6 | Same Unix-only forbidden path list |

### Low (cosmetic or dev tooling)

| # | File | Line | Issue |
|---|------|------|-------|
| 12 | `electron/watcher.ts` | 22 | `.git` path built with string concat `/` instead of `path.join()` |
| 13 | `electron/file-tree.ts` | 121 | `child.kill("SIGKILL")` — works on Windows but non-idiomatic |
| 14 | `scripts/bump-version.sh` | all | Bash + `sed` only; references removed Rust backend |
| 15 | `package.json` | 25 | `version:bump` script invokes `bash` directly |

## Implementation Plan

### Phase 1 — Make it buildable

**Files:** `electron-builder.yml`, `.github/workflows/release.yml`, `assets/icons/`

1. Create `icon.ico` (256x256, multi-resolution) from existing `icon.png`
2. Add `win:` block to `electron-builder.yml`:
   ```yaml
   win:
     target:
       - target: nsis
         arch:
           - x64
     icon: assets/icons/icon.ico
   ```
3. Add `windows-latest` runner to release workflow matrix
4. Ensure `@electron/rebuild` runs with MSVC on Windows runner (install `windows-build-tools` or configure Visual Studio Build Tools in CI)

### Phase 2 — Fix runtime breakage

**Files:** `electron/cli-detector.ts`, `electron/pty.ts`

5. Replace `which` with cross-platform detection in `cli-detector.ts`:
   ```typescript
   const cmd = process.platform === "win32" ? "where.exe" : "which";
   execFile(cmd, [binary], { timeout: 3000 }, (err) => {
     resolve(!err);
   });
   ```
6. Extend `SAFE_ENV_KEYS` in `pty.ts` with Windows-critical env vars:
   ```typescript
   if (process.platform === "win32") {
     for (const key of ["USERPROFILE", "APPDATA", "LOCALAPPDATA", "COMSPEC",
       "TEMP", "TMP", "PATHEXT", "USERNAME", "SystemRoot", "SystemDrive",
       "ProgramFiles", "ProgramFiles(x86)", "CommonProgramFiles"]) {
       SAFE_ENV_KEYS.add(key);
     }
   }
   ```
7. Extend `resolveShellPath()` to add Windows-relevant paths when `process.platform === "win32"`:
   ```typescript
   if (process.platform === "win32") {
     extraPaths.push(
       path.join(os.homedir(), "AppData", "Roaming", "npm"),
       path.join(os.homedir(), "AppData", "Local", "Programs", "Python"),
       path.join(os.homedir(), ".local", "bin"),
     );
   }
   ```

### Phase 3 — Cross-platform config paths

**Files:** `electron/config.ts`, `electron/user-settings.ts`, `electron/main.ts`, `electron/context/context-hub.ts`

8. Create a shared utility `electron/paths.ts`:
   ```typescript
   import { app } from "electron";
   import path from "node:path";
   import os from "node:os";

   export function getForjaConfigDir(): string {
     if (process.platform === "win32") {
       return path.join(app.getPath("appData"), "forja");
     }
     return path.join(os.homedir(), ".config", "forja");
   }
   ```
9. Replace all hardcoded `path.join(os.homedir(), ".config", "forja")` calls with `getForjaConfigDir()`
10. Update forbidden path lists in `file-writer.ts` and `file-operations.ts`:
    ```typescript
    const FORBIDDEN_PREFIXES = process.platform === "win32"
      ? ["C:\\Windows", "C:\\Program Files", "C:\\Program Files (x86)"]
      : ["/etc", "/usr", "/bin", "/sbin", "/var", "/sys", "/proc"];
    ```

### Phase 4 — Polish

11. Fix `watcher.ts:22` to use `path.join(projectPath, ".git")`
12. Update `scripts/bump-version.sh`: remove stale Tauri references, consider Node.js alternative
13. Test on Windows (manual or CI smoke test)

## Dependencies

- `node-pty` requires Visual C++ Build Tools (MSVC) on Windows build machines
- `@electron/rebuild` handles native module compilation
- `winpty` is bundled with `node-pty` for Windows PTY support

## Testing Strategy

- Add Windows to the CI test matrix (at minimum: build + unit tests)
- Manual smoke test: spawn PowerShell PTY, detect installed CLIs, verify config paths
- Verify NSIS installer creates proper Start Menu shortcuts and uninstaller

## Risks

- `node-pty` native compilation on Windows CI can be flaky (MSVC version mismatches)
- Some AI CLIs (claude, gemini) may have limited Windows support themselves
- Windows Defender / SmartScreen may flag unsigned `.exe` — code signing certificate may be needed for distribution

## Out of Scope

- Windows ARM64 builds (defer to future iteration)
- Windows-specific UI adaptations (title bar style, etc.)
- Code signing certificate setup
