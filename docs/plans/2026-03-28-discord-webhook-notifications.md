# Discord Webhook + OS Notifications Rewrite — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite the Forja notification system so that every AI response (each thinking->ready cycle) triggers both OS native notifications and Discord webhook messages with formatted markdown summaries. Fix the 4 bugs that prevent notifications from working correctly today.

**Architecture:** The notification pipeline has two halves:
1. **Frontend** (`session-state.ts`): Detects each AI response via thinking->ready transition (2s idle debounce). Remove the `notifiedTabs` one-shot guard so it fires on every response.
2. **Backend** (`pty-notifications.ts` + new `discord-notifications.ts`): Receives notification requests via existing `pty:notify-session-finished` IPC. OS notifications use `notify-send` first on Linux (reliable on Wayland). Discord gets the full buffer with `summarizeForDiscord()`. Suppression logic is split: OS suppresses when focused on same project, Discord always sends.

**Bugs being fixed:**
| # | Bug | Fix |
|---|-----|-----|
| 1 | `notifiedTabs` blocks after 1st notification | Remove guard, allow every thinking->ready cycle to notify |
| 2 | Buffer is cumulative (512KB), notification shows old content | Snapshot buffer at thinking start, send only delta at ready |
| 3 | `Electron.Notification` fails silently on Wayland | Try `notify-send` first on Linux, Electron as fallback |
| 4 | OS+Discord suppressed when focused on same project | Split: OS suppresses when focused, Discord always sends |

**Tech Stack:** TypeScript (Node.js), native `fetch` (Electron 32+), existing UserSettings system, existing RingBuffer.

---

## Task 1: Add `notifications` section to UserSettings types

**Files:**
- Modify: `apps/desktop/frontend/lib/settings-types.ts`
- Modify: `apps/desktop/electron/user-settings.ts`
- Test: `apps/desktop/electron/__tests__/user-settings.test.ts`

### Step 1: Write the failing test

Add tests that verify the `notifications` section is merged with defaults.

```typescript
// In user-settings.test.ts — add to existing describe block

it("should merge notifications defaults when absent", () => {
  const result = mergeWithDefaults({});
  expect(result.notifications).toEqual({
    discordWebhookUrl: "",
    discordMaxLength: 1900,
    discordEnabled: true,
  });
});

it("should preserve custom discord webhook URL", () => {
  const result = mergeWithDefaults({
    notifications: {
      discordWebhookUrl: "https://discord.com/api/webhooks/123/abc",
      discordMaxLength: 1500,
      discordEnabled: true,
    },
  });
  expect(result.notifications.discordWebhookUrl).toBe(
    "https://discord.com/api/webhooks/123/abc",
  );
  expect(result.notifications.discordMaxLength).toBe(1500);
});

it("should clamp discordMaxLength between 500 and 1900", () => {
  const result = validateSettings(mergeWithDefaults({
    notifications: { discordWebhookUrl: "", discordMaxLength: 50, discordEnabled: true },
  }));
  expect(result.notifications.discordMaxLength).toBe(500);

  const result2 = validateSettings(mergeWithDefaults({
    notifications: { discordWebhookUrl: "", discordMaxLength: 5000, discordEnabled: true },
  }));
  expect(result2.notifications.discordMaxLength).toBe(1900);
});
```

### Step 2: Run test to verify it fails

Run: `pnpm test apps/desktop/electron/__tests__/user-settings.test.ts -v`
Expected: FAIL — `notifications` property does not exist on `UserSettings`

### Step 3: Add `NotificationSettings` interface to frontend types

```typescript
// apps/desktop/frontend/lib/settings-types.ts — add before UserSettings interface

export interface NotificationSettings {
  discordWebhookUrl: string;
  discordMaxLength: number;
  discordEnabled: boolean;
}
```

Update `UserSettings` interface to include `notifications: NotificationSettings`.

Update `DEFAULT_SETTINGS`:

```typescript
notifications: {
  discordWebhookUrl: "",
  discordMaxLength: 1900,
  discordEnabled: true,
},
```

Update `mergeWithDefaults` to include:

```typescript
notifications: {
  ...DEFAULT_SETTINGS.notifications,
  ...(input.notifications ?? {}),
},
```

### Step 4: Mirror changes in electron/user-settings.ts

Add the same `NotificationSettings` interface, update `UserSettings`, `DEFAULT_SETTINGS`, `mergeWithDefaults`, and add validation in `validateSettings`:

```typescript
// In validateSettings, add to return object:
notifications: {
  ...settings.notifications,
  discordMaxLength: clamp(settings.notifications.discordMaxLength, 500, 1900),
  discordWebhookUrl: typeof settings.notifications.discordWebhookUrl === "string"
    ? settings.notifications.discordWebhookUrl.trim()
    : "",
},
```

### Step 5: Run test to verify it passes

Run: `pnpm test apps/desktop/electron/__tests__/user-settings.test.ts -v`
Expected: PASS

### Step 6: Commit

```bash
git add apps/desktop/frontend/lib/settings-types.ts apps/desktop/electron/user-settings.ts apps/desktop/electron/__tests__/user-settings.test.ts
git commit -m "feat: add notifications section to UserSettings with Discord webhook config"
```

---

## Task 2: Create `discord-notifications.ts` with summarization logic

**Files:**
- Create: `apps/desktop/electron/discord-notifications.ts`
- Create: `apps/desktop/electron/__tests__/discord-notifications.test.ts`

### Step 1: Write the failing tests

```typescript
// apps/desktop/electron/__tests__/discord-notifications.test.ts
import { describe, it, expect } from "vitest";
import {
  stripAnsi,
  collapseBlankLines,
  extractTrailingQuestion,
  summarizeForDiscord,
} from "../discord-notifications.js";

describe("stripAnsi", () => {
  it("removes ANSI color codes", () => {
    expect(stripAnsi("\x1b[32mgreen\x1b[0m")).toBe("green");
  });

  it("removes OSC sequences", () => {
    expect(stripAnsi("\x1b]0;title\x07text")).toBe("text");
  });

  it("collapses multiple spaces", () => {
    expect(stripAnsi("hello    world")).toBe("hello world");
  });
});

describe("collapseBlankLines", () => {
  it("collapses 3+ blank lines into 1", () => {
    expect(collapseBlankLines("a\n\n\n\nb")).toBe("a\n\nb");
  });

  it("preserves single blank lines", () => {
    expect(collapseBlankLines("a\n\nb")).toBe("a\n\nb");
  });
});

describe("extractTrailingQuestion", () => {
  it("extracts question from end of text", () => {
    const text = "Done editing files.\n\nShould I commit these changes?";
    expect(extractTrailingQuestion(text)).toBe("Should I commit these changes?");
  });

  it("returns empty string if no question", () => {
    expect(extractTrailingQuestion("All done.")).toBe("");
  });

  it("extracts multi-line question blocks", () => {
    const text = "Changes complete.\n\nWhich option do you prefer?\n- Option A\n- Option B";
    const result = extractTrailingQuestion(text);
    expect(result).toContain("Which option do you prefer?");
    expect(result).toContain("- Option A");
  });

  it("skips trailing blank lines", () => {
    const text = "Result ready.\n\nWant me to push?\n\n";
    expect(extractTrailingQuestion(text)).toBe("Want me to push?");
  });
});

describe("summarizeForDiscord", () => {
  it("returns short text as-is", () => {
    expect(summarizeForDiscord("Hello", 100)).toBe("Hello");
  });

  it("summarizes long text with head+tail", () => {
    const lines = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}: content here`);
    const text = lines.join("\n");
    const result = summarizeForDiscord(text, 300);
    expect(result.length).toBeLessThanOrEqual(350); // allow separator overhead
    expect(result).toContain("Line 1:");
    expect(result).toContain("Line 50:");
    expect(result).toContain("... conteudo resumido ...");
  });

  it("highlights trailing question separately", () => {
    const lines = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}: content`);
    lines.push("", "Deseja que eu faca o commit?");
    const text = lines.join("\n");
    const result = summarizeForDiscord(text, 400);
    expect(result).toContain("> **Pergunta:**");
    expect(result).toContain("Deseja que eu faca o commit?");
  });

  it("does not duplicate question in body and block", () => {
    const lines = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}: content`);
    lines.push("", "Want to continue?");
    const text = lines.join("\n");
    const result = summarizeForDiscord(text, 400);
    const questionCount = (result.match(/Want to continue\?/g) || []).length;
    expect(questionCount).toBe(1);
  });
});
```

### Step 2: Run tests to verify they fail

Run: `pnpm test apps/desktop/electron/__tests__/discord-notifications.test.ts -v`
Expected: FAIL — module not found

### Step 3: Implement `discord-notifications.ts`

```typescript
// apps/desktop/electron/discord-notifications.ts

/**
 * Discord webhook notification system for Forja.
 * Ported from ~/.claude/hooks/notify.sh summarization logic.
 *
 * Sends formatted markdown messages to Discord when AI sessions
 * produce output (Claude, Codex, Gemini, cursor-agent, etc.).
 */

/** Strip ANSI/OSC escape codes and collapse whitespace. */
export function stripAnsi(raw: string): string {
  let cleaned = raw;
  // OSC sequences (hyperlinks, window titles)
  cleaned = cleaned.replace(/\x1b\][\s\S]*?(?:\x07|\x1b\\)/g, "");
  // CSI sequences (colors, cursor movement)
  cleaned = cleaned.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
  // Remaining escape sequences
  cleaned = cleaned.replace(/\x1b[^[\]].?/g, "");
  // Collapse multiple spaces
  cleaned = cleaned.replace(/ {2,}/g, " ");
  return cleaned;
}

/** Collapse 3+ consecutive blank lines into a single blank line. */
export function collapseBlankLines(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n");
}

/**
 * Extract trailing question lines from the end of text.
 * Scans backwards, collecting lines that contain '?' and
 * continuation lines (starting with -, *, >, or space).
 */
export function extractTrailingQuestion(text: string): string {
  const lines = text.split("\n");
  const collected: string[] = [];
  let found = false;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line.trim() && !found) continue;
    if (line.includes("?") || (found && /^[-*> ]/.test(line))) {
      found = true;
      collected.unshift(line);
    } else if (found) {
      break;
    }
  }

  return collected.join("\n");
}

/**
 * Summarize text to fit within Discord's character limit.
 * Uses head+tail strategy (70%/25%) with separator, and
 * highlights trailing questions in a blockquote.
 */
export function summarizeForDiscord(text: string, maxLen: number): string {
  const cleaned = collapseBlankLines(text);
  const question = extractTrailingQuestion(cleaned);

  if (cleaned.length <= maxLen) return cleaned;

  // Remove question from body to avoid duplication
  let body = cleaned;
  if (question) {
    const qLines = question.split("\n").length;
    const bodyLines = body.split("\n");
    while (bodyLines.length > 0 && !bodyLines[bodyLines.length - 1].trim()) bodyLines.pop();
    bodyLines.splice(-qLines, qLines);
    while (bodyLines.length > 0 && !bodyLines[bodyLines.length - 1].trim()) bodyLines.pop();
    body = bodyLines.join("\n");
  }

  const questionBlock = question ? `\n\n> **Pergunta:**\n> ${question}` : "";
  let bodyMax = Math.max(maxLen - questionBlock.length, 150);

  const headLen = Math.floor(bodyMax * 0.7);
  const tailLen = Math.floor(bodyMax * 0.25);
  const separator = "\n\n> *... conteudo resumido ...*\n\n";

  const headRaw = body.slice(0, headLen);
  const lastNl = headRaw.lastIndexOf("\n");
  const head = lastNl > 0 ? headRaw.slice(0, lastNl) : headRaw;

  const tailRaw = body.slice(-tailLen);
  const firstNl = tailRaw.indexOf("\n");
  const tail = firstNl >= 0 ? tailRaw.slice(firstNl + 1) : tailRaw;

  return `${head}${separator}${tail}${questionBlock}`;
}

interface DiscordNotificationOptions {
  title: string;
  content: string;
  webhookUrl: string;
  maxLength?: number;
}

/**
 * Send a formatted markdown message to a Discord webhook.
 * Returns true if sent successfully, false otherwise.
 */
export async function sendDiscordWebhook(
  options: DiscordNotificationOptions,
): Promise<boolean> {
  const { title, content, webhookUrl, maxLength = 1900 } = options;
  if (!webhookUrl) return false;

  const overhead = title.length + 6; // **title**\n\n
  const available = Math.max(maxLength - overhead, 200);
  const cleaned = stripAnsi(content);
  const body = summarizeForDiscord(cleaned, available);
  const message = `**${title}**\n\n${body}`;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });
    return response.ok;
  } catch (err) {
    console.warn("[discord-notifications] Webhook failed:", err);
    return false;
  }
}
```

### Step 4: Run tests to verify they pass

Run: `pnpm test apps/desktop/electron/__tests__/discord-notifications.test.ts -v`
Expected: ALL PASS

### Step 5: Commit

```bash
git add apps/desktop/electron/discord-notifications.ts apps/desktop/electron/__tests__/discord-notifications.test.ts
git commit -m "feat: add discord-notifications module with summarization logic"
```

---

## Task 3: Fix `notifiedTabs` one-shot guard (Bug #1) and add buffer delta capture (Bug #2)

**Context:** Currently `notifiedTabs` blocks all notifications after the first thinking->ready cycle per tab. The buffer is cumulative (512KB RingBuffer), so notifications show old content from previous responses.

**Files:**
- Modify: `apps/desktop/frontend/stores/session-state.ts`
- Modify: `apps/desktop/frontend/stores/__tests__/session-state.test.ts`

### Step 1: Write the failing tests

```typescript
// Add to session-state.test.ts

it("should notify on EVERY thinking->ready cycle, not just the first", async () => {
  const mockInvoke = vi.mocked(invoke);
  const { onData } = useSessionStateStore.getState();
  const meta = { projectPath: "/project", sessionType: "claude" };

  // First cycle: thinking -> ready -> notifies
  onData("tab-1", meta);
  await vi.advanceTimersByTimeAsync(2000);
  const firstCallCount = mockInvoke.mock.calls.filter(
    (c) => c[0] === "pty:notify-session-finished",
  ).length;
  expect(firstCallCount).toBe(1);

  // Second cycle: new data arrives -> thinking -> ready -> should notify AGAIN
  onData("tab-1", meta);
  await vi.advanceTimersByTimeAsync(2000);
  const secondCallCount = mockInvoke.mock.calls.filter(
    (c) => c[0] === "pty:notify-session-finished",
  ).length;
  expect(secondCallCount).toBe(2); // <-- currently fails (stays 1)
});

it("should include bufferSnapshotLength in notification payload", async () => {
  const mockInvoke = vi.mocked(invoke);
  const { onData } = useSessionStateStore.getState();
  const meta = { projectPath: "/project", sessionType: "claude" };

  onData("tab-1", meta);
  await vi.advanceTimersByTimeAsync(2000);

  const call = mockInvoke.mock.calls.find(
    (c) => c[0] === "pty:notify-session-finished",
  );
  expect(call).toBeDefined();
  expect(call![1]).toHaveProperty("bufferSnapshotLength");
});
```

### Step 2: Run test to verify it fails

Run: `pnpm test apps/desktop/frontend/stores/__tests__/session-state.test.ts -v`
Expected: FAIL — second cycle doesn't fire notification, no `bufferSnapshotLength`

### Step 3: Remove `notifiedTabs` guard and add buffer snapshot

In `apps/desktop/frontend/stores/session-state.ts`:

**3a. Replace `notifiedTabs` with `bufferSnapshots`**

```typescript
// Remove:
const notifiedTabs = new Set<string>();

// Add:
// Buffer length snapshot taken when "thinking" starts.
// Used to compute delta for notification content.
const bufferSnapshots = new Map<string, number>();
```

**3b. In `onData`, snapshot the buffer length at thinking start**

When a tab transitions from non-thinking to thinking (i.e., the first `onData` after a ready/idle state), record the current buffer length so the backend can extract only the new content.

```typescript
onData: (tabId: string, meta?: TabMeta) => {
  if (meta) tabMetas.set(tabId, meta);
  tabsWithOutput.add(tabId);

  const prevState = get().states[tabId] ?? "idle";

  // Snapshot buffer length when entering thinking for the first time in this cycle
  if (prevState !== "thinking") {
    // Request current buffer length from backend (fire-and-forget)
    void invoke("pty:get-buffer-length", { tabId }).then((len: number) => {
      bufferSnapshots.set(tabId, len);
    });
  }

  set((state) => ({ states: { ...state.states, [tabId]: "thinking" } }));

  // ... rest of existing code (bridge to projects store, timer logic) ...
```

**3c. In the timer callback, ALWAYS notify (remove notifiedTabs guard)**

Replace the notification block inside the timer callback:

```typescript
// BEFORE (broken — one-shot):
if (!notifiedTabs.has(tabId)) {
  notifiedTabs.add(tabId);
  useProjectsStore.getState().markProjectNotified(storedMeta.projectPath, "Session finished");
  const payload: FinishedNotificationPayload = { ... };
  void invoke("pty:notify-session-finished", payload);
}

// AFTER (fires every cycle):
useProjectsStore.getState().markProjectNotified(storedMeta.projectPath, "Session finished");
const payload: FinishedNotificationPayload = {
  projectPath: storedMeta.projectPath,
  sessionType: storedMeta.sessionType,
  activeProjectPath: useProjectsStore.getState().activeProjectPath,
  tabId,
  bufferSnapshotLength: bufferSnapshots.get(tabId) ?? 0,
};
void invoke("pty:notify-session-finished", payload);
```

**3d. Update `FinishedNotificationPayload`**

```typescript
interface FinishedNotificationPayload extends TabMeta {
  activeProjectPath: string | null;
  tabId: string;
  bufferSnapshotLength: number; // byte offset to extract delta
}
```

**3e. Update `cleanup`**

```typescript
// Replace: notifiedTabs.delete(tabId);
// With:    bufferSnapshots.delete(tabId);
```

**3f. Remove `markTabSeen`**

`markTabSeen` only existed to clear `notifiedTabs`. Since we removed that guard, `markTabSeen` is no longer needed for notification purposes. However, keep the method but change it to only clear the project notification badge (it's still called from `tiling-layout.tsx:100`):

```typescript
markTabSeen: (tabId: string) => {
  // notifiedTabs no longer exists — markTabSeen now only
  // serves as a signal that the user has seen this tab.
  // The project notification badge is cleared in tiling-layout.tsx.
},
```

**3g. Update `_resetInternals`**

```typescript
_resetInternals: () => {
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
  tabMetas.clear();
  tabsWithOutput.clear();
  bufferSnapshots.clear();
},
```

### Step 4: Run test to verify it passes

Run: `pnpm test apps/desktop/frontend/stores/__tests__/session-state.test.ts -v`
Expected: ALL PASS

### Step 5: Commit

```bash
git add apps/desktop/frontend/stores/session-state.ts apps/desktop/frontend/stores/__tests__/session-state.test.ts
git commit -m "fix: allow notifications on every AI response, not just the first"
```

---

## Task 4: Fix OS notifications on Linux/Wayland (Bug #3) and split suppression (Bug #4)

**Context:** `Electron.Notification` fails silently on Wayland. Also, when the Forja window is focused on the same project, BOTH OS and Discord notifications are suppressed — Discord should always send.

**Files:**
- Modify: `apps/desktop/electron/pty-notifications.ts`
- Modify: `apps/desktop/electron/__tests__/pty-notification.test.ts`

### Step 1: Write the failing tests

```typescript
// Add to pty-notification.test.ts

it("on Linux tries notify-send FIRST, then Electron fallback", async () => {
  setPlatform("linux");
  const { execFile } = await import("child_process");
  const { showSessionFinishedNotification } = await import("../pty-notifications");

  const win = makeMockWindow(false);
  showSessionFinishedNotification(readyInfo, win);

  // notify-send should be called FIRST (primary on Linux)
  expect(execFile).toHaveBeenCalledWith(
    "notify-send",
    expect.arrayContaining(["--app-name=Forja"]),
    expect.any(Function),
  );
});

it("sends Discord even when window is focused on same project", async () => {
  const { maybeNotifyDiscord } = await import("../pty-notifications");
  // This should NOT be suppressed — Discord always sends
  await maybeNotifyDiscord({
    projectPath: "/home/user/my-app",
    sessionType: "claude",
    summary: "Test output.",
  });
  expect(mockSendDiscordWebhook).toHaveBeenCalled();
});
```

### Step 2: Run test to verify it fails

Run: `pnpm test apps/desktop/electron/__tests__/pty-notification.test.ts -v`
Expected: FAIL — Linux still tries Electron first; `maybeNotifyDiscord` not exported yet

### Step 3: Rewrite `showSessionFinishedNotification` with split suppression

```typescript
// apps/desktop/electron/pty-notifications.ts

import * as path from "path";
import { execFile } from "child_process";
import { Notification } from "electron";
import { sendDiscordWebhook } from "./discord-notifications.js";
import { getCachedSettings } from "./user-settings.js";

// ... keep existing interfaces and extractNotificationSummary ...

/**
 * Shows a native OS notification.
 * On Linux: try notify-send first (reliable on Wayland), Electron as fallback.
 * On macOS: use Electron.Notification (works well with native notification center).
 */
function showOsNotification(
  data: NotificationData,
  info: SessionReadyInfo,
  mainWindow: Electron.BrowserWindow | null,
): void {
  if (process.platform === "linux") {
    // notify-send is more reliable on Wayland (Hyprland, Sway, etc.)
    showNotificationLinux(data);
    // Also try Electron as a backup (may work on X11/some Wayland setups)
    showNotificationElectron(data, info, mainWindow);
  } else {
    showNotificationElectron(data, info, mainWindow);
  }
}

/**
 * Shows a native notification when an AI session produces new output.
 * OS notification: suppressed when focused on the same project.
 * Discord: ALWAYS sent (never suppressed by focus state).
 */
export function showSessionFinishedNotification(
  info: SessionReadyInfo,
  mainWindow: Electron.BrowserWindow | null,
): void {
  const data = buildSessionFinishedNotification(info);

  // OS notification: suppress only when focused on the same project
  const isFocusedOnSameProject =
    mainWindow?.isFocused() && info.activeProjectPath === info.projectPath;

  if (!isFocusedOnSameProject) {
    showOsNotification(data, info, mainWindow);
  }
}

// --- Discord integration ---

interface DiscordNotifyInfo {
  projectPath: string;
  sessionType: string;
  summary?: string;
}

/**
 * Sends a Discord webhook notification if configured.
 * NEVER suppressed by focus state — Discord always sends.
 */
export async function maybeNotifyDiscord(info: DiscordNotifyInfo): Promise<void> {
  const settings = getCachedSettings();
  const { discordWebhookUrl, discordMaxLength, discordEnabled } = settings.notifications;

  if (!discordEnabled || !discordWebhookUrl) return;
  if (!info.summary?.trim()) return;

  const projectName = path.basename(info.projectPath);
  const sessionName = info.sessionType.charAt(0).toUpperCase() + info.sessionType.slice(1);
  const title = `Forja — ${projectName} (${sessionName})`;

  await sendDiscordWebhook({
    title,
    content: info.summary,
    webhookUrl: discordWebhookUrl,
    maxLength: discordMaxLength,
  });
}
```

### Step 4: Run tests to verify they pass

Run: `pnpm test apps/desktop/electron/__tests__/pty-notification.test.ts -v`
Expected: ALL PASS

### Step 5: Commit

```bash
git add apps/desktop/electron/pty-notifications.ts apps/desktop/electron/__tests__/pty-notification.test.ts
git commit -m "fix: use notify-send first on Linux, split OS/Discord suppression"
```

---

## Task 5: Hook Discord + delta buffer into `main.ts` handler

**Context:** Wire up the new `maybeNotifyDiscord`, use `bufferSnapshotLength` to send only the delta (new output from this response, not the entire session history).

**Files:**
- Modify: `apps/desktop/electron/main.ts` (the `pty:notify-session-finished` handler, ~line 1000)
- Modify: `apps/desktop/electron/pty.ts` (add `getSessionBufferDelta` helper)
- Test: existing tests + integration test

### Step 1: Add `getSessionBufferDelta` to `pty.ts`

```typescript
// apps/desktop/electron/pty.ts — add after getSessionBuffer

/**
 * Returns the buffer content starting from a byte offset.
 * Used to extract only the new output since last notification.
 */
export function getSessionBufferSince(tabId: string, byteOffset: number): string | null {
  const full = getSessionBuffer(tabId);
  if (full === null) return null;
  if (byteOffset <= 0) return full;
  // byteOffset is the buffer length at thinking-start; slice from there
  return full.slice(byteOffset);
}
```

### Step 2: Add `pty:get-buffer-length` IPC handler in `main.ts`

```typescript
// In main.ts, add near the other pty handlers:

ipcMain.handle("pty:get-buffer-length", (_event, args: { tabId: string }) => {
  const buffer = getSessionBuffer(args.tabId);
  return buffer?.length ?? 0;
});
```

### Step 3: Update `pty:notify-session-finished` handler in `main.ts`

```typescript
ipcMain.handle(
  "pty:notify-session-finished",
  async (
    _event,
    args: {
      projectPath: string;
      sessionType: string;
      activeProjectPath: string | null;
      tabId?: string;
      bufferSnapshotLength?: number;
    },
  ) => {
    const { showSessionFinishedNotification, extractNotificationSummary, maybeNotifyDiscord } =
      await import("./pty-notifications.js");

    // Extract delta content (only new output from this response)
    let deltaContent: string | undefined;
    let summary: string | undefined;
    if (args.tabId) {
      const fullBuffer = getSessionBuffer(args.tabId);
      if (fullBuffer) {
        const offset = args.bufferSnapshotLength ?? 0;
        deltaContent = offset > 0 ? fullBuffer.slice(offset) : fullBuffer;
        summary = extractNotificationSummary(deltaContent);
      }
    }

    // OS notification (may be suppressed if focused on same project)
    const mainWindow = BrowserWindow.getAllWindows()[0] ?? null;
    showSessionFinishedNotification({ ...args, summary }, mainWindow);

    // Discord webhook (ALWAYS sends, uses full delta for rich summary)
    if (deltaContent) {
      maybeNotifyDiscord({
        projectPath: args.projectPath,
        sessionType: args.sessionType,
        summary: deltaContent,
      }).catch((err) => console.warn("[main] Discord notify failed:", err));
    }
  },
);
```

### Step 4: Add `pty:get-buffer-length` to preload.ts

In `apps/desktop/electron/preload.ts`, add the new IPC channel to the allowed list:

```typescript
// In the contextBridge.exposeInMainWorld section, add:
getBufferLength: (tabId: string) => ipcRenderer.invoke("pty:get-buffer-length", { tabId }),
```

And update `frontend/lib/ipc.ts` if needed to expose this channel.

### Step 5: Run full test suite

Run: `pnpm test -v`
Expected: ALL PASS, no regressions

### Step 6: Commit

```bash
git add apps/desktop/electron/main.ts apps/desktop/electron/pty.ts apps/desktop/electron/preload.ts apps/desktop/frontend/stores/session-state.ts
git commit -m "feat: integrate Discord webhook with delta buffer extraction"
```

---

## Task 6: Add Discord webhook URL field to Settings UI

**Files:**
- Modify: the settings dialog component (find via grep for existing settings sections)
- No new frontend tests needed (settings UI follows existing pattern)

### Step 1: Locate the settings UI component

```bash
grep -rl "performance\|UISettings\|PerformanceSettings" apps/desktop/frontend/components/ --include="*.tsx"
```

Find the settings panel that has sections for app/editor/terminal/window/performance/ui.

### Step 2: Add a "Notifications" section

Add after the last existing section:
- **Enable Discord Notifications** — toggle (maps to `notifications.discordEnabled`)
- **Discord Webhook URL** — text input (`type="url"`, placeholder `https://discord.com/api/webhooks/...`)
- **Max Message Length** — number input (500-1900, default 1900)

Use the same pattern as other settings sections (read from Zustand store, write via IPC `save_user_settings`).

### Step 3: Add webhook URL validation

```typescript
function isValidDiscordWebhook(url: string): boolean {
  if (!url) return true; // empty = disabled
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "discord.com" &&
      parsed.pathname.startsWith("/api/webhooks/")
    );
  } catch {
    return false;
  }
}
```

Show inline error message when URL format is invalid.

### Step 4: Test manually

1. `pnpm dev`
2. Open Settings > Notifications
3. Paste webhook URL, toggle enable, adjust max length
4. Verify `~/.config/forja/settings.json` is updated
5. Close and reopen settings — values should persist

### Step 5: Commit

```bash
git add apps/desktop/frontend/components/<settings-component>.tsx
git commit -m "feat: add Discord webhook configuration to Settings UI"
```

---

## Task 7: End-to-end validation

### Step 1: Create a test Discord webhook

Discord: Server Settings > Integrations > Webhooks > New Webhook > Copy URL

### Step 2: Configure in Forja

Via Settings UI or manually in `~/.config/forja/settings.json`:

```json
{
  "notifications": {
    "discordWebhookUrl": "https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN",
    "discordMaxLength": 1900,
    "discordEnabled": true
  }
}
```

### Step 3: Test each scenario

| Scenario | Expected OS | Expected Discord |
|----------|-------------|-----------------|
| AI responds, Forja NOT focused | Notification appears | Message sent |
| AI responds, Forja focused on SAME project | No notification | Message sent |
| AI responds, Forja focused on OTHER project | Notification appears | Message sent |
| AI responds TWICE without user clicking tab | TWO notifications | TWO messages |
| Long AI response (>1900 chars) | Summary (200 chars) | Head+tail with question block |
| AI response with trailing question | Question in notification body | `> **Pergunta:** ...` block |
| Discord disabled in settings | Notification appears | No message |
| No webhook URL configured | Notification appears | No message |

### Step 4: Verify Discord message format

```
**Forja — project-name (Claude)**

## Changes Made

- **Created** `file.ts` with new module
- **Updated** `other.ts` to use it

> *... conteudo resumido ...*

All tests passing. No regressions.

> **Pergunta:**
> Deseja que eu faca o commit?
```

### Step 5: Run full test suite

Run: `pnpm test`
Expected: ALL tests passing, no regressions

---

## Summary

| Task | What | Bug Fixed |
|------|------|-----------|
| 1 | Add `notifications` section to UserSettings | — |
| 2 | Create `discord-notifications.ts` (summarize + send) | — |
| 3 | Remove `notifiedTabs` guard, add buffer delta snapshot | Bug #1, #2 |
| 4 | Fix Linux notifications (notify-send first), split suppression | Bug #3, #4 |
| 5 | Wire Discord + delta into `main.ts` handler | — |
| 6 | Settings UI for webhook URL | — |
| 7 | End-to-end validation | All bugs |

**Total files:** ~6 modified, 2 created, 2 test files created/modified

**Dependencies:** None. Uses native `fetch` (Electron 32+). No new npm packages.

**Key architectural decisions:**
- `notify-send` primary on Linux (reliable on Wayland with mako/dunst/swaync)
- Buffer delta via byte-offset snapshot (only new content per response)
- OS notifications respect focus state; Discord NEVER suppressed
- Every thinking->ready cycle triggers notifications (no one-shot guard)
