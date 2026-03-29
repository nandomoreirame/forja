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
 * Call this hook once in the ChatPanel component.
 */
/** Known non-content event types that should never produce text output. */
const SKIP_EVENT_TYPES = new Set([
  "init", "system", "user",
  "thread.started", "turn.started",
]);

function extractTextFromEvent(event: ChatEventPayload["event"]): string | null {
  // Claude / Cursor-Agent format: event.type === "assistant" with message.content[]
  if (event.type === "assistant" && event.message) {
    const textParts = event.message.content
      .filter((p) => p.type === "text" && p.text)
      .map((p) => p.text!)
      .join("");
    return textParts || null;
  }

  // Raw text from non-JSON CLI output
  if (event.type === "text" && typeof event.text === "string") {
    return event.text as string;
  }

  // Gemini format: {"type":"message","role":"assistant","content":"..."}
  // Skip user echoes (role === "user")
  if (event.type === "message") {
    if (event.role === "assistant" && typeof event.content === "string") {
      return event.content as string;
    }
    return null;
  }

  // Codex format: {"type":"item.completed","item":{"type":"agent_message","text":"..."}}
  if (event.type === "item.completed" && event.item) {
    const item = event.item as Record<string, unknown>;
    if (typeof item.text === "string") return item.text;
  }

  // Skip known non-content events
  if (SKIP_EVENT_TYPES.has(event.type)) return null;

  // Generic fallback for unknown formats
  if (typeof event.content === "string") return event.content as string;
  if (typeof event.output === "string") return event.output as string;

  return null;
}

export function useAgentChatEvents(): void {
  useEffect(() => {
    const unlistenEvent = listen<ChatEventPayload>("chat:event", (ipcEvent) => {
      const { sessionId, event } = ipcEvent.payload;
      const store = useAgentChatStore.getState();

      if (store.sessionId !== sessionId) return;

      if (event.type === "result" || event.type === "turn.completed") {
        useAgentChatStore.setState({ status: "ready" });
        return;
      }

      if (event.type === "error") {
        useAgentChatStore.setState({
          error: (event.message as string) ?? "Unknown error",
          status: "ready",
        });
        return;
      }

      const text = extractTextFromEvent(event);
      if (text) {
        store.appendToLastAssistantMessage(text);
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
