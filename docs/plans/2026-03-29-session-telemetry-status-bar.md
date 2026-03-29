# Session Telemetry Status Bar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enrich the terminal pane footer (`SessionStatusBar`) with real-time telemetry data (tokens, cost, context usage, tool activity) extracted from AI CLI session files.

**Architecture:** A new backend module (`session-telemetry.ts`) watches JSONL transcript files via chokidar and extracts cumulative token usage, cost, and last tool from the session. It emits IPC events to the renderer. A new Zustand store (`session-telemetry.ts`) holds per-tab metrics. The existing `SessionStatusBar` component subscribes to this store and renders a context bar, token count, cost, and tool indicator.

**Tech Stack:** TypeScript, Electron IPC, chokidar (already a dependency), Zustand, React, Tailwind CSS

---

## Context

### Current State

The `SessionStatusBar` component (`frontend/components/session-status-bar.tsx`) renders a 36px footer below each terminal pane. For AI CLI sessions it shows: CLI name, model, session state, session ID (8 chars), elapsed time, git info.

### Data Sources

**Claude Code JSONL** (`~/.claude/projects/<encoded-path>/<sessionId>.jsonl`):
Each line is a JSON object. Assistant messages contain:
```json
{
  "type": "assistant",
  "message": {
    "model": "claude-opus-4-6",
    "usage": {
      "input_tokens": 8500,
      "output_tokens": 1200,
      "cache_creation_input_tokens": 5000,
      "cache_read_input_tokens": 2000
    },
    "content": [
      { "type": "tool_use", "name": "Read" }
    ]
  }
}
```

**Gemini/Codex/Cursor:** Limited metadata available from session files. Will show basic info only (no token breakdown).

### Pricing (for cost calculation)

Claude model pricing per 1M tokens (used for estimation):

| Model Pattern | Input | Output | Cache Write | Cache Read |
|---------------|-------|--------|-------------|------------|
| opus | $15.00 | $75.00 | $18.75 | $1.50 |
| sonnet | $3.00 | $15.00 | $3.75 | $0.30 |
| haiku | $0.80 | $4.00 | $1.00 | $0.08 |

### Files Overview

| File | Action | Purpose |
|------|--------|---------|
| `electron/session-telemetry.ts` | Create | Backend: watch JSONL, parse usage, emit IPC events |
| `electron/main.ts` | Modify | Register IPC handlers for telemetry |
| `frontend/stores/session-telemetry.ts` | Create | Zustand store for per-tab telemetry data |
| `frontend/components/session-status-bar.tsx` | Modify | Render token/cost/context bar in footer |
| `electron/__tests__/session-telemetry.test.ts` | Create | Unit tests for JSONL parsing and cost calculation |
| `frontend/stores/__tests__/session-telemetry.test.ts` | Create | Unit tests for telemetry store |
| `frontend/components/__tests__/session-status-bar.telemetry.test.tsx` | Create | Tests for telemetry display in status bar |

---

## Task 1: Backend JSONL Parser and Cost Calculator

**Files:**
- Create: `electron/session-telemetry.ts`
- Test: `electron/__tests__/session-telemetry.test.ts`

### Step 1: Write the failing tests

```typescript
// electron/__tests__/session-telemetry.test.ts
import { describe, it, expect } from "vitest";
import {
  parseSessionUsage,
  calculateCost,
  formatTokens,
  type SessionTelemetry,
} from "../session-telemetry.js";

describe("session-telemetry", () => {
  describe("parseSessionUsage", () => {
    it("extracts cumulative usage from JSONL lines", () => {
      const lines = [
        '{"type":"user","message":{"role":"user"}}',
        '{"type":"assistant","message":{"model":"claude-opus-4-6","usage":{"input_tokens":1000,"output_tokens":200,"cache_creation_input_tokens":500,"cache_read_input_tokens":100},"content":[{"type":"text","text":"hello"}]}}',
        '{"type":"user","message":{"role":"user"}}',
        '{"type":"assistant","message":{"model":"claude-opus-4-6","usage":{"input_tokens":2000,"output_tokens":400,"cache_creation_input_tokens":0,"cache_read_input_tokens":800},"content":[{"type":"tool_use","name":"Read"},{"type":"text","text":"done"}]}}',
      ];
      const result = parseSessionUsage(lines);

      expect(result.totalInputTokens).toBe(3000);
      expect(result.totalOutputTokens).toBe(600);
      expect(result.totalCacheWriteTokens).toBe(500);
      expect(result.totalCacheReadTokens).toBe(900);
      expect(result.model).toBe("claude-opus-4-6");
      expect(result.lastTool).toBe("Read");
      expect(result.messageCount).toBe(2);
    });

    it("returns zeroes for empty input", () => {
      const result = parseSessionUsage([]);
      expect(result.totalInputTokens).toBe(0);
      expect(result.totalOutputTokens).toBe(0);
      expect(result.model).toBeNull();
      expect(result.lastTool).toBeNull();
    });

    it("skips malformed lines gracefully", () => {
      const lines = [
        "not json",
        '{"type":"assistant","message":{"model":"claude-sonnet-4-6","usage":{"input_tokens":500,"output_tokens":100},"content":[]}}',
      ];
      const result = parseSessionUsage(lines);
      expect(result.totalInputTokens).toBe(500);
      expect(result.model).toBe("claude-sonnet-4-6");
    });
  });

  describe("calculateCost", () => {
    it("calculates cost for opus model", () => {
      const telemetry: SessionTelemetry = {
        totalInputTokens: 1_000_000,
        totalOutputTokens: 100_000,
        totalCacheWriteTokens: 0,
        totalCacheReadTokens: 0,
        model: "claude-opus-4-6",
        lastTool: null,
        messageCount: 1,
      };
      // 1M input * $15/1M + 100k output * $75/1M = $15 + $7.5 = $22.5
      expect(calculateCost(telemetry)).toBeCloseTo(22.5, 1);
    });

    it("calculates cost with cache tokens", () => {
      const telemetry: SessionTelemetry = {
        totalInputTokens: 100_000,
        totalOutputTokens: 50_000,
        totalCacheWriteTokens: 200_000,
        totalCacheReadTokens: 500_000,
        model: "claude-sonnet-4-6",
        lastTool: null,
        messageCount: 1,
      };
      // input: 100k * $3/1M = $0.30
      // output: 50k * $15/1M = $0.75
      // cache write: 200k * $3.75/1M = $0.75
      // cache read: 500k * $0.30/1M = $0.15
      // total = $1.95
      expect(calculateCost(telemetry)).toBeCloseTo(1.95, 2);
    });

    it("returns 0 for unknown model", () => {
      const telemetry: SessionTelemetry = {
        totalInputTokens: 1000,
        totalOutputTokens: 500,
        totalCacheWriteTokens: 0,
        totalCacheReadTokens: 0,
        model: "unknown-model",
        lastTool: null,
        messageCount: 1,
      };
      expect(calculateCost(telemetry)).toBe(0);
    });

    it("returns 0 for null model", () => {
      const telemetry: SessionTelemetry = {
        totalInputTokens: 1000,
        totalOutputTokens: 500,
        totalCacheWriteTokens: 0,
        totalCacheReadTokens: 0,
        model: null,
        lastTool: null,
        messageCount: 1,
      };
      expect(calculateCost(telemetry)).toBe(0);
    });
  });

  describe("formatTokens", () => {
    it("formats thousands as k", () => {
      expect(formatTokens(1500)).toBe("1.5k");
      expect(formatTokens(15000)).toBe("15.0k");
    });

    it("formats millions as M", () => {
      expect(formatTokens(1_500_000)).toBe("1.5M");
    });

    it("formats small numbers as-is", () => {
      expect(formatTokens(500)).toBe("500");
    });

    it("formats zero", () => {
      expect(formatTokens(0)).toBe("0");
    });
  });
});
```

### Step 2: Run test to verify it fails

Run: `pnpm vitest run electron/__tests__/session-telemetry.test.ts -v`
Expected: FAIL with "Cannot find module '../session-telemetry.js'"

### Step 3: Write minimal implementation

```typescript
// electron/session-telemetry.ts
import * as fs from "fs";

export interface SessionTelemetry {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheWriteTokens: number;
  totalCacheReadTokens: number;
  model: string | null;
  lastTool: string | null;
  messageCount: number;
}

interface UsageRecord {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

interface AssistantMessage {
  type?: string;
  message?: {
    model?: string;
    usage?: UsageRecord;
    content?: Array<{ type?: string; name?: string }>;
  };
}

// Claude pricing per 1M tokens (USD)
const PRICING: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
  opus:   { input: 15.00, output: 75.00, cacheWrite: 18.75, cacheRead: 1.50 },
  sonnet: { input: 3.00,  output: 15.00, cacheWrite: 3.75,  cacheRead: 0.30 },
  haiku:  { input: 0.80,  output: 4.00,  cacheWrite: 1.00,  cacheRead: 0.08 },
};

function getModelFamily(model: string | null): string | null {
  if (!model) return null;
  const lower = model.toLowerCase();
  if (lower.includes("opus")) return "opus";
  if (lower.includes("sonnet")) return "sonnet";
  if (lower.includes("haiku")) return "haiku";
  return null;
}

export function parseSessionUsage(lines: string[]): SessionTelemetry {
  const result: SessionTelemetry = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCacheWriteTokens: 0,
    totalCacheReadTokens: 0,
    model: null,
    lastTool: null,
    messageCount: 0,
  };

  for (const line of lines) {
    if (!line.trim()) continue;
    let obj: AssistantMessage;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }

    if (obj.type !== "assistant" || !obj.message) continue;

    const { model, usage, content } = obj.message;
    if (model) result.model = model;

    if (usage) {
      result.totalInputTokens += usage.input_tokens ?? 0;
      result.totalOutputTokens += usage.output_tokens ?? 0;
      result.totalCacheWriteTokens += usage.cache_creation_input_tokens ?? 0;
      result.totalCacheReadTokens += usage.cache_read_input_tokens ?? 0;
      result.messageCount += 1;
    }

    if (content && Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "tool_use" && block.name) {
          result.lastTool = block.name;
        }
      }
    }
  }

  return result;
}

export function calculateCost(telemetry: SessionTelemetry): number {
  const family = getModelFamily(telemetry.model);
  if (!family || !PRICING[family]) return 0;
  const p = PRICING[family];
  const M = 1_000_000;

  return (
    (telemetry.totalInputTokens / M) * p.input +
    (telemetry.totalOutputTokens / M) * p.output +
    (telemetry.totalCacheWriteTokens / M) * p.cacheWrite +
    (telemetry.totalCacheReadTokens / M) * p.cacheRead
  );
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}k`;
  }
  return `${tokens}`;
}

/**
 * Reads a JSONL file and returns parsed telemetry.
 * Reads the full file content — suitable for periodic polling (not streaming).
 */
export function readSessionTelemetry(jsonlPath: string): SessionTelemetry | null {
  try {
    const content = fs.readFileSync(jsonlPath, "utf-8");
    const lines = content.split("\n");
    return parseSessionUsage(lines);
  } catch {
    return null;
  }
}
```

### Step 4: Run test to verify it passes

Run: `pnpm vitest run electron/__tests__/session-telemetry.test.ts -v`
Expected: PASS (all tests green)

### Step 5: Commit

```bash
git add electron/session-telemetry.ts electron/__tests__/session-telemetry.test.ts
git commit -m "feat(electron): add JSONL telemetry parser with cost calculation"
```

---

## Task 2: IPC Handler for Telemetry Requests

**Files:**
- Modify: `electron/main.ts` (add IPC handler near line 786)
- Modify: `electron/session-telemetry.ts` (export resolver function)

### Step 1: Add resolver function to session-telemetry.ts

Append to `electron/session-telemetry.ts`:

```typescript
import * as path from "path";
import * as os from "os";

function encodeProjectPath(projectPath: string): string {
  return projectPath.replace(/\//g, "-");
}

/**
 * Resolves telemetry for a specific CLI session.
 * Currently supports Claude Code only (JSONL-based).
 */
export function getSessionTelemetry(
  cliId: string,
  projectPath: string,
  sessionId: string
): (SessionTelemetry & { costUsd: number }) | null {
  if (cliId !== "claude" || !sessionId) return null;

  const projectDir = path.join(
    os.homedir(), ".claude", "projects", encodeProjectPath(projectPath)
  );
  const jsonlPath = path.join(projectDir, `${sessionId}.jsonl`);

  const telemetry = readSessionTelemetry(jsonlPath);
  if (!telemetry) return null;

  return { ...telemetry, costUsd: calculateCost(telemetry) };
}
```

### Step 2: Register IPC handler in main.ts

Add after the `get_session_model` handler (~line 788):

```typescript
ipcMain.handle("get_session_telemetry", (_event, args: { cliId: string; projectPath: string; sessionId: string }) => {
  return getSessionTelemetry(args.cliId, args.projectPath, args.sessionId);
});
```

### Step 3: Add to preload.ts IPC channels

Add `"get_session_telemetry"` to the invoke whitelist in `electron/preload.ts`.

### Step 4: Run existing tests to verify no regressions

Run: `pnpm vitest run electron/__tests__/ -v`
Expected: all existing tests PASS

### Step 5: Commit

```bash
git add electron/session-telemetry.ts electron/main.ts electron/preload.ts
git commit -m "feat(electron): add IPC handler for session telemetry"
```

---

## Task 3: Frontend Telemetry Store

**Files:**
- Create: `frontend/stores/session-telemetry.ts`
- Test: `frontend/stores/__tests__/session-telemetry.test.ts`

### Step 1: Write the failing tests

```typescript
// frontend/stores/__tests__/session-telemetry.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSessionTelemetryStore } from "../session-telemetry";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
  getCurrentWindow: () => ({ label: "main" }),
}));

import { invoke } from "@/lib/ipc";

describe("useSessionTelemetryStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionTelemetryStore.setState({ telemetry: {} });
  });

  it("starts with empty telemetry map", () => {
    expect(useSessionTelemetryStore.getState().telemetry).toEqual({});
  });

  it("getTelemetry returns null for unknown tab", () => {
    expect(useSessionTelemetryStore.getState().getTelemetry("tab-1")).toBeNull();
  });

  it("fetchTelemetry populates store with IPC result", async () => {
    vi.mocked(invoke).mockResolvedValueOnce({
      totalInputTokens: 5000,
      totalOutputTokens: 1000,
      totalCacheWriteTokens: 200,
      totalCacheReadTokens: 800,
      model: "claude-opus-4-6",
      lastTool: "Bash",
      messageCount: 3,
      costUsd: 0.15,
    });

    await useSessionTelemetryStore.getState().fetchTelemetry(
      "tab-1", "claude", "/project", "session-abc"
    );

    const result = useSessionTelemetryStore.getState().getTelemetry("tab-1");
    expect(result).not.toBeNull();
    expect(result!.totalInputTokens).toBe(5000);
    expect(result!.costUsd).toBe(0.15);
    expect(result!.lastTool).toBe("Bash");
  });

  it("fetchTelemetry handles null response gracefully", async () => {
    vi.mocked(invoke).mockResolvedValueOnce(null);

    await useSessionTelemetryStore.getState().fetchTelemetry(
      "tab-1", "gemini", "/project", "session-xyz"
    );

    expect(useSessionTelemetryStore.getState().getTelemetry("tab-1")).toBeNull();
  });

  it("cleanup removes telemetry for a tab", async () => {
    vi.mocked(invoke).mockResolvedValueOnce({
      totalInputTokens: 100,
      totalOutputTokens: 50,
      totalCacheWriteTokens: 0,
      totalCacheReadTokens: 0,
      model: "claude-sonnet-4-6",
      lastTool: null,
      messageCount: 1,
      costUsd: 0.01,
    });

    await useSessionTelemetryStore.getState().fetchTelemetry(
      "tab-1", "claude", "/project", "session-abc"
    );
    expect(useSessionTelemetryStore.getState().getTelemetry("tab-1")).not.toBeNull();

    useSessionTelemetryStore.getState().cleanup("tab-1");
    expect(useSessionTelemetryStore.getState().getTelemetry("tab-1")).toBeNull();
  });
});
```

### Step 2: Run test to verify it fails

Run: `pnpm vitest run frontend/stores/__tests__/session-telemetry.test.ts -v`
Expected: FAIL with "Cannot find module '../session-telemetry'"

### Step 3: Write minimal implementation

```typescript
// frontend/stores/session-telemetry.ts
import { create } from "zustand";
import { invoke } from "@/lib/ipc";

export interface TabTelemetry {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheWriteTokens: number;
  totalCacheReadTokens: number;
  model: string | null;
  lastTool: string | null;
  messageCount: number;
  costUsd: number;
}

interface SessionTelemetryState {
  telemetry: Record<string, TabTelemetry>;

  getTelemetry: (tabId: string) => TabTelemetry | null;
  fetchTelemetry: (tabId: string, cliId: string, projectPath: string, sessionId: string) => Promise<void>;
  cleanup: (tabId: string) => void;
}

export const useSessionTelemetryStore = create<SessionTelemetryState>((set, get) => ({
  telemetry: {},

  getTelemetry: (tabId: string) => {
    return get().telemetry[tabId] ?? null;
  },

  fetchTelemetry: async (tabId, cliId, projectPath, sessionId) => {
    try {
      const result = await invoke<TabTelemetry | null>("get_session_telemetry", {
        cliId,
        projectPath,
        sessionId,
      });
      if (result) {
        set((state) => ({
          telemetry: { ...state.telemetry, [tabId]: result },
        }));
      }
    } catch {
      // Non-fatal: telemetry is best-effort
    }
  },

  cleanup: (tabId: string) => {
    set((state) => {
      const { [tabId]: _, ...rest } = state.telemetry;
      return { telemetry: rest };
    });
  },
}));
```

### Step 4: Run test to verify it passes

Run: `pnpm vitest run frontend/stores/__tests__/session-telemetry.test.ts -v`
Expected: PASS

### Step 5: Commit

```bash
git add frontend/stores/session-telemetry.ts frontend/stores/__tests__/session-telemetry.test.ts
git commit -m "feat(frontend): add session telemetry Zustand store"
```

---

## Task 4: Telemetry Polling in SessionStatusBar

**Files:**
- Modify: `frontend/components/session-status-bar.tsx`
- Test: `frontend/components/__tests__/session-status-bar.telemetry.test.tsx`

### Step 1: Write the failing tests

```typescript
// frontend/components/__tests__/session-status-bar.telemetry.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SessionStatusBar } from "../session-status-bar";
import { useSessionTelemetryStore } from "@/stores/session-telemetry";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";
import { useSessionStateStore } from "@/stores/session-state";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn().mockResolvedValue(null),
  listen: vi.fn(() => () => {}),
  getCurrentWindow: () => ({ label: "main" }),
}));

describe("SessionStatusBar telemetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionTelemetryStore.setState({ telemetry: {} });
    useSessionStateStore.getState()._resetInternals();
    useSessionStateStore.setState({ states: {} });
    useTerminalTabsStore.setState({ tabs: [], activeTabId: null });
  });

  it("displays token count when telemetry is available", () => {
    // Set up a Claude tab
    useTerminalTabsStore.setState({
      tabs: [{
        id: "tab-1",
        name: "Claude",
        path: "/project",
        isRunning: true,
        sessionType: "claude",
        cliSessionId: "sess-abc",
        createdAt: Date.now(),
      }],
      activeTabId: "tab-1",
    });

    // Set telemetry data
    useSessionTelemetryStore.setState({
      telemetry: {
        "tab-1": {
          totalInputTokens: 15000,
          totalOutputTokens: 3000,
          totalCacheWriteTokens: 5000,
          totalCacheReadTokens: 2000,
          model: "claude-opus-4-6",
          lastTool: null,
          messageCount: 5,
          costUsd: 0.42,
        },
      },
    });

    render(<SessionStatusBar tabId="tab-1" path="/project" sessionType="claude" />);

    // Should display formatted token count
    expect(screen.getByText("18.0k")).toBeInTheDocument();
    // Should display cost
    expect(screen.getByText("$0.42")).toBeInTheDocument();
  });

  it("displays last active tool", () => {
    useTerminalTabsStore.setState({
      tabs: [{
        id: "tab-2",
        name: "Claude",
        path: "/project",
        isRunning: true,
        sessionType: "claude",
        cliSessionId: "sess-xyz",
        createdAt: Date.now(),
      }],
      activeTabId: "tab-2",
    });

    useSessionTelemetryStore.setState({
      telemetry: {
        "tab-2": {
          totalInputTokens: 5000,
          totalOutputTokens: 1000,
          totalCacheWriteTokens: 0,
          totalCacheReadTokens: 0,
          model: "claude-sonnet-4-6",
          lastTool: "Bash",
          messageCount: 2,
          costUsd: 0.03,
        },
      },
    });

    useSessionStateStore.setState({ states: { "tab-2": "thinking" } });

    render(<SessionStatusBar tabId="tab-2" path="/project" sessionType="claude" />);

    expect(screen.getByText("Bash")).toBeInTheDocument();
  });

  it("does not show telemetry for terminal sessions", () => {
    useTerminalTabsStore.setState({
      tabs: [{
        id: "tab-3",
        name: "Terminal",
        path: "/project",
        isRunning: true,
        sessionType: "terminal",
      }],
    });

    render(<SessionStatusBar tabId="tab-3" path="/project" sessionType="terminal" />);

    expect(screen.queryByText("$")).not.toBeInTheDocument();
  });
});
```

### Step 2: Run test to verify it fails

Run: `pnpm vitest run frontend/components/__tests__/session-status-bar.telemetry.test.tsx -v`
Expected: FAIL (token/cost elements not found)

### Step 3: Modify SessionStatusBar to display telemetry

In `frontend/components/session-status-bar.tsx`:

1. Add import:
```typescript
import { useSessionTelemetryStore } from "@/stores/session-telemetry";
```

2. Inside the component, after existing hooks, add:
```typescript
const telemetry = useSessionTelemetryStore((s) => s.getTelemetry(tabId));

// Poll telemetry every 5 seconds for AI CLI sessions
useEffect(() => {
  if (!isAiCli || !tab?.cliSessionId) return;
  const { fetchTelemetry } = useSessionTelemetryStore.getState();

  // Initial fetch
  fetchTelemetry(tabId, sessionType, path, tab.cliSessionId);

  const interval = setInterval(() => {
    const currentTab = useTerminalTabsStore.getState().tabs.find((t) => t.id === tabId);
    if (currentTab?.cliSessionId) {
      fetchTelemetry(tabId, sessionType, path, currentTab.cliSessionId);
    }
  }, 5_000);

  return () => clearInterval(interval);
}, [isAiCli, tabId, sessionType, path, tab?.cliSessionId]);
```

3. Add telemetry display after the elapsed time section (before the closing `</>`):
```tsx
{isAiCli && telemetry && telemetry.totalInputTokens > 0 && (
  <>
    <Separator />
    <StatusItem
      tooltip={`Tokens: ${telemetry.totalInputTokens.toLocaleString()} in / ${telemetry.totalOutputTokens.toLocaleString()} out${telemetry.totalCacheReadTokens > 0 ? ` / ${telemetry.totalCacheReadTokens.toLocaleString()} cached` : ""}`}
      className="text-ctp-subtext0 tabular-nums"
    >
      {formatTokens(telemetry.totalInputTokens + telemetry.totalCacheWriteTokens + telemetry.totalCacheReadTokens)}
    </StatusItem>
    {telemetry.costUsd > 0 && (
      <>
        <Separator />
        <StatusItem
          tooltip={`Estimated cost: $${telemetry.costUsd.toFixed(4)}`}
          className="text-ctp-subtext0 tabular-nums"
        >
          ${telemetry.costUsd < 0.01 ? telemetry.costUsd.toFixed(3) : telemetry.costUsd.toFixed(2)}
        </StatusItem>
      </>
    )}
    {telemetry.lastTool && sessionState === "thinking" && (
      <>
        <Separator />
        <StatusItem
          tooltip={`Last tool used: ${telemetry.lastTool}`}
          className="text-ctp-yellow"
        >
          {telemetry.lastTool}
        </StatusItem>
      </>
    )}
  </>
)}
```

4. Add `formatTokens` helper (imported from a shared location or inline):
```typescript
function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
  return `${tokens}`;
}
```

### Step 4: Run test to verify it passes

Run: `pnpm vitest run frontend/components/__tests__/session-status-bar.telemetry.test.tsx -v`
Expected: PASS

### Step 5: Run all existing session-status-bar tests

Run: `pnpm vitest run frontend/components/__tests__/session-status-bar.test.tsx -v`
Expected: all existing tests PASS (no regressions)

### Step 6: Commit

```bash
git add frontend/components/session-status-bar.tsx frontend/stores/session-telemetry.ts frontend/components/__tests__/session-status-bar.telemetry.test.tsx
git commit -m "feat(frontend): display token usage and cost in session status bar"
```

---

## Task 5: Cleanup on Tab Removal

**Files:**
- Modify: `frontend/stores/terminal-tabs.ts` (add telemetry cleanup in `removeTab`)

### Step 1: Write the failing test

Add to existing `terminal-tabs.test.ts`:

```typescript
it("cleans up telemetry store when tab is removed", async () => {
  const { useSessionTelemetryStore } = await import("@/stores/session-telemetry");

  // Set up telemetry for a tab
  useSessionTelemetryStore.setState({
    telemetry: {
      "tab-1": {
        totalInputTokens: 1000,
        totalOutputTokens: 500,
        totalCacheWriteTokens: 0,
        totalCacheReadTokens: 0,
        model: "claude-opus-4-6",
        lastTool: null,
        messageCount: 1,
        costUsd: 0.05,
      },
    },
  });

  // Add and remove tab
  const tabsStore = useTerminalTabsStore.getState();
  tabsStore.addTab("tab-1", "/project", "claude");
  tabsStore.removeTab("tab-1");

  // Telemetry should be cleaned up
  expect(useSessionTelemetryStore.getState().getTelemetry("tab-1")).toBeNull();
});
```

### Step 2: Run test to verify it fails

Run: `pnpm vitest run frontend/stores/__tests__/terminal-tabs.test.ts -t "cleans up telemetry" -v`
Expected: FAIL

### Step 3: Add cleanup call to removeTab

In `frontend/stores/terminal-tabs.ts`, import and call cleanup:

```typescript
// At the end of removeTab, after removing the block:
import("./session-telemetry").then(({ useSessionTelemetryStore }) => {
  useSessionTelemetryStore.getState().cleanup(id);
}).catch(() => {});
```

### Step 4: Run test to verify it passes

Run: `pnpm vitest run frontend/stores/__tests__/terminal-tabs.test.ts -t "cleans up telemetry" -v`
Expected: PASS

### Step 5: Run full test suite to verify no regressions

Run: `pnpm vitest run`
Expected: all tests PASS

### Step 6: Commit

```bash
git add frontend/stores/terminal-tabs.ts frontend/stores/__tests__/terminal-tabs.test.ts
git commit -m "fix(frontend): clean up telemetry store on tab removal"
```

---

## Summary of Status Bar Layout (After Implementation)

For AI CLI sessions, the status bar will show:

```
Claude Code | Opus 4.6 | thinking | 4b67b1ea | 31m | 18.0k | $0.42 | Bash           forja git:(main*)
```

| Segment | Source | Color |
|---------|--------|-------|
| CLI name | `CLI_REGISTRY.displayName` | brand color |
| Model | JSONL `message.model` | subtext0 |
| State | `useSessionStateStore` | semantic (yellow/green/gray) |
| Session ID | `tab.cliSessionId` (8 chars) | overlay1 |
| Elapsed | `tab.createdAt` → now | overlay1 |
| Tokens | `telemetry.totalInput + cache` | subtext0 tabular-nums |
| Cost | `telemetry.costUsd` | subtext0 tabular-nums |
| Last Tool | `telemetry.lastTool` (only during thinking) | yellow |
| Git | git CLI | right-aligned |

For non-Claude CLIs (Gemini, Codex, Cursor): the `get_session_telemetry` IPC returns `null`, so no token/cost is shown. This is extensible — future tasks can add parsers for other CLIs by extending `getSessionTelemetry()` in `electron/session-telemetry.ts`.
