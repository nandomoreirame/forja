# Plan: Sidebar de Projeto com Portas em Escuta

**Priority:** Medium
**Date:** 2026-03-19

---

## 1. Overview and Motivation

When working with web applications, developers frequently run local servers (dev servers, APIs, databases UIs). Currently, Forja has no way to show which ports are active for a given project. Users must manually check which port their server is on and type it into the browser pane.

The goal is to detect active TCP ports associated with each project's process tree and display them in the project sidebar tooltip. Clicking a port would open it directly in the browser pane.

### Example Use Case

A project is running a Vite dev server on `:1420` and a backend on `:3000`. The sidebar shows both ports, and the user can click `:3000` to open it directly in the browser pane.

---

## 2. Current State Analysis

### Project process tracking

Forja currently tracks PTY sessions per project:
- `electron/pty.ts`: `sessions: Map<tabId, PtySession>` — each `PtySession` has `projectPath`
- When a PTY is spawned, the shell/CLI PID is available via `ptyProcess.pid`

However, Forja does not currently track the child process PIDs of the CLI tools spawned in PTY sessions. The `node-pty` `IPty` interface exposes `.pid` which is the **shell** PID (the direct child of the PTY). The actual server process may be a grandchild.

### Port detection commands

**Linux:**
```sh
ss -tlnp 2>/dev/null
# or
netstat -tlnp 2>/dev/null
```
Output includes PID of the listening process.

**macOS:**
```sh
lsof -iTCP -sTCP:LISTEN -n -P 2>/dev/null
```

**Windows:**
```sh
netstat -ano 2>NUL
```
Then map PIDs via `wmic process get ProcessId,ParentProcessId,CommandLine`.

### `electron/main.ts`

No port detection handlers exist currently. The `ipcMain.handle` pattern is used for all IPC.

### `frontend/components/project-sidebar.tsx`

The sidebar shows: project icon, thinking spinner, notification badge. The tooltip shows name and path. No port information.

### Cross-platform complexity

- **Linux**: `ss` is standard and gives PID with listening process
- **macOS**: `lsof` is standard
- **Windows**: `netstat -ano` + process tree traversal
- The challenge: mapping a listening port back to a specific project requires tracking the process tree (PTY PID → child processes → grandchild processes)

### Simplification strategy

Instead of full process tree tracking, we can use a **heuristic approach**:
1. Scan ALL listening ports on the system
2. For each port, get the associated PID
3. Check if that PID or any of its ancestors is one of the PTY session PIDs for the project
4. Display all ports whose process chain includes a project's PTY PID

This requires building a PID → parent PID map (process tree), which is OS-specific but feasible.

---

## 3. Step-by-Step Implementation Plan

### Step 1: Create `electron/port-scanner.ts`

```ts
// electron/port-scanner.ts
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface ListeningPort {
  port: number;
  pid: number;
  address: string;
}

export async function getListeningPorts(): Promise<ListeningPort[]> {
  if (process.platform === "linux") {
    return getListeningPortsLinux();
  } else if (process.platform === "darwin") {
    return getListeningPortsMacOS();
  } else if (process.platform === "win32") {
    return getListeningPortsWindows();
  }
  return [];
}

async function getListeningPortsLinux(): Promise<ListeningPort[]> {
  try {
    const { stdout } = await execFileAsync("ss", ["-tlnpH"], { timeout: 3000 });
    // ss output format: State RecvQ SendQ Local Address:Port Peer Address:Port Process
    const ports: ListeningPort[] = [];
    for (const line of stdout.split("\n")) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 5) continue;
      const localAddr = parts[3]; // "0.0.0.0:3000" or "[::]:3000" or "*:3000"
      const processInfo = parts[5] ?? "";
      const portMatch = localAddr.match(/:(\d+)$/);
      const pidMatch = processInfo.match(/pid=(\d+)/);
      if (portMatch && pidMatch) {
        ports.push({
          port: parseInt(portMatch[1], 10),
          pid: parseInt(pidMatch[1], 10),
          address: localAddr,
        });
      }
    }
    return ports;
  } catch {
    return [];
  }
}

async function getListeningPortsMacOS(): Promise<ListeningPort[]> {
  try {
    const { stdout } = await execFileAsync(
      "lsof", ["-iTCP", "-sTCP:LISTEN", "-n", "-P", "-F", "pn"],
      { timeout: 5000 }
    );
    // -F output: lines start with p (PID) or n (address:port)
    const ports: ListeningPort[] = [];
    let currentPid = 0;
    for (const line of stdout.split("\n")) {
      if (line.startsWith("p")) {
        currentPid = parseInt(line.slice(1), 10);
      } else if (line.startsWith("n") && currentPid) {
        const addrPort = line.slice(1);
        const portMatch = addrPort.match(/:(\d+)$/);
        if (portMatch) {
          ports.push({ port: parseInt(portMatch[1], 10), pid: currentPid, address: addrPort });
        }
      }
    }
    return ports;
  } catch {
    return [];
  }
}

async function getListeningPortsWindows(): Promise<ListeningPort[]> {
  try {
    const { stdout } = await execFileAsync(
      "netstat", ["-ano", "-p", "TCP"],
      { timeout: 5000 }
    );
    const ports: ListeningPort[] = [];
    for (const line of stdout.split("\r\n")) {
      if (!line.includes("LISTENING")) continue;
      const parts = line.trim().split(/\s+/);
      // parts: [Protocol, LocalAddr:Port, ForeignAddr:Port, State, PID]
      const localAddr = parts[1] ?? "";
      const pid = parseInt(parts[4] ?? "0", 10);
      const portMatch = localAddr.match(/:(\d+)$/);
      if (portMatch && pid) {
        ports.push({ port: parseInt(portMatch[1], 10), pid, address: localAddr });
      }
    }
    return ports;
  } catch {
    return [];
  }
}
```

**File:** `electron/port-scanner.ts` (new)

### Step 2: Build process tree and filter by project PIDs

Add `getProcessTree` to return PID → parent PID mapping:

```ts
// In electron/port-scanner.ts

export async function getProcessTree(): Promise<Map<number, number>> {
  const tree = new Map<number, number>(); // pid -> parentPid
  if (process.platform === "linux") {
    try {
      const { stdout } = await execFileAsync("ps", ["-eo", "pid,ppid", "--no-headers"], { timeout: 3000 });
      for (const line of stdout.split("\n")) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          tree.set(parseInt(parts[0], 10), parseInt(parts[1], 10));
        }
      }
    } catch { /* ignore */ }
  } else if (process.platform === "darwin") {
    try {
      const { stdout } = await execFileAsync("ps", ["-eo", "pid,ppid"], { timeout: 3000 });
      for (const line of stdout.split("\n").slice(1)) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          tree.set(parseInt(parts[0], 10), parseInt(parts[1], 10));
        }
      }
    } catch { /* ignore */ }
  } else if (process.platform === "win32") {
    try {
      const { stdout } = await execFileAsync(
        "wmic", ["process", "get", "ProcessId,ParentProcessId", "/format:csv"],
        { timeout: 5000 }
      );
      for (const line of stdout.split("\r\n").slice(1)) {
        const parts = line.split(",");
        if (parts.length >= 3) {
          const parentPid = parseInt(parts[1] ?? "0", 10);
          const pid = parseInt(parts[2] ?? "0", 10);
          if (pid) tree.set(pid, parentPid);
        }
      }
    } catch { /* ignore */ }
  }
  return tree;
}

export function isDescendantOf(pid: number, ancestorPid: number, tree: Map<number, number>, maxDepth = 10): boolean {
  let current = pid;
  for (let depth = 0; depth < maxDepth; depth++) {
    const parent = tree.get(current);
    if (parent === undefined) return false;
    if (parent === ancestorPid) return true;
    current = parent;
  }
  return false;
}

export async function getPortsForPids(projectPids: number[]): Promise<number[]> {
  if (projectPids.length === 0) return [];

  const [ports, processTree] = await Promise.all([
    getListeningPorts(),
    getProcessTree(),
  ]);

  const projectPidSet = new Set(projectPids);

  return ports
    .filter(({ pid }) =>
      projectPidSet.has(pid) ||
      projectPids.some(ppid => isDescendantOf(pid, ppid, processTree))
    )
    .map(({ port }) => port)
    .filter((port, idx, arr) => arr.indexOf(port) === idx) // deduplicate
    .sort((a, b) => a - b);
}
```

### Step 3: Expose PTY session PIDs from `electron/pty.ts`

Add a function to get all active PIDs for a given project:

```ts
// In electron/pty.ts
export function getProjectPids(projectPath: string): number[] {
  const pids: number[] = [];
  for (const session of sessions.values()) {
    if (session.projectPath === projectPath && session.process.pid) {
      pids.push(session.process.pid);
    }
  }
  return pids;
}
```

**File:** `electron/pty.ts`

### Step 4: Add IPC handler `get_project_ports`

```ts
// In electron/main.ts
ipcMain.handle("get_project_ports", async (_event, args: { projectPath: string }) => {
  const [portScanner, ptyMod] = await Promise.all([
    import("./port-scanner.js"),
    Promise.resolve({ getProjectPids }),
  ]);
  const pids = ptyMod.getProjectPids(args.projectPath);
  if (pids.length === 0) return [];
  return portScanner.getPortsForPids(pids);
});
```

**File:** `electron/main.ts`

### Step 5: Add ports state to projects store

```ts
// In frontend/stores/projects.ts
interface ProjectsState {
  // ... existing ...
  portsByProject: Record<string, number[]>;
  fetchProjectPorts: (projectPath: string) => Promise<void>;
}

// Action:
fetchProjectPorts: async (projectPath) => {
  try {
    const ports = await invoke<number[]>("get_project_ports", { projectPath });
    set((s) => ({
      portsByProject: { ...s.portsByProject, [projectPath]: ports ?? [] },
    }));
  } catch {
    // Non-fatal
  }
},
```

**Polling:** Set up a 10-second interval for the active project's port scan (in `App.tsx` or a hook). Only scan the active project to avoid excessive system calls for inactive projects.

**File:** `frontend/stores/projects.ts`

### Step 6: Display ports in sidebar tooltip and enable one-click open

Update `ProjectIcon`'s tooltip:

```tsx
const ports = useProjectsStore(s => s.portsByProject[project.path] ?? []);
const tilingStore = useTilingLayoutStore.getState();

// In TooltipContent:
{ports.length > 0 && (
  <div className="mt-1 flex flex-wrap gap-1">
    {ports.map((port) => (
      <button
        key={port}
        onClick={(e) => {
          e.stopPropagation();
          // Open or navigate browser pane to this port
          const url = `http://localhost:${port}`;
          if (tilingStore.hasBlockOfType("browser")) {
            // Update existing browser block config
            // (requires a new action or event)
          } else {
            tilingStore.addBlock({ type: "browser", url });
          }
          // Switch to project first
          onSelect(project.path);
        }}
        className="rounded bg-ctp-surface1 px-1.5 py-0.5 text-[10px] font-mono text-ctp-blue hover:bg-ctp-surface2"
      >
        :{port}
      </button>
    ))}
  </div>
)}
```

**File:** `frontend/components/project-sidebar.tsx`

### Step 7: Trigger port scan on session state changes

When `setProjectSessionState` marks a session as "running", start polling for ports. When "exited", do a final scan (ports may have been released):

```ts
// In frontend where pty:session-state-changed is handled
if (state === "running") {
  // Start port polling for this project
  useProjectsStore.getState().fetchProjectPorts(projectPath);
}
```

---

## 4. Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `electron/port-scanner.ts` | Create | Cross-platform port + process tree detection |
| `electron/pty.ts` | Modify | Export `getProjectPids(projectPath)` |
| `electron/main.ts` | Modify | Add `get_project_ports` IPC handler |
| `frontend/stores/projects.ts` | Modify | Add `portsByProject`, `fetchProjectPorts` |
| `frontend/components/project-sidebar.tsx` | Modify | Show ports in tooltip, enable click-to-open |
| `frontend/App.tsx` | Modify | Add port polling interval for active project |

---

## 5. Test Strategy

### Unit tests

**`electron/__tests__/port-scanner.test.ts`:**
- `getListeningPortsLinux` parses `ss` output correctly
- `getListeningPortsMacOS` parses `lsof` output correctly
- `getListeningPortsWindows` parses `netstat` output correctly
- `isDescendantOf(childPid, ancestorPid, tree)` traverses correctly up to maxDepth
- `getPortsForPids` returns ports whose processes are direct project PIDs
- `getPortsForPids` returns ports whose processes are descendants of project PIDs
- `getPortsForPids` deduplicates ports
- Returns `[]` when no project PIDs provided

**`frontend/stores/__tests__/projects.test.ts`:**
- `fetchProjectPorts` calls `invoke("get_project_ports", ...)` and stores result
- `fetchProjectPorts` handles IPC errors gracefully
- `portsByProject` is initialized as empty object

### Component tests

**`frontend/components/__tests__/project-sidebar.test.tsx`:**
- Tooltip shows port buttons when `portsByProject[project.path]` is non-empty
- Clicking a port button calls `addBlock` or opens the browser pane
- No ports shown when `portsByProject[project.path]` is empty or undefined

---

## 6. Acceptance Criteria

- [ ] When a dev server is started inside a Forja terminal session, its port appears in the sidebar tooltip within 10 seconds
- [ ] Multiple ports for a single project are all displayed
- [ ] Clicking a port in the tooltip opens it in the browser pane (`http://localhost:PORT`)
- [ ] If a browser pane is already open, clicking a port navigates it to the new URL
- [ ] Ports are removed from the display when the server process terminates
- [ ] Port detection works on Linux (via `ss`), macOS (via `lsof`), and Windows (via `netstat`)
- [ ] Port scanning falls back gracefully when the OS tool is not available
- [ ] No performance impact: scans only the active project at ≤10s intervals
- [ ] All new tests pass
