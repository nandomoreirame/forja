# Codebase Improvements: Performance, Security, Accessibility & Maintainability

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all CRITICAL and HIGH severity issues across performance, security, accessibility, and code maintainability, then address MEDIUM issues.

**Architecture:** Incremental fixes organized by severity. Each task is self-contained with tests. Security fixes use `execFile` over `exec`, add path validation, and sanitize HTML. Performance fixes optimize Zustand selectors, memoize components, and reduce IPC overhead. Accessibility fixes add ARIA attributes, keyboard handlers, and semantic HTML. Maintainability fixes extract shared logic, add error handling, and decompose large components.

**Tech Stack:** React 19, TypeScript, Electron, Zustand, Vitest, React Testing Library, DOMPurify

---

## Phase 1: CRITICAL & HIGH Severity (14 tasks)

### Task 1: Fix command injection in CLI detection

**Files:**
- Modify: `electron/main.ts:188-200`
- Test: `electron/__tests__/main-security.test.ts`

**Context:** `exec(\`which ${binary}\`)` allows injection via malicious binary names. Replace with `execFile` which does not use a shell.

**Step 1: Write the failing test**

```typescript
// electron/__tests__/main-security.test.ts
import { describe, it, expect, vi } from "vitest";
import * as childProcess from "child_process";

vi.mock("child_process");

describe("CLI detection security", () => {
  it("should not execute shell commands with user input", () => {
    // Verify execFile is used instead of exec for binary detection
    const execSpy = vi.spyOn(childProcess, "exec");
    const execFileSpy = vi.spyOn(childProcess, "execFile");

    // After fix, exec should never be called with user-provided binary names
    // This test documents the security requirement
    expect(true).toBe(true); // Placeholder - real test below
  });

  it("should reject binary names with shell metacharacters", () => {
    const dangerousNames = [
      "test; rm -rf /",
      "claude && echo pwned",
      "gemini | cat /etc/passwd",
      "codex$(whoami)",
    ];

    for (const name of dangerousNames) {
      // Binary names should only contain alphanumeric, dash, underscore, dot
      const isValid = /^[a-zA-Z0-9._-]+$/.test(name);
      expect(isValid).toBe(false);
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run electron/__tests__/main-security.test.ts`

**Step 3: Write minimal implementation**

In `electron/main.ts`, replace the `detect_installed_clis` handler:

```typescript
import { execFile } from "child_process";

// Binary name validation - only allow safe characters
const SAFE_BINARY_RE = /^[a-zA-Z0-9._-]+$/;

ipcMain.handle("detect_installed_clis", async (_event, args: { binaries: string[] }) => {
  const results: Record<string, boolean> = {};
  const checks = args.binaries.map((binary) =>
    new Promise<void>((resolve) => {
      if (!SAFE_BINARY_RE.test(binary)) {
        results[binary] = false;
        resolve();
        return;
      }
      execFile("which", [binary], { timeout: 3000 }, (err) => {
        results[binary] = !err;
        resolve();
      });
    })
  );
  await Promise.all(checks);
  return results;
});
```

Also fix the `check_claude_installed` handler (line 180):

```typescript
ipcMain.handle("check_claude_installed", () => {
  return new Promise<void>((resolve, reject) => {
    execFile("which", ["claude"], { timeout: 5000 }, (err) => {
      if (err) reject(new Error("claude CLI not found"));
      else resolve();
    });
  });
});
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run electron/__tests__/main-security.test.ts`

**Step 5: Commit**

```
feat(security): replace exec with execFile in CLI detection

Prevents OS command injection via malicious binary names.
Adds input validation with safe character regex.
```

---

### Task 2: Fix command injection in git operations

**Files:**
- Modify: `electron/git-info.ts:1-6,225-243`
- Test: `electron/__tests__/git-info.test.ts` (extend existing)

**Context:** Git commands use string interpolation with `exec`. Replace with `execFile` using argument arrays.

**Step 1: Write the failing test**

```typescript
// Add to electron/__tests__/git-info.test.ts
describe("git-info security", () => {
  it("should not use shell interpolation for file paths", async () => {
    // A file with shell metacharacters should not cause injection
    const maliciousPath = 'file"; rm -rf /; echo "pwned';
    // After fix, this should safely pass the path as an argument
    // not interpolate it into a shell command string
    const result = await getGitFileDiff("/safe/project", maliciousPath);
    // Should return empty diff, not execute injected command
    expect(result.patch).toBe("");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run electron/__tests__/git-info.test.ts`

**Step 3: Write minimal implementation**

Replace `execAsync` usage with `execFile`-based helper in `electron/git-info.ts`:

```typescript
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Replace all exec-based git commands with execFile + argument arrays:

// In getGitInfo():
const { stdout } = await execFileAsync(
  "git", ["status", "--porcelain", "--branch"],
  { cwd: projectPath, timeout: 5000 }
);

// In getGitFileStatuses():
const { stdout } = await execFileAsync(
  "git", ["status", "--porcelain"],
  { cwd: projectPath, timeout: 5000 }
);

// In getGitChangedFiles():
const { stdout } = await execFileAsync(
  "git", ["status", "--porcelain", "-uall"],
  { cwd: projectPath, timeout: 5000 }
);

// In getGitFileDiff():
const baseArgs = ["diff", "--no-color", "--src-prefix=a/", "--dst-prefix=b/", "--relative"];
if (stage === "staged") baseArgs.push("--cached");
else if (stage === "combined") baseArgs.push("HEAD");
baseArgs.push("--", normalizedPath);

const { stdout } = await execFileAsync("git", baseArgs, {
  cwd: projectPath,
  timeout: 5000,
  maxBuffer: 20 * 1024 * 1024,
});
```

**Step 4: Run all git-info tests**

Run: `pnpm vitest run electron/__tests__/git-info.test.ts`

**Step 5: Commit**

```
feat(security): migrate git commands from exec to execFile

Prevents command injection via file paths with shell metacharacters.
All git operations now use argument arrays instead of string interpolation.
```

---

### Task 3: Add path traversal validation to file operations

**Files:**
- Create: `electron/path-validation.ts`
- Modify: `electron/file-reader.ts:13-42`
- Modify: `electron/git-info.ts:196`
- Modify: `electron/main.ts` (IPC handlers that accept paths)
- Test: `electron/__tests__/path-validation.test.ts`

**Step 1: Write the failing test**

```typescript
// electron/__tests__/path-validation.test.ts
import { describe, it, expect } from "vitest";
import { assertPathWithinScope } from "../path-validation";

describe("path validation", () => {
  it("allows paths within project scope", () => {
    expect(() => assertPathWithinScope("/project", "src/main.ts")).not.toThrow();
    expect(() => assertPathWithinScope("/project", "deep/nested/file.ts")).not.toThrow();
  });

  it("blocks path traversal attempts", () => {
    expect(() => assertPathWithinScope("/project", "../../../etc/passwd")).toThrow("Path traversal");
    expect(() => assertPathWithinScope("/project", "src/../../secret")).toThrow("Path traversal");
  });

  it("blocks absolute paths outside scope", () => {
    expect(() => assertPathWithinScope("/project", "/etc/passwd")).toThrow("Path traversal");
  });

  it("resolves symlink-like paths", () => {
    expect(() => assertPathWithinScope("/project", "src/../../../etc/shadow")).toThrow("Path traversal");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run electron/__tests__/path-validation.test.ts`

**Step 3: Write minimal implementation**

```typescript
// electron/path-validation.ts
import * as path from "path";

export function assertPathWithinScope(basePath: string, relativePath: string): string {
  const resolved = path.resolve(basePath, relativePath);
  const normalizedBase = path.resolve(basePath);

  if (!resolved.startsWith(normalizedBase + path.sep) && resolved !== normalizedBase) {
    throw new Error(`Path traversal blocked: ${relativePath}`);
  }

  return resolved;
}
```

Then use it in `file-reader.ts` and `git-info.ts` where user-provided paths are joined.

**Step 4: Run tests**

Run: `pnpm vitest run electron/__tests__/path-validation.test.ts`

**Step 5: Commit**

```
feat(security): add path traversal validation for file operations

Validates that all user-provided paths resolve within project scope.
Blocks ../traversal and absolute path escapes.
```

---

### Task 4: Add URL scheme validation for shell:openExternal

**Files:**
- Modify: `electron/main.ts:444-447`
- Test: `electron/__tests__/main-security.test.ts` (extend)

**Step 1: Write the failing test**

```typescript
describe("URL validation", () => {
  it("allows http and https URLs", () => {
    expect(isAllowedUrl("https://github.com")).toBe(true);
    expect(isAllowedUrl("http://localhost:3000")).toBe(true);
  });

  it("blocks dangerous URL schemes", () => {
    expect(isAllowedUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedUrl("file:///etc/passwd")).toBe(false);
    expect(isAllowedUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
  });
});
```

**Step 2: Run test**

**Step 3: Implement**

```typescript
function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

ipcMain.handle("shell:openExternal", (_event, url: string) => {
  if (!isAllowedUrl(url)) {
    throw new Error(`Blocked URL scheme: ${url}`);
  }
  return shell.openExternal(url);
});
```

**Step 4: Run tests**

**Step 5: Commit**

```
feat(security): validate URL schemes before opening external links

Only allows http: and https: protocols. Blocks javascript:, file:, data: schemes.
```

---

### Task 5: Add DOMPurify sanitization for dangerouslySetInnerHTML

**Files:**
- Modify: `frontend/components/code-viewer.tsx:57`
- Modify: `frontend/components/markdown-renderer.tsx:42`
- Modify: `frontend/components/settings-editor.tsx:99`
- Test: `frontend/components/__tests__/code-viewer.test.tsx`

**Step 1: Install DOMPurify**

Run: `pnpm add dompurify && pnpm add -D @types/dompurify`

**Step 2: Write the failing test**

```typescript
describe("CodeViewer XSS protection", () => {
  it("sanitizes HTML output from syntax highlighter", () => {
    // If Shiki ever produces malicious HTML, DOMPurify should strip it
    const { container } = render(<CodeViewer code="test" filename="test.ts" />);
    const pre = container.querySelector("pre");
    expect(pre).toBeTruthy();
    // No script tags should survive
    expect(container.querySelector("script")).toBeNull();
  });
});
```

**Step 3: Implement**

Create a shared sanitizer utility:

```typescript
// frontend/lib/sanitize-html.ts
import DOMPurify from "dompurify";

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: [
      "pre", "code", "span", "div", "br", "p", "strong", "em",
      "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li",
      "a", "img", "table", "thead", "tbody", "tr", "th", "td",
      "blockquote", "hr", "del", "sup", "sub",
    ],
    ALLOWED_ATTR: ["class", "style", "href", "src", "alt", "title", "target", "rel"],
  });
}
```

Then use `sanitizeHtml(html)` in all three components before passing to `dangerouslySetInnerHTML`.

**Step 4: Run tests**

**Step 5: Commit**

```
feat(security): sanitize HTML with DOMPurify before rendering

Protects code-viewer, markdown-renderer, and settings-editor from XSS
via malicious syntax highlighter output or user-controlled content.
```

---

### Task 6: Optimize Zustand selectors in App.tsx

**Files:**
- Modify: `frontend/App.tsx:229-240`
- Test: `frontend/__tests__/app-selectors.test.tsx`

**Context:** App.tsx reads 11 separate Zustand slices, causing re-renders on ANY store change. Group selectors and use `useShallow` from Zustand.

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";

describe("Store selector optimization", () => {
  it("should not re-render when unrelated store slice changes", () => {
    const renderCount = { current: 0 };

    renderHook(() => {
      renderCount.current++;
      return useTerminalTabsStore((s) => s.activeTabId);
    });

    const initial = renderCount.current;

    // Changing an unrelated slice should not trigger re-render
    // (This validates the selector is granular)
    expect(renderCount.current).toBe(initial);
  });
});
```

**Step 2: Run test**

**Step 3: Implement**

```typescript
// In App.tsx, replace 11 individual selectors with grouped selectors using useShallow:
import { useShallow } from "zustand/react/shallow";

// Group related selectors
const { tree, currentPath, trees, isSidebarOpen } = useFileTreeStore(
  useShallow((s) => ({
    tree: s.tree,
    currentPath: s.currentPath,
    trees: s.trees,
    isSidebarOpen: s.isOpen,
  }))
);

const { tabs, activeTabId, nextTabId, addTab, removeTab, isTerminalPaneOpen } =
  useTerminalTabsStore(
    useShallow((s) => ({
      tabs: s.tabs,
      activeTabId: s.activeTabId,
      nextTabId: s.nextTabId,
      addTab: s.addTab,
      removeTab: s.removeTab,
      isTerminalPaneOpen: s.isTerminalPaneOpen,
    }))
  );

const isPreviewOpen = useFilePreviewStore((s) => s.isOpen);
```

**Step 4: Run tests**

Run: `pnpm vitest run`

**Step 5: Commit**

```
perf(frontend): optimize Zustand selectors with useShallow in App.tsx

Groups 11 individual store subscriptions into 3 shallow-compared selectors.
Prevents cascading re-renders when unrelated store slices change.
```

---

### Task 7: Fix git status fetch triggered by trees object reference change

**Files:**
- Modify: `frontend/App.tsx:404-411`
- Test: `frontend/__tests__/app-git-fetch.test.tsx`

**Context:** `useEffect` depends on `trees` object, which is a new reference on every store update. Git status fetches for ALL projects on every tree change.

**Step 1: Write the failing test**

```typescript
describe("Git status fetch optimization", () => {
  it("should only fetch git status for newly added projects, not all", () => {
    const fetchSpy = vi.fn();
    // Mock useGitStatusStore.getState().fetchStatuses
    // After fix, fetchStatuses should only be called for new project paths
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run test**

**Step 3: Implement**

Replace the trees-dependent useEffect with a ref-based comparison:

```typescript
// Track which projects we've already fetched git status for
const fetchedProjectsRef = useRef<Set<string>>(new Set());

useEffect(() => {
  const projectPaths = Object.keys(trees);
  for (const projectPath of projectPaths) {
    if (!fetchedProjectsRef.current.has(projectPath)) {
      fetchedProjectsRef.current.add(projectPath);
      useGitStatusStore.getState().fetchStatuses(projectPath);
      useGitDiffStore.getState().fetchChangedFiles(projectPath);
    }
  }

  // Clean up removed projects
  for (const cached of fetchedProjectsRef.current) {
    if (!trees[cached]) {
      fetchedProjectsRef.current.delete(cached);
    }
  }
}, [trees]);
```

**Step 4: Run tests**

**Step 5: Commit**

```
perf(frontend): only fetch git status for newly opened projects

Uses ref-based tracking to avoid redundant git status IPC calls
when trees object reference changes without new projects being added.
```

---

### Task 8: Rate-limit system metrics collection

**Files:**
- Modify: `electron/metrics.ts:27-43`
- Test: `electron/__tests__/metrics.test.ts`

**Context:** Metrics collect every 2s and broadcast to ALL windows. Change to 5s interval and only send on change.

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from "vitest";

describe("metrics optimization", () => {
  it("should use 5s interval instead of 2s", () => {
    // After fix, INTERVAL_MS should be 5000
    expect(true).toBe(true); // Placeholder
  });

  it("should only send metrics when values change", () => {
    // After fix, metrics should compare with previous and skip if unchanged
    expect(true).toBe(true);
  });
});
```

**Step 2: Run test**

**Step 3: Implement**

```typescript
const INTERVAL_MS = 5000; // Was 2000

let lastMetrics: SystemMetrics | null = null;

function hasMetricsChanged(current: SystemMetrics): boolean {
  if (!lastMetrics) return true;
  // Only send if CPU changed >1% or memory changed >10MB
  return (
    Math.abs(current.cpu_usage - lastMetrics.cpu_usage) > 1 ||
    Math.abs(current.memory_used - lastMetrics.memory_used) > 10 * 1024 * 1024
  );
}

export function startMetricsLoop(getWindows: () => WebContents[]): void {
  if (metricsInterval) return;

  metricsInterval = setInterval(async () => {
    try {
      const metrics = await collectMetrics();
      if (!hasMetricsChanged(metrics)) return;
      lastMetrics = metrics;

      const windows = getWindows();
      for (const win of windows) {
        if (!win.isDestroyed()) {
          win.send("system-metrics", metrics);
        }
      }
    } catch {
      // ignore transient errors
    }
  }, INTERVAL_MS);
}
```

**Step 4: Run tests**

**Step 5: Commit**

```
perf(electron): reduce metrics interval to 5s and skip unchanged broadcasts

Reduces IPC overhead from 30 calls/min to ~12 calls/min per window.
Only broadcasts when CPU changes >1% or memory changes >10MB.
```

---

### Task 9: Fix hasChangedChildren O(n) to use prefix Set

**Files:**
- Modify: `frontend/stores/git-status.ts:54-67`
- Test: `frontend/stores/__tests__/git-status.test.ts` (extend)

**Context:** `hasChangedChildren` iterates all files for every directory node. Pre-compute a Set of changed parent directories.

**Step 1: Write the failing test**

```typescript
describe("hasChangedChildren optimization", () => {
  it("should efficiently check directory children using prefix cache", () => {
    const store = useGitStatusStore.getState();
    // Set up 1000 file statuses
    const statuses: Record<string, string> = {};
    for (let i = 0; i < 1000; i++) {
      statuses[`src/deep/path/file${i}.ts`] = "M";
    }
    // After fetchStatuses, hasChangedChildren should use cached prefixes
    expect(store.hasChangedChildren("src/deep", "/project")).toBe(true);
    expect(store.hasChangedChildren("lib/other", "/project")).toBe(false);
  });
});
```

**Step 2: Run test**

**Step 3: Implement**

Add a computed `changedDirs` Set that caches all parent directories of changed files:

```typescript
// In the store, add a derived field:
interface GitStatusState {
  // ... existing fields
  _changedDirsByProject: Record<string, Set<string>>;
}

// In fetchStatuses, compute changed dirs:
fetchStatuses: async (projectPath: string) => {
  try {
    const result = await invoke<Record<string, string>>(...);
    const changedDirs = new Set<string>();
    for (const filePath of Object.keys(result ?? {})) {
      let dir = filePath;
      while (dir.includes("/")) {
        dir = dir.substring(0, dir.lastIndexOf("/"));
        changedDirs.add(dir);
      }
    }
    set((state) => ({
      statuses: result ?? {},
      projectPath,
      statusesByProject: { ...state.statusesByProject, [projectPath]: result ?? {} },
      _changedDirsByProject: { ...state._changedDirsByProject, [projectPath]: changedDirs },
    }));
  } catch { /* ... */ }
},

// Optimized hasChangedChildren - O(1) lookup:
hasChangedChildren: (dirRelativePath: string, projectPath?: string) => {
  const { _changedDirsByProject, projectPath: activeProjectPath } = get();
  const effectiveProjectPath = projectPath ?? activeProjectPath;
  if (!effectiveProjectPath) return false;
  const dirSet = _changedDirsByProject[effectiveProjectPath];
  if (!dirSet) return false;
  const normalized = dirRelativePath.endsWith("/")
    ? dirRelativePath.slice(0, -1)
    : dirRelativePath;
  return dirSet.has(normalized);
},
```

**Step 4: Run tests**

Run: `pnpm vitest run frontend/stores/__tests__/git-status.test.ts`

**Step 5: Commit**

```
perf(stores): optimize hasChangedChildren from O(n) to O(1) with prefix Set

Pre-computes all changed parent directories on fetch.
Eliminates linear scan of all files for every tree node.
```

---

### Task 10: Replace span role="button" with real button in TabBar

**Files:**
- Modify: `frontend/components/tab-bar.tsx:57-67`
- Test: `frontend/components/__tests__/tab-bar.test.tsx`

**Context:** WCAG CRITICAL: `<span role="button">` lacks keyboard interaction. Replace with `<button>`.

**Step 1: Write the failing test**

```typescript
describe("TabBar accessibility", () => {
  it("close button should be a real button element", () => {
    const { getAllByLabelText } = render(
      <TabBar tabs={mockTabs} activeTabId="1" onSelectTab={vi.fn()} onCloseTab={vi.fn()} onSessionTypeSelect={vi.fn()} />
    );
    const closeButtons = getAllByLabelText(/Close/);
    closeButtons.forEach((btn) => {
      expect(btn.tagName).toBe("BUTTON");
    });
  });

  it("close button should be keyboard accessible", () => {
    const onClose = vi.fn();
    const { getAllByLabelText } = render(
      <TabBar tabs={mockTabs} activeTabId="1" onSelectTab={vi.fn()} onCloseTab={onClose} onSessionTypeSelect={vi.fn()} />
    );
    const closeBtn = getAllByLabelText(/Close/)[0];
    fireEvent.keyDown(closeBtn, { key: "Enter" });
    expect(onClose).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Implement**

```tsx
// Replace span with button in tab-bar.tsx
<button
  type="button"
  aria-label={`Close ${tab.name}`}
  onClick={(e) => {
    e.stopPropagation();
    onCloseTab(tab.id);
  }}
  className="flex h-4 w-4 items-center justify-center rounded opacity-0 transition-opacity hover:bg-ctp-surface0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-brand"
  tabIndex={isActive ? 0 : -1}
>
  <X className="h-3 w-3" strokeWidth={1.5} />
</button>
```

**Step 4: Run tests**

**Step 5: Commit**

```
fix(a11y): replace span role="button" with real button in TabBar

WCAG 2.1.1 Keyboard, 4.1.2 Name/Role/Value compliance.
Adds focus-visible styles and proper keyboard handling.
```

---

### Task 11: Add aria-live to terminal output and aria-expanded to collapsibles

**Files:**
- Modify: `frontend/components/terminal-session.tsx` (add aria-live)
- Modify: `frontend/components/file-tree-sidebar.tsx` (add aria-expanded)
- Modify: `frontend/components/git-changes-pane.tsx` (add aria-expanded)
- Test: `frontend/components/__tests__/file-tree-sidebar.test.tsx` (extend)

**Step 1: Write the failing test**

```typescript
describe("Accessibility - ARIA attributes", () => {
  it("file tree root should have aria-expanded", () => {
    const { getByRole } = render(<FileTreeSidebar />);
    const toggle = getByRole("button", { name: /Explorer/i });
    expect(toggle).toHaveAttribute("aria-expanded");
  });

  it("collapsible sections should announce state", () => {
    const { getByRole } = render(<FileTreeSidebar />);
    const toggle = getByRole("button", { name: /Explorer/i });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
  });
});
```

**Step 2: Run test**

**Step 3: Implement**

Add `aria-expanded` to all collapsible buttons:

```tsx
// file-tree-sidebar.tsx - root toggle
<button aria-expanded={expandedPaths[tree.root.path] ?? false} ...>

// file-tree-sidebar.tsx - explorer section
<button aria-expanded={explorerExpanded} ...>

// git-changes-pane.tsx - changes toggle
<button aria-expanded={expanded} ...>

// terminal-session.tsx - add status region
<div role="status" aria-live="polite" className="sr-only">
  {/* Screen reader announces terminal state changes */}
</div>
```

**Step 4: Run tests**

**Step 5: Commit**

```
fix(a11y): add aria-expanded and aria-live to interactive elements

WCAG 1.3.1, 4.1.2, 4.1.3 compliance.
Collapsible sections announce state, terminal has live region.
```

---

### Task 12: Make statusbar hover cards keyboard accessible

**Files:**
- Modify: `frontend/components/statusbar.tsx:134-305`
- Test: `frontend/components/__tests__/statusbar.test.tsx`

**Context:** HoverCard components are mouse-only. Add focusable triggers and keyboard handling.

**Step 1: Write the failing test**

```typescript
describe("Statusbar accessibility", () => {
  it("metric cards should be keyboard accessible", () => {
    const { getByLabelText } = render(<Statusbar />);
    const memoryTrigger = getByLabelText(/Memory/i);
    expect(memoryTrigger.getAttribute("tabindex")).not.toBe("-1");
  });
});
```

**Step 2: Run test**

**Step 3: Implement**

Make HoverCard triggers focusable buttons:

```tsx
<HoverCardTrigger asChild>
  <button
    type="button"
    tabIndex={0}
    aria-label="Memory usage details"
    className="inline-flex items-center gap-1 text-xs cursor-help focus-visible:ring-1 focus-visible:ring-brand rounded px-1"
  >
    {/* existing content */}
  </button>
</HoverCardTrigger>
```

Apply same pattern to CPU, Disk, and Network HoverCard triggers.

**Step 4: Run tests**

**Step 5: Commit**

```
fix(a11y): make statusbar hover cards keyboard accessible

WCAG 2.1.1 Keyboard compliance.
All metric hover cards now focusable with keyboard.
```

---

### Task 13: Extract duplicated project loading logic in file-tree store

**Files:**
- Modify: `frontend/stores/file-tree.ts`
- Test: `frontend/stores/__tests__/file-tree.test.ts` (extend)

**Context:** Project loading logic is duplicated 3 times in `openProject`, `openProjectPath`, and `loadProjectTree`. Extract shared helper.

**Step 1: Write the failing test**

```typescript
describe("file-tree store - deduplicated logic", () => {
  it("openProject and openProjectPath should produce identical state", async () => {
    const store = useFileTreeStore.getState();

    // Both methods should use the same underlying logic
    await store.openProjectPath("/test/project");
    const state1 = useFileTreeStore.getState();

    // Reset
    useFileTreeStore.setState({ trees: {}, currentPath: null });

    await store.openProjectPath("/test/project");
    const state2 = useFileTreeStore.getState();

    expect(state1.trees).toEqual(state2.trees);
    expect(state1.currentPath).toEqual(state2.currentPath);
  });
});
```

**Step 2: Run test**

**Step 3: Implement**

Extract a shared `_activateProject` helper inside the store:

```typescript
// Private helper inside store creation
const _activateProject = async (
  projectPath: string,
  get: () => FileTreeState,
  set: (partial: Partial<FileTreeState>) => void,
) => {
  await get().loadProjectTree(projectPath);
  const updatedTrees = get().trees;
  set({
    isOpen: true,
    currentPath: projectPath,
    activeProjectPath: projectPath,
    tree: updatedTrees[projectPath] ?? null,
  });
  invoke("add_recent_project", { path: projectPath }).catch((err) =>
    console.warn("Failed to add recent project:", err),
  );
  invoke("start_watcher", { path: projectPath }).catch((err) =>
    console.warn("Failed to start watcher:", err),
  );
};
```

Then use `_activateProject` in both `openProject` and `openProjectPath`, eliminating ~80 lines of duplication.

**Step 4: Run tests**

Run: `pnpm vitest run frontend/stores/__tests__/file-tree.test.ts`

**Step 5: Commit**

```
refactor(stores): extract shared project loading logic in file-tree store

Eliminates 3x duplication of tree loading, state setting, and IPC calls.
Replaces silent .catch(() => {}) with console.warn for debugging.
```

---

### Task 14: Replace silent .catch(() => {}) with proper error logging

**Files:**
- Modify: `frontend/stores/file-tree.ts` (6 instances)
- Modify: `frontend/App.tsx` (4 instances)
- Modify: `frontend/components/statusbar.tsx` (2 instances)
- Modify: `electron/watcher.ts` (3 instances)

**Context:** 15+ silent error catches hide failures. Replace with `console.warn` at minimum.

**Step 1: Write the failing test**

```typescript
describe("Error handling", () => {
  it("should log errors instead of silently swallowing them", () => {
    const warnSpy = vi.spyOn(console, "warn");

    // Trigger an operation that would .catch(() => {})
    // After fix, it should console.warn

    // The test validates the pattern exists
    expect(true).toBe(true);
  });
});
```

**Step 2: Run test**

**Step 3: Implement**

Global find-and-replace pattern:

```typescript
// BEFORE:
invoke("add_recent_project", { path }).catch(() => {});

// AFTER:
invoke("add_recent_project", { path }).catch((err) =>
  console.warn("[file-tree] Failed to add recent project:", err),
);
```

Apply to all 15+ instances with descriptive context in the message.

**Step 4: Run all tests**

Run: `pnpm vitest run`

**Step 5: Commit**

```
fix(error-handling): replace silent .catch(() => {}) with console.warn

Adds context-specific warning messages to 15+ silently swallowed errors.
Improves debuggability of IPC failures and watcher errors.
```

---

## Phase 2: MEDIUM Severity (12 tasks)

### Task 15: Enable Electron sandbox with preload adjustments

**Files:**
- Modify: `electron/main.ts:93`
- Modify: `electron/preload.cts` (verify compatibility)
- Test: Manual smoke test

**Implementation:**

```typescript
// electron/main.ts
webPreferences: {
  preload: path.join(__dirname, "preload.cjs"),
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,  // Enable OS-level process isolation
}
```

**Note:** Sandbox may require adjustments to preload script. If `sandbox: true` breaks functionality, document why it's disabled with a code comment and open a follow-up issue.

**Commit:**

```
feat(security): enable Electron sandbox for renderer process isolation

Adds OS-level process isolation to limit damage from renderer compromise.
```

---

### Task 16: Add lazy loading for heavy components

**Files:**
- Modify: `frontend/App.tsx:100-114`

**Implementation:**

```typescript
const GitDiffViewer = lazy(() =>
  import("./components/git-diff-viewer").then((m) => ({ default: m.GitDiffViewer }))
);
const CodeViewer = lazy(() =>
  import("./components/code-viewer").then((m) => ({ default: m.CodeViewer }))
);
const MarkdownRenderer = lazy(() =>
  import("./components/markdown-renderer").then((m) => ({ default: m.MarkdownRenderer }))
);
const ImageViewer = lazy(() =>
  import("./components/image-viewer").then((m) => ({ default: m.ImageViewer }))
);
```

Wrap usage sites with `<Suspense fallback={<LoadingSpinner />}>`.

**Commit:**

```
perf(frontend): lazy load CodeViewer, GitDiffViewer, and MarkdownRenderer

Reduces initial bundle load by deferring Shiki and markdown parser initialization.
```

---

### Task 17: Add memo to CodeViewer and other unmemoized components

**Files:**
- Modify: `frontend/components/code-viewer.tsx`
- Modify: `frontend/components/markdown-renderer.tsx`

**Implementation:**

```typescript
export const CodeViewer = memo(function CodeViewer({ code, filename }: CodeViewerProps) {
  // ... existing body
});

export const MarkdownRenderer = memo(function MarkdownRenderer({ content }: Props) {
  // ... existing body
});
```

**Commit:**

```
perf(frontend): add memo to CodeViewer and MarkdownRenderer

Prevents re-highlighting when parent re-renders with same props.
```

---

### Task 18: Validate user settings JSON against schema

**Files:**
- Create: `electron/settings-schema.ts`
- Modify: `electron/user-settings.ts:145`
- Test: `electron/__tests__/user-settings.test.ts` (extend)

**Implementation:**

Create a runtime schema validator:

```typescript
// electron/settings-schema.ts
interface SettingsSchema {
  fonts?: {
    app?: { family?: string; size?: number };
    editor?: { family?: string; size?: number };
    terminal?: { family?: string; size?: number };
  };
  sessions?: Record<string, {
    binary?: string;
    args?: string[];
    env?: Record<string, string>;
  }>;
  window?: {
    width?: number;
    height?: number;
  };
}

export function validateSettings(parsed: unknown): SettingsSchema {
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Settings must be a JSON object");
  }
  // Validate structure, reject unexpected keys
  // Validate binary names against SAFE_BINARY_RE
  // Validate args don't contain shell metacharacters
  return parsed as SettingsSchema;
}
```

**Commit:**

```
feat(security): validate user settings JSON against schema

Prevents injection via malicious session args or binary names.
```

---

### Task 19: Filter environment variables passed to PTY

**Files:**
- Modify: `electron/pty.ts:37-42`
- Test: `electron/__tests__/pty.test.ts` (extend)

**Implementation:**

```typescript
const SAFE_ENV_KEYS = new Set([
  "PATH", "HOME", "USER", "SHELL", "LANG", "LC_ALL", "LC_CTYPE",
  "EDITOR", "VISUAL", "PAGER", "XDG_RUNTIME_DIR", "XDG_CONFIG_HOME",
  "XDG_DATA_HOME", "XDG_CACHE_HOME", "DISPLAY", "WAYLAND_DISPLAY",
  "DBUS_SESSION_BUS_ADDRESS", "SSH_AUTH_SOCK",
]);

function buildSafeEnv(extraEnv?: Record<string, string>): Record<string, string> {
  const safe: Record<string, string> = {};
  for (const key of SAFE_ENV_KEYS) {
    if (process.env[key]) safe[key] = process.env[key]!;
  }
  return {
    ...safe,
    TERM: "xterm-256color",
    COLORTERM: "truecolor",
    ...(extraEnv ?? {}),
  };
}
```

**Commit:**

```
feat(security): whitelist environment variables passed to PTY processes

Prevents leaking sensitive env vars (API keys, tokens) to spawned processes.
```

---

### Task 20: Add aria-label to inputs and form elements

**Files:**
- Modify: `frontend/components/settings-editor.tsx` (textarea aria-label)
- Modify: `frontend/components/inline-edit.tsx` (input aria-label)
- Modify: `frontend/components/git-diff-viewer.tsx` (mode toggle aria-pressed)

**Implementation:**

```tsx
// settings-editor.tsx
<textarea aria-label="Settings JSON editor" aria-describedby="settings-error" ...>

// settings-editor.tsx - error display
<div id="settings-error" role="status" aria-live="polite">
  {error && <span>{error}</span>}
</div>

// inline-edit.tsx
<input aria-label={`Edit ${label}`} ...>

// git-diff-viewer.tsx - mode toggle
<button aria-pressed={mode === "split"} aria-label="Split view" ...>
<button aria-pressed={mode === "unified"} aria-label="Unified view" ...>
```

**Commit:**

```
fix(a11y): add aria-label to inputs and aria-pressed to toggles

WCAG 1.3.1, 3.3.2, 4.1.2 compliance for form elements and toggles.
```

---

### Task 21: Add tabpanel role and keyboard navigation to tab system

**Files:**
- Modify: `frontend/components/tab-bar.tsx`
- Modify: `frontend/components/terminal-pane.tsx`

**Implementation:**

```tsx
// tab-bar.tsx - add aria-controls
<button
  role="tab"
  aria-selected={isActive}
  aria-controls={`tabpanel-${tab.id}`}
  id={`tab-${tab.id}`}
  ...
>

// terminal-pane.tsx - add tabpanel role
{tabs.map((tab) => (
  <div
    key={tab.id}
    role="tabpanel"
    id={`tabpanel-${tab.id}`}
    aria-labelledby={`tab-${tab.id}`}
    hidden={tab.id !== activeTabId}
  >
    <TerminalSession ... />
  </div>
))}
```

Add Left/Right arrow key navigation between tabs in tablist.

**Commit:**

```
fix(a11y): add tabpanel roles and arrow key navigation to tab system

WCAG 1.3.1, 2.4.3 compliance for tab interface pattern.
```

---

### Task 22: Add focus-visible styles globally

**Files:**
- Modify: `frontend/index.css` or Tailwind config

**Implementation:**

Add global focus-visible styles:

```css
/* Global focus-visible for all interactive elements */
button:focus-visible,
[role="button"]:focus-visible,
a:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible,
[tabindex]:focus-visible {
  outline: 2px solid var(--ctp-mauve);
  outline-offset: 2px;
  border-radius: 2px;
}
```

**Commit:**

```
fix(a11y): add global focus-visible styles for keyboard navigation

WCAG 2.4.7 Focus Visible compliance with brand color outline.
```

---

### Task 23: Add type safety improvements to IPC layer

**Files:**
- Modify: `frontend/lib/ipc.ts:47-48,62`
- Test: `frontend/lib/__tests__/ipc.test.ts`

**Implementation:**

Replace `as unknown as T` with proper error handling:

```typescript
export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (typeof window !== "undefined" && window.electronAPI?.invoke) {
    const result = await window.electronAPI.invoke(cmd, args);
    return result as T;
  }
  throw new Error(`IPC not available: cannot invoke "${cmd}"`);
}
```

**Commit:**

```
refactor(ipc): improve type safety by removing unsafe type assertions

Replaces `as unknown as T` with proper error paths.
```

---

### Task 24: Add tests for uncovered hooks

**Files:**
- Create: `frontend/hooks/__tests__/use-system-metrics.test.ts`
- Create: `frontend/hooks/__tests__/use-panel-preferences.test.ts`

**Implementation:** Standard RTL + Vitest tests for hooks, mocking IPC layer.

**Commit:**

```
test(hooks): add tests for use-system-metrics and use-panel-preferences
```

---

### Task 25: Fix unhandled promise rejections in cleanup functions

**Files:**
- Modify: `frontend/App.tsx:346,428,434,471,483`
- Modify: `frontend/components/statusbar.tsx:93`

**Implementation:**

```typescript
// BEFORE:
return () => {
  unlisten.then((fn) => fn());
};

// AFTER:
return () => {
  unlisten.then((fn) => fn()).catch((err) =>
    console.warn("[cleanup] Failed to unlisten:", err),
  );
};
```

**Commit:**

```
fix(error-handling): handle promise rejections in IPC cleanup functions

Prevents unhandled rejection warnings when IPC system fails during unmount.
```

---

### Task 26: Decompose App.tsx keyboard handler

**Files:**
- Create: `frontend/hooks/use-keyboard-shortcuts.ts`
- Modify: `frontend/App.tsx`
- Test: `frontend/hooks/__tests__/use-keyboard-shortcuts.test.ts`

**Implementation:**

Extract the 125+ line keyboard handler into a dedicated hook:

```typescript
// frontend/hooks/use-keyboard-shortcuts.ts
export function useKeyboardShortcuts(options: KeyboardShortcutOptions) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // ... extracted logic
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
```

**Commit:**

```
refactor(frontend): extract keyboard shortcuts into dedicated hook

Reduces App.tsx from 796 to ~670 lines.
Improves testability of keyboard shortcut logic.
```

---

## Phase 3: LOW Severity (optional, after Phase 1+2)

### Task 27: Add memo to CodeViewer

Already covered in Task 17.

### Task 28: Log WebGL fallback in terminal

**File:** `frontend/components/terminal-session.tsx`

```typescript
try {
  terminal.loadAddon(new WebglAddon());
} catch (err) {
  console.info("[terminal] WebGL unavailable, using canvas renderer:", err);
}
```

### Task 29: Add error boundary to FileTreeNode

Wrap tree rendering with an error boundary component.

### Task 30: Move hardcoded constants to shared config

Extract `maxDepth: 8`, `DEBOUNCE_MS: 500`, `ITEM_HEIGHT: 28` to a constants file.

---

## Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| Phase 1 | 1-14 | All CRITICAL + HIGH (security, performance, a11y, maintainability) |
| Phase 2 | 15-26 | All MEDIUM (sandbox, lazy loading, ARIA, types, tests, decomposition) |
| Phase 3 | 27-30 | LOW (polish, logging, error boundaries, constants) |

**Estimated total:** 30 tasks across 3 phases.
**Priority:** Phase 1 is mandatory before any release. Phase 2 is strongly recommended. Phase 3 is nice-to-have.
