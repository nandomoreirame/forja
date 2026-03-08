# Chat Panel UI + CLI Spawn Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar o painel de chat do Forja que abre como sidebar à esquerda, spawn de CLIs de IA (Claude Code, Codex, Gemini) via NDJSON stream-json, e integração com o Context Hub já implementado.

**Architecture:** O botão Chat na ProjectSidebar abre um painel lateral (ChatPanel) à esquerda do conteúdo principal. O backend spawna a CLI escolhida com `--input-format stream-json --output-format stream-json` (Claude) ou modo equivalente, comunicando via IPC. O frontend usa Vercel AI Elements (shadcn registry) para renderizar mensagens e input, com um Zustand store gerenciando o estado do chat. Comandos `/context`, `/skill`, `/agent` são interceptados pelo parser já existente (`chat-context-commands.ts`) e executados via IPC do Context Hub.

**Tech Stack:** Electron (node-pty, IPC), React 19, TypeScript, Zustand, Vercel AI Elements (shadcn registry), Vitest (jsdom + node).

---

## Dependências existentes reutilizadas

| Módulo | Path | O que fornece |
|--------|------|---------------|
| CLI Registry | `frontend/lib/cli-registry.ts` | `CliId`, `CLI_REGISTRY`, `getAllCliIds()` |
| CLI Detector | `electron/cli-detector.ts` | `detectInstalledClis()` |
| Installed CLIs hook | `frontend/hooks/use-installed-clis.ts` | `useInstalledClis()` |
| PTY | `electron/pty.ts` | Spawn pattern e `buildSafeEnv()` |
| IPC | `frontend/lib/ipc.ts` | `invoke()`, `listen()` |
| Context Commands | `frontend/lib/chat-context-commands.ts` | `parseContextCommand()` |
| Context Hub Store | `frontend/stores/context-hub.ts` | `useContextHubStore` |
| Project Sidebar | `frontend/components/project-sidebar.tsx` | Botão Chat (linha 275) |
| App Layout | `frontend/App.tsx` | Layout principal (precisa modificar) |

---

## Task 1: Instalar Vercel AI Elements

**Files:**
- Modify: `package.json` (novas deps)
- Create: `frontend/components/ai-elements/` (componentes do registry)

**Step 1: Instalar AI Elements via shadcn CLI**

```bash
npx ai-elements@latest add conversation
npx ai-elements@latest add message
npx ai-elements@latest add prompt-input
```

Se o CLI falhar (pnpm issue conhecida), instalar manualmente:

```bash
pnpm add react-markdown remark-gfm stick-to-bottom
```

E copiar os componentes do registry para `frontend/components/ai-elements/`.

**Step 2: Verificar que os componentes foram criados**

```bash
ls frontend/components/ai-elements/
# Esperado: conversation.tsx, message.tsx, prompt-input.tsx
```

**Step 3: Verificar build**

```bash
pnpm build
```

**Step 4: Commit**

```bash
git add frontend/components/ai-elements/ package.json pnpm-lock.yaml
git commit -m "chore: install vercel ai elements components"
```

---

## Task 2: Agent Chat backend (spawn CLI + NDJSON)

**Files:**
- Create: `electron/agent-chat.ts`
- Test: `electron/__tests__/agent-chat.test.ts`

**Step 1: Write the failing test**

```typescript
// electron/__tests__/agent-chat.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("child_process", () => ({
  spawn: vi.fn(),
}));

import { spawn } from "child_process";
import { buildCliArgs, parseStreamEvent, type StreamEvent } from "../agent-chat.js";

const mockSpawn = vi.mocked(spawn);

describe("agent-chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildCliArgs", () => {
    it("builds claude args with stream-json flags", () => {
      const args = buildCliArgs("claude", "/project");
      expect(args.binary).toBe("claude");
      expect(args.args).toContain("--input-format");
      expect(args.args).toContain("stream-json");
      expect(args.args).toContain("--output-format");
      expect(args.args).toContain("stream-json");
      expect(args.args).toContain("--verbose");
    });

    it("builds codex args for one-shot JSONL", () => {
      const args = buildCliArgs("codex", "/project");
      expect(args.binary).toBe("codex");
      // Codex uses --json for structured output
      expect(args.args).toContain("--json");
    });

    it("builds gemini args", () => {
      const args = buildCliArgs("gemini", "/project");
      expect(args.binary).toBe("gemini");
    });

    it("returns null for unsupported CLI", () => {
      const args = buildCliArgs("unknown" as any, "/project");
      expect(args).toBeNull();
    });
  });

  describe("parseStreamEvent", () => {
    it("parses assistant text delta", () => {
      const line = JSON.stringify({
        type: "assistant",
        message: { role: "assistant", content: [{ type: "text", text: "Hello" }] },
      });
      const event = parseStreamEvent(line);
      expect(event).toBeDefined();
      expect(event?.type).toBe("assistant");
    });

    it("parses result event", () => {
      const line = JSON.stringify({
        type: "result",
        result: "Done",
        duration_ms: 1500,
      });
      const event = parseStreamEvent(line);
      expect(event?.type).toBe("result");
    });

    it("returns null for invalid JSON", () => {
      const event = parseStreamEvent("not-json");
      expect(event).toBeNull();
    });

    it("returns null for empty line", () => {
      expect(parseStreamEvent("")).toBeNull();
      expect(parseStreamEvent("  ")).toBeNull();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test electron/__tests__/agent-chat.test.ts --project electron`
Expected: FAIL (module not found).

**Step 3: Write minimal implementation**

```typescript
// electron/agent-chat.ts
import { spawn, type ChildProcess } from "child_process";
import type { Readable } from "stream";

// Supported chat CLI modes
type ChatCliId = "claude" | "codex" | "gemini";

export interface CliArgs {
  binary: string;
  args: string[];
  env?: Record<string, string>;
}

export interface StreamEvent {
  type: string;
  [key: string]: unknown;
}

export interface ChatSession {
  id: string;
  process: ChildProcess;
  cliId: ChatCliId;
  projectPath: string;
}

const sessions = new Map<string, ChatSession>();

export function buildCliArgs(
  cliId: string,
  projectPath: string
): CliArgs | null {
  switch (cliId) {
    case "claude":
      return {
        binary: "claude",
        args: [
          "--input-format", "stream-json",
          "--output-format", "stream-json",
          "--verbose",
          "--max-turns", "1",
        ],
      };
    case "codex":
      return {
        binary: "codex",
        args: ["--json"],
      };
    case "gemini":
      return {
        binary: "gemini",
        args: [],
      };
    default:
      return null;
  }
}

export function parseStreamEvent(line: string): StreamEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as StreamEvent;
  } catch {
    return null;
  }
}

export function spawnChatSession(
  sessionId: string,
  cliId: ChatCliId,
  projectPath: string,
  onEvent: (event: StreamEvent) => void,
  onExit: (code: number | null) => void
): ChatSession | null {
  const cliArgs = buildCliArgs(cliId, projectPath);
  if (!cliArgs) return null;

  const proc = spawn(cliArgs.binary, cliArgs.args, {
    cwd: projectPath,
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, ...(cliArgs.env ?? {}) },
  });

  let buffer = "";

  const handleData = (data: Buffer) => {
    buffer += data.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const event = parseStreamEvent(line);
      if (event) onEvent(event);
    }
  };

  proc.stdout?.on("data", handleData);
  proc.stderr?.on("data", handleData);

  proc.on("exit", (code) => {
    sessions.delete(sessionId);
    onExit(code);
  });

  const session: ChatSession = {
    id: sessionId,
    process: proc,
    cliId,
    projectPath,
  };

  sessions.set(sessionId, session);
  return session;
}

export function sendChatMessage(
  sessionId: string,
  message: string
): boolean {
  const session = sessions.get(sessionId);
  if (!session?.process.stdin?.writable) return false;

  const payload = JSON.stringify({
    type: "user",
    message: { role: "user", content: [{ type: "text", text: message }] },
  });

  session.process.stdin.write(payload + "\n");
  return true;
}

export function closeChatSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  try {
    session.process.kill();
  } catch {
    // already dead
  }
  sessions.delete(sessionId);
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test electron/__tests__/agent-chat.test.ts --project electron`
Expected: PASS.

**Step 5: Commit**

```bash
git add electron/agent-chat.ts electron/__tests__/agent-chat.test.ts
git commit -m "feat(chat): add agent chat backend with cli spawn and ndjson parsing"
```

---

## Task 3: IPC handlers para agent chat

**Files:**
- Create: `electron/agent-chat-ipc.ts`
- Modify: `electron/main.ts` (registrar handlers)
- Test: `electron/__tests__/agent-chat-ipc.test.ts`

**Step 1: Write the failing test**

```typescript
// electron/__tests__/agent-chat-ipc.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../agent-chat.js", () => ({
  spawnChatSession: vi.fn(),
  sendChatMessage: vi.fn(),
  closeChatSession: vi.fn(),
}));

import * as agentChat from "../agent-chat.js";
import { createChatHandlers } from "../agent-chat-ipc.js";

const mockSpawn = vi.mocked(agentChat.spawnChatSession);
const mockSend = vi.mocked(agentChat.sendChatMessage);
const mockClose = vi.mocked(agentChat.closeChatSession);

describe("agent-chat-ipc", () => {
  let handlers: Record<string, (...args: unknown[]) => unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    const raw = createChatHandlers();
    handlers = Object.fromEntries(raw);
  });

  it("registers all expected handlers", () => {
    const keys = Object.keys(handlers);
    expect(keys).toContain("chat:spawn");
    expect(keys).toContain("chat:send");
    expect(keys).toContain("chat:close");
  });

  it("chat:spawn calls spawnChatSession", async () => {
    mockSpawn.mockReturnValue({
      id: "s1", process: {} as any, cliId: "claude", projectPath: "/p",
    });

    const result = await handlers["chat:spawn"](
      { sender: { send: vi.fn() } },
      { sessionId: "s1", cliId: "claude", projectPath: "/p" }
    );
    expect(result).toEqual({ sessionId: "s1" });
    expect(mockSpawn).toHaveBeenCalled();
  });

  it("chat:send calls sendChatMessage", async () => {
    mockSend.mockReturnValue(true);
    const result = await handlers["chat:send"](
      {},
      { sessionId: "s1", message: "hello" }
    );
    expect(result).toEqual({ sent: true });
  });

  it("chat:close calls closeChatSession", async () => {
    await handlers["chat:close"]({}, { sessionId: "s1" });
    expect(mockClose).toHaveBeenCalledWith("s1");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test electron/__tests__/agent-chat-ipc.test.ts --project electron`
Expected: FAIL.

**Step 3: Write minimal implementation**

```typescript
// electron/agent-chat-ipc.ts
import {
  spawnChatSession,
  sendChatMessage,
  closeChatSession,
  type StreamEvent,
} from "./agent-chat.js";

type IpcHandler = (event: unknown, args: unknown) => Promise<unknown>;

interface SpawnArgs {
  sessionId: string;
  cliId: "claude" | "codex" | "gemini";
  projectPath: string;
}

interface SendArgs {
  sessionId: string;
  message: string;
}

interface CloseArgs {
  sessionId: string;
}

export function createChatHandlers(): Array<[string, IpcHandler]> {
  return [
    ["chat:spawn", handleSpawn],
    ["chat:send", handleSend],
    ["chat:close", handleClose],
  ];
}

async function handleSpawn(event: unknown, args: unknown): Promise<unknown> {
  const { sessionId, cliId, projectPath } = args as SpawnArgs;
  const sender = (event as { sender?: { send: (ch: string, data: unknown) => void } })?.sender;

  const onEvent = (streamEvent: StreamEvent) => {
    sender?.send("chat:event", { sessionId, event: streamEvent });
  };

  const onExit = (code: number | null) => {
    sender?.send("chat:exit", { sessionId, code });
  };

  const session = spawnChatSession(sessionId, cliId, projectPath, onEvent, onExit);
  if (!session) throw new Error(`Failed to spawn ${cliId} chat session`);

  return { sessionId };
}

async function handleSend(_event: unknown, args: unknown): Promise<unknown> {
  const { sessionId, message } = args as SendArgs;
  const sent = sendChatMessage(sessionId, message);
  return { sent };
}

async function handleClose(_event: unknown, args: unknown): Promise<void> {
  const { sessionId } = args as CloseArgs;
  closeChatSession(sessionId);
}
```

Registrar no `electron/main.ts`:

```typescript
// Adicionar ao lazy import block:
const getAgentChatIpc = lazyImport(() => import("./agent-chat-ipc.js"));

// Adicionar após o bloco de Context Hub:
getAgentChatIpc().then(({ createChatHandlers }) => {
  for (const [channel, handler] of createChatHandlers()) {
    ipcMain.handle(channel, handler);
  }
});
```

**Step 4: Run test to verify it passes**

Run: `pnpm test electron/__tests__/agent-chat-ipc.test.ts --project electron`
Expected: PASS.

**Step 5: Commit**

```bash
git add electron/agent-chat-ipc.ts electron/__tests__/agent-chat-ipc.test.ts electron/main.ts
git commit -m "feat(chat): add ipc handlers for agent chat spawn/send/close"
```

---

## Task 4: Zustand store para agent chat

**Files:**
- Create: `frontend/stores/agent-chat.ts`
- Test: `frontend/stores/__tests__/agent-chat.test.ts`

**Step 1: Write the failing test**

```typescript
// frontend/stores/__tests__/agent-chat.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

import { invoke, listen } from "@/lib/ipc";
import { useAgentChatStore } from "../agent-chat";

const mockInvoke = vi.mocked(invoke);

describe("useAgentChatStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAgentChatStore.setState({
      messages: [],
      sessionId: null,
      cliId: null,
      status: "idle",
      error: null,
      isPanelOpen: false,
    });
  });

  describe("togglePanel", () => {
    it("toggles panel open/closed", () => {
      expect(useAgentChatStore.getState().isPanelOpen).toBe(false);
      useAgentChatStore.getState().togglePanel();
      expect(useAgentChatStore.getState().isPanelOpen).toBe(true);
      useAgentChatStore.getState().togglePanel();
      expect(useAgentChatStore.getState().isPanelOpen).toBe(false);
    });
  });

  describe("startSession", () => {
    it("spawns a chat session via IPC", async () => {
      mockInvoke.mockResolvedValue({ sessionId: "s1" });
      await useAgentChatStore.getState().startSession("claude", "/project");
      expect(mockInvoke).toHaveBeenCalledWith("chat:spawn", {
        sessionId: expect.any(String),
        cliId: "claude",
        projectPath: "/project",
      });
      expect(useAgentChatStore.getState().sessionId).toBeDefined();
      expect(useAgentChatStore.getState().cliId).toBe("claude");
      expect(useAgentChatStore.getState().status).toBe("ready");
    });

    it("sets error on spawn failure", async () => {
      mockInvoke.mockRejectedValue(new Error("spawn failed"));
      await useAgentChatStore.getState().startSession("claude", "/project");
      expect(useAgentChatStore.getState().error).toBe("spawn failed");
      expect(useAgentChatStore.getState().status).toBe("error");
    });
  });

  describe("sendMessage", () => {
    it("sends message via IPC and adds to history", async () => {
      // Setup active session
      useAgentChatStore.setState({
        sessionId: "s1",
        cliId: "claude",
        status: "ready",
      });

      mockInvoke.mockResolvedValue({ sent: true });
      await useAgentChatStore.getState().sendMessage("Hello");

      expect(mockInvoke).toHaveBeenCalledWith("chat:send", {
        sessionId: "s1",
        message: "Hello",
      });

      const messages = useAgentChatStore.getState().messages;
      expect(messages.length).toBe(1);
      expect(messages[0].role).toBe("user");
      expect(messages[0].content).toBe("Hello");
    });

    it("does nothing when no session active", async () => {
      await useAgentChatStore.getState().sendMessage("Hello");
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe("closeSession", () => {
    it("closes session via IPC", async () => {
      useAgentChatStore.setState({ sessionId: "s1", cliId: "claude" });
      mockInvoke.mockResolvedValue(undefined);

      await useAgentChatStore.getState().closeSession();
      expect(mockInvoke).toHaveBeenCalledWith("chat:close", { sessionId: "s1" });
      expect(useAgentChatStore.getState().sessionId).toBeNull();
      expect(useAgentChatStore.getState().status).toBe("idle");
    });
  });

  describe("addAssistantMessage", () => {
    it("adds assistant message to history", () => {
      useAgentChatStore.getState().addAssistantMessage("Hi there!");
      const messages = useAgentChatStore.getState().messages;
      expect(messages.length).toBe(1);
      expect(messages[0].role).toBe("assistant");
      expect(messages[0].content).toBe("Hi there!");
    });
  });

  describe("clearMessages", () => {
    it("clears all messages", () => {
      useAgentChatStore.getState().addAssistantMessage("msg1");
      useAgentChatStore.getState().addAssistantMessage("msg2");
      expect(useAgentChatStore.getState().messages.length).toBe(2);

      useAgentChatStore.getState().clearMessages();
      expect(useAgentChatStore.getState().messages.length).toBe(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test frontend/stores/__tests__/agent-chat.test.ts --project frontend`
Expected: FAIL.

**Step 3: Write minimal implementation**

```typescript
// frontend/stores/agent-chat.ts
import { invoke, listen } from "@/lib/ipc";
import { create } from "zustand";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

type ChatStatus = "idle" | "spawning" | "ready" | "streaming" | "error";

interface AgentChatState {
  messages: ChatMessage[];
  sessionId: string | null;
  cliId: string | null;
  status: ChatStatus;
  error: string | null;
  isPanelOpen: boolean;

  togglePanel: () => void;
  startSession: (cliId: string, projectPath: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  closeSession: () => Promise<void>;
  addAssistantMessage: (content: string) => void;
  clearMessages: () => void;
}

let messageCounter = 0;

function makeId(): string {
  return `msg-${Date.now()}-${++messageCounter}`;
}

function makeSessionId(): string {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useAgentChatStore = create<AgentChatState>((set, get) => ({
  messages: [],
  sessionId: null,
  cliId: null,
  status: "idle",
  error: null,
  isPanelOpen: false,

  togglePanel: () => set((s) => ({ isPanelOpen: !s.isPanelOpen })),

  startSession: async (cliId, projectPath) => {
    const sessionId = makeSessionId();
    set({ status: "spawning", error: null, cliId });
    try {
      await invoke("chat:spawn", { sessionId, cliId, projectPath });
      set({ sessionId, status: "ready" });
    } catch (err) {
      set({ status: "error", error: (err as Error).message });
    }
  },

  sendMessage: async (text) => {
    const { sessionId } = get();
    if (!sessionId) return;

    const userMsg: ChatMessage = {
      id: makeId(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    set((s) => ({
      messages: [...s.messages, userMsg],
      status: "streaming",
    }));

    await invoke("chat:send", { sessionId, message: text });
  },

  closeSession: async () => {
    const { sessionId } = get();
    if (sessionId) {
      await invoke("chat:close", { sessionId });
    }
    set({ sessionId: null, status: "idle", cliId: null });
  },

  addAssistantMessage: (content) => {
    const msg: ChatMessage = {
      id: makeId(),
      role: "assistant",
      content,
      timestamp: new Date().toISOString(),
    };
    set((s) => ({
      messages: [...s.messages, msg],
      status: "ready",
    }));
  },

  clearMessages: () => set({ messages: [] }),
}));
```

**Step 4: Run test to verify it passes**

Run: `pnpm test frontend/stores/__tests__/agent-chat.test.ts --project frontend`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/stores/agent-chat.ts frontend/stores/__tests__/agent-chat.test.ts
git commit -m "feat(chat): add agent chat zustand store with session management"
```

---

## Task 5: Hook useAgentChat (conecta IPC events ao store)

**Files:**
- Create: `frontend/hooks/use-agent-chat.ts`
- Test: `frontend/hooks/__tests__/use-agent-chat.test.ts`

**Step 1: Write the failing test**

```typescript
// frontend/hooks/__tests__/use-agent-chat.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

import { listen } from "@/lib/ipc";
import { useAgentChatStore } from "@/stores/agent-chat";

const mockListen = vi.mocked(listen);

describe("useAgentChat event listener", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAgentChatStore.setState({
      messages: [],
      sessionId: "s1",
      cliId: "claude",
      status: "streaming",
      error: null,
      isPanelOpen: true,
    });
  });

  it("registers listeners for chat:event and chat:exit", async () => {
    const { useAgentChatEvents } = await import("../use-agent-chat.js");
    renderHook(() => useAgentChatEvents());

    // Should have registered listeners for chat:event and chat:exit
    const registeredEvents = mockListen.mock.calls.map((c) => c[0]);
    expect(registeredEvents).toContain("chat:event");
    expect(registeredEvents).toContain("chat:exit");
  });

  it("adds assistant message on text content event", async () => {
    let chatEventCallback: ((event: { payload: unknown }) => void) | null = null;

    mockListen.mockImplementation(async (event, cb) => {
      if (event === "chat:event") {
        chatEventCallback = cb as typeof chatEventCallback;
      }
      return () => {};
    });

    const { useAgentChatEvents } = await import("../use-agent-chat.js");
    renderHook(() => useAgentChatEvents());

    // Simulate an assistant message event
    act(() => {
      chatEventCallback?.({
        payload: {
          sessionId: "s1",
          event: {
            type: "assistant",
            message: {
              role: "assistant",
              content: [{ type: "text", text: "Hello from Claude" }],
            },
          },
        },
      });
    });

    const messages = useAgentChatStore.getState().messages;
    expect(messages.length).toBe(1);
    expect(messages[0].content).toBe("Hello from Claude");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test frontend/hooks/__tests__/use-agent-chat.test.ts --project frontend`
Expected: FAIL.

**Step 3: Write minimal implementation**

```typescript
// frontend/hooks/use-agent-chat.ts
import { useEffect } from "react";
import { listen } from "@/lib/ipc";
import { useAgentChatStore } from "@/stores/agent-chat";

interface ChatEventPayload {
  sessionId: string;
  event: {
    type: string;
    message?: {
      role: string;
      content: Array<{ type: string; text?: string }>;
    };
    result?: string;
    [key: string]: unknown;
  };
}

interface ChatExitPayload {
  sessionId: string;
  code: number | null;
}

/**
 * Connects IPC events (chat:event, chat:exit) to the agent chat store.
 * Call this hook once in the App or ChatPanel component.
 */
export function useAgentChatEvents(): void {
  useEffect(() => {
    const unlistenEvent = listen<ChatEventPayload>("chat:event", (ipcEvent) => {
      const { sessionId, event } = ipcEvent.payload;
      const store = useAgentChatStore.getState();

      if (store.sessionId !== sessionId) return;

      if (event.type === "assistant" && event.message) {
        const textParts = event.message.content
          .filter((p) => p.type === "text" && p.text)
          .map((p) => p.text!)
          .join("");

        if (textParts) {
          store.addAssistantMessage(textParts);
        }
      }

      if (event.type === "result") {
        useAgentChatStore.setState({ status: "ready" });
      }
    });

    const unlistenExit = listen<ChatExitPayload>("chat:exit", (ipcEvent) => {
      const { sessionId } = ipcEvent.payload;
      const store = useAgentChatStore.getState();
      if (store.sessionId !== sessionId) return;

      useAgentChatStore.setState({
        sessionId: null,
        status: "idle",
      });
    });

    return () => {
      unlistenEvent.then((fn) => fn()).catch(() => {});
      unlistenExit.then((fn) => fn()).catch(() => {});
    };
  }, []);
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test frontend/hooks/__tests__/use-agent-chat.test.ts --project frontend`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/hooks/use-agent-chat.ts frontend/hooks/__tests__/use-agent-chat.test.ts
git commit -m "feat(chat): add hook to connect ipc chat events to store"
```

---

## Task 6: ChatPanel component com AI Elements

**Files:**
- Create: `frontend/components/chat-panel.tsx`
- Test: `frontend/components/__tests__/chat-panel.test.tsx`

**Step 1: Write the failing test**

```typescript
// frontend/components/__tests__/chat-panel.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockStartSession = vi.fn();
const mockSendMessage = vi.fn();
const mockCloseSession = vi.fn();
const mockTogglePanel = vi.fn();

const mockChatState = {
  messages: [] as Array<{ id: string; role: string; content: string; timestamp: string }>,
  sessionId: null as string | null,
  cliId: null as string | null,
  status: "idle" as string,
  error: null as string | null,
  isPanelOpen: true,
  startSession: mockStartSession,
  sendMessage: mockSendMessage,
  closeSession: mockCloseSession,
  togglePanel: mockTogglePanel,
  addAssistantMessage: vi.fn(),
  clearMessages: vi.fn(),
};

vi.mock("@/stores/agent-chat", () => ({
  useAgentChatStore: () => mockChatState,
}));

vi.mock("@/hooks/use-installed-clis", () => ({
  useInstalledClis: () => ({
    installedClis: [
      { id: "claude", displayName: "Claude Code", binary: "claude", icon: "" },
      { id: "gemini", displayName: "Gemini CLI", binary: "gemini", icon: "" },
    ],
    loading: false,
  }),
}));

vi.mock("@/hooks/use-agent-chat", () => ({
  useAgentChatEvents: vi.fn(),
}));

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

import { ChatPanel } from "../chat-panel";

describe("ChatPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChatState.messages = [];
    mockChatState.sessionId = null;
    mockChatState.cliId = null;
    mockChatState.status = "idle";
    mockChatState.error = null;
    mockChatState.isPanelOpen = true;
  });

  it("renders when panel is open", () => {
    render(<ChatPanel projectPath="/project" />);
    expect(screen.getByTestId("chat-panel")).toBeDefined();
  });

  it("shows CLI selector when no session active", () => {
    render(<ChatPanel projectPath="/project" />);
    expect(screen.getByText("Claude Code")).toBeDefined();
    expect(screen.getByText("Gemini CLI")).toBeDefined();
  });

  it("shows message input when session is active", () => {
    mockChatState.sessionId = "s1";
    mockChatState.cliId = "claude";
    mockChatState.status = "ready";

    render(<ChatPanel projectPath="/project" />);
    expect(screen.getByPlaceholderText(/message/i)).toBeDefined();
  });

  it("renders user and assistant messages", () => {
    mockChatState.sessionId = "s1";
    mockChatState.cliId = "claude";
    mockChatState.status = "ready";
    mockChatState.messages = [
      { id: "m1", role: "user", content: "Hello", timestamp: "2026-01-01" },
      { id: "m2", role: "assistant", content: "Hi there!", timestamp: "2026-01-01" },
    ];

    render(<ChatPanel projectPath="/project" />);
    expect(screen.getByText("Hello")).toBeDefined();
    expect(screen.getByText("Hi there!")).toBeDefined();
  });

  it("has close button", () => {
    render(<ChatPanel projectPath="/project" />);
    const closeButton = screen.getByLabelText("Close chat panel");
    expect(closeButton).toBeDefined();
    fireEvent.click(closeButton);
    expect(mockTogglePanel).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test frontend/components/__tests__/chat-panel.test.tsx --project frontend`
Expected: FAIL.

**Step 3: Write minimal implementation**

```typescript
// frontend/components/chat-panel.tsx
import { useState, useCallback, type FormEvent } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { useAgentChatStore } from "@/stores/agent-chat";
import { useInstalledClis } from "@/hooks/use-installed-clis";
import { useAgentChatEvents } from "@/hooks/use-agent-chat";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  projectPath: string | null;
}

export function ChatPanel({ projectPath }: ChatPanelProps) {
  const chat = useAgentChatStore();
  const { installedClis, loading: clisLoading } = useInstalledClis();
  const [inputText, setInputText] = useState("");

  useAgentChatEvents();

  const handleSelectCli = useCallback(
    (cliId: string) => {
      if (!projectPath) return;
      chat.startSession(cliId, projectPath);
    },
    [chat, projectPath]
  );

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const text = inputText.trim();
      if (!text) return;
      chat.sendMessage(text);
      setInputText("");
    },
    [chat, inputText]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as unknown as FormEvent);
      }
    },
    [handleSubmit]
  );

  const isStreaming = chat.status === "streaming";
  const hasSession = !!chat.sessionId;

  return (
    <div
      data-testid="chat-panel"
      className="flex h-full w-80 flex-col border-r border-ctp-surface0 bg-ctp-base"
    >
      {/* Header */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-ctp-surface0 px-3">
        <span className="text-xs font-medium text-ctp-subtext0">
          {hasSession ? `Chat (${chat.cliId})` : "Chat"}
        </span>
        <button
          type="button"
          aria-label="Close chat panel"
          onClick={chat.togglePanel}
          className="flex h-6 w-6 items-center justify-center rounded text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
        {!hasSession ? (
          <CliSelector
            clis={installedClis}
            loading={clisLoading}
            onSelect={handleSelectCli}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {chat.messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm",
                  msg.role === "user"
                    ? "ml-4 bg-ctp-surface0 text-ctp-text"
                    : "mr-4 bg-ctp-mantle text-ctp-subtext1"
                )}
              >
                {msg.content}
              </div>
            ))}
            {isStreaming && (
              <div className="flex items-center gap-2 text-xs text-ctp-overlay1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Thinking...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      {hasSession && (
        <form
          onSubmit={handleSubmit}
          className="flex shrink-0 items-end gap-2 border-t border-ctp-surface0 p-3"
        >
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="min-h-[36px] flex-1 resize-none rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm text-ctp-text placeholder:text-ctp-overlay0 outline-none focus:border-ctp-mauve"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isStreaming}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-ctp-mauve text-ctp-base transition-colors hover:bg-ctp-mauve/90 disabled:opacity-40"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </form>
      )}

      {/* Error */}
      {chat.error && (
        <div className="shrink-0 border-t border-ctp-red/30 bg-ctp-red/10 px-3 py-2 text-xs text-ctp-red">
          {chat.error}
        </div>
      )}
    </div>
  );
}

function CliSelector({
  clis,
  loading,
  onSelect,
}: {
  clis: Array<{ id: string; displayName: string; icon: string }>;
  loading: boolean;
  onSelect: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-ctp-overlay1" />
      </div>
    );
  }

  if (clis.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-ctp-overlay1">No AI CLIs detected</p>
        <p className="text-xs text-ctp-surface2">
          Install Claude Code, Codex, or Gemini CLI to start chatting.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3">
      <p className="text-sm text-ctp-overlay1">Choose an AI assistant</p>
      <div className="flex flex-col gap-2">
        {clis.map((cli) => (
          <button
            key={cli.id}
            type="button"
            onClick={() => onSelect(cli.id)}
            className="flex items-center gap-3 rounded-lg border border-ctp-surface1 px-4 py-2.5 text-sm text-ctp-text transition-colors hover:border-ctp-mauve hover:bg-ctp-surface0"
          >
            {cli.displayName}
          </button>
        ))}
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test frontend/components/__tests__/chat-panel.test.tsx --project frontend`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/components/chat-panel.tsx frontend/components/__tests__/chat-panel.test.tsx
git commit -m "feat(chat): add chat panel component with cli selector and message display"
```

---

## Task 7: Integrar ChatPanel no App.tsx + ProjectSidebar

**Files:**
- Modify: `frontend/App.tsx`
- Modify: `frontend/components/project-sidebar.tsx`
- Test: `frontend/components/__tests__/project-sidebar.test.tsx` (adaptar testes existentes)

**Step 1: Write the failing test**

Adicionar ao teste existente de `project-sidebar.test.tsx`:

```typescript
it("toggles chat panel on Chat button click", async () => {
  // ... render sidebar, click Chat button
  // expect useAgentChatStore.getState().isPanelOpen to toggle
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test frontend/components/__tests__/project-sidebar.test.tsx --project frontend`
Expected: FAIL.

**Step 3: Modify project-sidebar.tsx**

Importar e conectar o botão Chat ao store:

```diff
+ import { useAgentChatStore } from "@/stores/agent-chat";

  // Dentro de ProjectSidebar:
+ const toggleChat = useAgentChatStore((s) => s.togglePanel);

  // Substituir o botão Chat (linha ~275):
  <button
    type="button"
    aria-label="Chat"
+   onClick={toggleChat}
    className="..."
  >
```

Modificar `App.tsx` para renderizar o ChatPanel condicionalmente:

```diff
+ import { ChatPanel } from "./components/chat-panel";
+ import { useAgentChatStore } from "./stores/agent-chat";

  // Dentro de App():
+ const isChatOpen = useAgentChatStore((s) => s.isPanelOpen);

  // No layout, entre ProjectSidebar e o conteúdo principal:
  <ProjectSidebar onOpenProject={...} />
+ {isChatOpen && <ChatPanel projectPath={currentPath} />}
  <div className="flex min-w-0 flex-1 ...">
```

**Step 4: Run test to verify it passes**

Run: `pnpm test frontend/components/__tests__/project-sidebar.test.tsx --project frontend`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/App.tsx frontend/components/project-sidebar.tsx frontend/components/__tests__/project-sidebar.test.tsx
git commit -m "feat(chat): integrate chat panel in app layout with sidebar toggle"
```

---

## Task 8: Integrar context commands no chat

**Files:**
- Modify: `frontend/stores/agent-chat.ts` (interceptar comandos)
- Modify: `frontend/stores/__tests__/agent-chat.test.ts`

**Step 1: Write the failing test**

Adicionar ao teste existente:

```typescript
describe("sendMessage with context commands", () => {
  it("intercepts /context init and calls context hub", async () => {
    useAgentChatStore.setState({
      sessionId: "s1", cliId: "claude", status: "ready",
    });

    // Mock context hub store
    const contextHubMock = await import("@/stores/context-hub");
    // ... test that /context init is intercepted
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test frontend/stores/__tests__/agent-chat.test.ts --project frontend`
Expected: FAIL.

**Step 3: Modify agent-chat store**

Adicionar intercepção de comandos no `sendMessage`:

```diff
+ import { parseContextCommand } from "@/lib/chat-context-commands";
+ import { useContextHubStore } from "./context-hub";

  sendMessage: async (text) => {
+   // Check for context commands
+   const cmd = parseContextCommand(text);
+   if (cmd) {
+     return handleContextCommand(cmd, text, get, set);
+   }
    // ... normal message flow
  },
```

**Step 4: Run test to verify it passes**

Run: `pnpm test frontend/stores/__tests__/agent-chat.test.ts --project frontend`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/stores/agent-chat.ts frontend/stores/__tests__/agent-chat.test.ts
git commit -m "feat(chat): intercept context commands in chat and route to hub"
```

---

## Testes de aceitação (manual)

1. `pnpm dev` — abrir o app.
2. Adicionar um projeto com Claude Code instalado.
3. Clicar no botão Chat na project sidebar.
4. Verificar que o painel abre à esquerda com lista de CLIs instaladas.
5. Selecionar "Claude Code".
6. Digitar uma mensagem e enviar.
7. Verificar que a resposta aparece no chat.
8. Digitar `/context init` e verificar que o hub é inicializado.
9. Fechar o painel clicando no X.

Comando de regressão:

```bash
pnpm test --project electron && pnpm test --project frontend
```

---

## Riscos e mitigação

1. **AI Elements pode ter problemas com pnpm**
   - Mitigação: instalação manual dos componentes como fallback.

2. **Claude stream-json pode mudar entre versões**
   - Mitigação: parsing resiliente com fallback para raw text.

3. **Codex/Gemini podem não suportar streaming bidirecional**
   - Mitigação: modo one-shot (spawn por mensagem) como fallback.

4. **Layout shift quando chat abre/fecha**
   - Mitigação: chat tem largura fixa (w-80 = 320px) com transição suave.
