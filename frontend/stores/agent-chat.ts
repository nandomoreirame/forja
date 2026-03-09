import { invoke } from "@/lib/ipc";
import { create } from "zustand";
import { parseContextCommand, type ContextCommand } from "@/lib/chat-context-commands";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export type ChatStatus = "idle" | "spawning" | "ready" | "streaming" | "error";

interface AgentChatState {
  messages: ChatMessage[];
  sessionId: string | null;
  cliId: string | null;
  projectPath: string | null;
  status: ChatStatus;
  error: string | null;
  isPanelOpen: boolean;

  togglePanel: () => void;
  startSession: (cliId: string, projectPath?: string) => Promise<void>;
  switchSession: (cliId: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  closeSession: () => Promise<void>;
  addAssistantMessage: (content: string) => void;
  appendToLastAssistantMessage: (content: string) => void;
  addSystemMessage: (content: string) => void;
  clearMessages: () => void;
}

let messageCounter = 0;

function makeId(): string {
  return `msg-${Date.now()}-${++messageCounter}`;
}

function makeSessionId(): string {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: makeId(),
    role,
    content,
    timestamp: new Date().toISOString(),
  };
}

async function handleContextCommand(
  cmd: ContextCommand,
  addSystem: (content: string) => void,
): Promise<void> {
  try {
    if (cmd.type === "context") {
      switch (cmd.action) {
        case "init": {
          await invoke("context:init", {});
          addSystem("Context hub initialized.");
          return;
        }
        case "status": {
          const status = await invoke("context:status", {});
          addSystem(`Context status: ${JSON.stringify(status)}`);
          return;
        }
        case "sync out": {
          const result = await invoke("context:sync_out", { ...cmd.options });
          addSystem(`Sync out complete: ${JSON.stringify(result)}`);
          return;
        }
        case "sync in": {
          const result = await invoke("context:sync_in", { ...cmd.options });
          addSystem(`Sync in complete: ${JSON.stringify(result)}`);
          return;
        }
      }
    }

    if (cmd.type === "skill" && cmd.action === "create" && cmd.slug) {
      await invoke("context:create_skill", { slug: cmd.slug });
      addSystem(`Skill "${cmd.slug}" created.`);
      return;
    }

    if (cmd.type === "agent" && cmd.action === "create" && cmd.slug) {
      await invoke("context:create_agent", { slug: cmd.slug });
      addSystem(`Agent "${cmd.slug}" created.`);
      return;
    }

    addSystem(`Unknown command: ${cmd.type} ${cmd.action}`);
  } catch (err) {
    addSystem(`Command error: ${(err as Error).message}`);
  }
}

export const useAgentChatStore = create<AgentChatState>((set, get) => ({
  messages: [],
  sessionId: null,
  cliId: null,
  projectPath: null,
  status: "idle",
  error: null,
  isPanelOpen: false,

  togglePanel: () => set((s) => ({ isPanelOpen: !s.isPanelOpen })),

  startSession: async (cliId, projectPath) => {
    const sessionId = makeSessionId();
    set({ status: "spawning", error: null, cliId, projectPath: projectPath ?? null });
    try {
      const spawnArgs: Record<string, string> = { sessionId, cliId };
      if (projectPath) spawnArgs.projectPath = projectPath;
      await invoke("chat:spawn", spawnArgs);
      set({ sessionId, status: "ready" });
    } catch (err) {
      set({ status: "error", error: (err as Error).message });
    }
  },

  switchSession: async (newCliId) => {
    const { sessionId, cliId, projectPath } = get();
    if (cliId === newCliId) return;

    // Close existing session if any
    if (sessionId) {
      try {
        await invoke("chat:close", { sessionId });
      } catch {
        // Ignore close errors - proceed to open new session
      }
    }

    // Start new session keeping existing messages
    const newSessionId = makeSessionId();
    set({ status: "spawning", error: null, cliId: newCliId, sessionId: null });
    try {
      const spawnArgs: Record<string, string> = { sessionId: newSessionId, cliId: newCliId };
      if (projectPath) spawnArgs.projectPath = projectPath;
      await invoke("chat:spawn", spawnArgs);
      set({ sessionId: newSessionId, status: "ready" });
    } catch (err) {
      set({ status: "error", error: (err as Error).message });
    }
  },

  sendMessage: async (text) => {
    const { sessionId, projectPath } = get();
    if (!sessionId) return;

    // Check for context commands
    const cmd = parseContextCommand(text);
    if (cmd) {
      const userMsg = makeMessage("user", text);
      set((s) => ({ messages: [...s.messages, userMsg] }));

      const addSystem = (content: string) => {
        const sysMsg = makeMessage("system", content);
        set((s) => ({ messages: [...s.messages, sysMsg] }));
      };

      await handleContextCommand(cmd, addSystem);
      return;
    }

    const userMsg = makeMessage("user", text);
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
    set({ sessionId: null, status: "idle", cliId: null, projectPath: null });
  },

  addAssistantMessage: (content) => {
    set((s) => ({
      messages: [...s.messages, makeMessage("assistant", content)],
      status: "ready",
    }));
  },

  appendToLastAssistantMessage: (content) => {
    set((s) => {
      const msgs = [...s.messages];
      const lastIdx = msgs.length - 1;
      if (lastIdx >= 0 && msgs[lastIdx].role === "assistant") {
        msgs[lastIdx] = { ...msgs[lastIdx], content: msgs[lastIdx].content + content };
        return { messages: msgs };
      }
      return { messages: [...msgs, makeMessage("assistant", content)] };
    });
  },

  addSystemMessage: (content) => {
    set((s) => ({
      messages: [...s.messages, makeMessage("system", content)],
    }));
  },

  clearMessages: () => set({ messages: [] }),
}));
