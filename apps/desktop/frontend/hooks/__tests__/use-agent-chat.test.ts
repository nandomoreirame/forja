import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

import { listen } from "@/lib/ipc";
import { useAgentChatStore } from "@/stores/agent-chat";

const mockListen = vi.mocked(listen);

describe("useAgentChatEvents", () => {
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
    const { useAgentChatEvents } = await import("../use-agent-chat");
    renderHook(() => useAgentChatEvents());

    const registeredEvents = mockListen.mock.calls.map((c) => c[0]);
    expect(registeredEvents).toContain("chat:event");
    expect(registeredEvents).toContain("chat:exit");
  });

  it("adds assistant message on text content event", async () => {
    let chatEventCallback: ((event: { payload: unknown }) => void) | null = null;

    mockListen.mockImplementation(async (event: string, cb: unknown) => {
      if (event === "chat:event") {
        chatEventCallback = cb as typeof chatEventCallback;
      }
      return () => {};
    });

    const { useAgentChatEvents } = await import("../use-agent-chat");
    renderHook(() => useAgentChatEvents());

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

  it("sets status to ready on result event", async () => {
    let chatEventCallback: ((event: { payload: unknown }) => void) | null = null;

    mockListen.mockImplementation(async (event: string, cb: unknown) => {
      if (event === "chat:event") {
        chatEventCallback = cb as typeof chatEventCallback;
      }
      return () => {};
    });

    const { useAgentChatEvents } = await import("../use-agent-chat");
    renderHook(() => useAgentChatEvents());

    act(() => {
      chatEventCallback?.({
        payload: {
          sessionId: "s1",
          event: { type: "result", result: "Done" },
        },
      });
    });

    expect(useAgentChatStore.getState().status).toBe("ready");
  });

  it("resets session on exit event", async () => {
    let exitCallback: ((event: { payload: unknown }) => void) | null = null;

    mockListen.mockImplementation(async (event: string, cb: unknown) => {
      if (event === "chat:exit") {
        exitCallback = cb as typeof exitCallback;
      }
      return () => {};
    });

    const { useAgentChatEvents } = await import("../use-agent-chat");
    renderHook(() => useAgentChatEvents());

    act(() => {
      exitCallback?.({
        payload: { sessionId: "s1", code: 0 },
      });
    });

    expect(useAgentChatStore.getState().sessionId).toBeNull();
    expect(useAgentChatStore.getState().status).toBe("idle");
  });

  it("handles text event from non-JSON CLI output", async () => {
    let chatEventCallback: ((event: { payload: unknown }) => void) | null = null;

    mockListen.mockImplementation(async (event: string, cb: unknown) => {
      if (event === "chat:event") {
        chatEventCallback = cb as typeof chatEventCallback;
      }
      return () => {};
    });

    const { useAgentChatEvents } = await import("../use-agent-chat");
    renderHook(() => useAgentChatEvents());

    act(() => {
      chatEventCallback?.({
        payload: {
          sessionId: "s1",
          event: { type: "text", text: "pong from gemini" },
        },
      });
    });

    const messages = useAgentChatStore.getState().messages;
    expect(messages.length).toBe(1);
    expect(messages[0].content).toBe("pong from gemini");
    expect(messages[0].role).toBe("assistant");
  });

  it("accumulates multiple text events into single message", async () => {
    let chatEventCallback: ((event: { payload: unknown }) => void) | null = null;

    mockListen.mockImplementation(async (event: string, cb: unknown) => {
      if (event === "chat:event") {
        chatEventCallback = cb as typeof chatEventCallback;
      }
      return () => {};
    });

    const { useAgentChatEvents } = await import("../use-agent-chat");
    renderHook(() => useAgentChatEvents());

    act(() => {
      chatEventCallback?.({
        payload: {
          sessionId: "s1",
          event: { type: "text", text: "line 1" },
        },
      });
      chatEventCallback?.({
        payload: {
          sessionId: "s1",
          event: { type: "text", text: "line 2" },
        },
      });
    });

    const messages = useAgentChatStore.getState().messages;
    expect(messages.length).toBe(1);
    expect(messages[0].content).toContain("line 1");
    expect(messages[0].content).toContain("line 2");
  });

  it("handles generic JSON event with content field (unknown type)", async () => {
    let chatEventCallback: ((event: { payload: unknown }) => void) | null = null;

    mockListen.mockImplementation(async (event: string, cb: unknown) => {
      if (event === "chat:event") {
        chatEventCallback = cb as typeof chatEventCallback;
      }
      return () => {};
    });

    const { useAgentChatEvents } = await import("../use-agent-chat");
    renderHook(() => useAgentChatEvents());

    act(() => {
      chatEventCallback?.({
        payload: {
          sessionId: "s1",
          event: { type: "response", content: "generic cli response" },
        },
      });
    });

    const messages = useAgentChatStore.getState().messages;
    expect(messages.length).toBe(1);
    expect(messages[0].content).toBe("generic cli response");
  });

  it("handles gemini assistant message format", async () => {
    let chatEventCallback: ((event: { payload: unknown }) => void) | null = null;

    mockListen.mockImplementation(async (event: string, cb: unknown) => {
      if (event === "chat:event") {
        chatEventCallback = cb as typeof chatEventCallback;
      }
      return () => {};
    });

    const { useAgentChatEvents } = await import("../use-agent-chat");
    renderHook(() => useAgentChatEvents());

    act(() => {
      chatEventCallback?.({
        payload: {
          sessionId: "s1",
          event: { type: "message", role: "assistant", content: "pong from gemini" },
        },
      });
    });

    const messages = useAgentChatStore.getState().messages;
    expect(messages.length).toBe(1);
    expect(messages[0].content).toBe("pong from gemini");
  });

  it("ignores gemini user echo (role=user)", async () => {
    let chatEventCallback: ((event: { payload: unknown }) => void) | null = null;

    mockListen.mockImplementation(async (event: string, cb: unknown) => {
      if (event === "chat:event") {
        chatEventCallback = cb as typeof chatEventCallback;
      }
      return () => {};
    });

    const { useAgentChatEvents } = await import("../use-agent-chat");
    renderHook(() => useAgentChatEvents());

    act(() => {
      chatEventCallback?.({
        payload: {
          sessionId: "s1",
          event: { type: "message", role: "user", content: "user echo should be ignored" },
        },
      });
    });

    const messages = useAgentChatStore.getState().messages;
    expect(messages.length).toBe(0);
  });

  it("handles codex item.completed format", async () => {
    let chatEventCallback: ((event: { payload: unknown }) => void) | null = null;

    mockListen.mockImplementation(async (event: string, cb: unknown) => {
      if (event === "chat:event") {
        chatEventCallback = cb as typeof chatEventCallback;
      }
      return () => {};
    });

    const { useAgentChatEvents } = await import("../use-agent-chat");
    renderHook(() => useAgentChatEvents());

    act(() => {
      chatEventCallback?.({
        payload: {
          sessionId: "s1",
          event: {
            type: "item.completed",
            item: { id: "item_0", type: "agent_message", text: "pong from codex" },
          },
        },
      });
    });

    const messages = useAgentChatStore.getState().messages;
    expect(messages.length).toBe(1);
    expect(messages[0].content).toBe("pong from codex");
  });

  it("sets status to ready on codex turn.completed", async () => {
    let chatEventCallback: ((event: { payload: unknown }) => void) | null = null;

    mockListen.mockImplementation(async (event: string, cb: unknown) => {
      if (event === "chat:event") {
        chatEventCallback = cb as typeof chatEventCallback;
      }
      return () => {};
    });

    const { useAgentChatEvents } = await import("../use-agent-chat");
    renderHook(() => useAgentChatEvents());

    act(() => {
      chatEventCallback?.({
        payload: {
          sessionId: "s1",
          event: { type: "turn.completed", usage: {} },
        },
      });
    });

    expect(useAgentChatStore.getState().status).toBe("ready");
  });

  it("ignores non-content events like init and thread.started", async () => {
    let chatEventCallback: ((event: { payload: unknown }) => void) | null = null;

    mockListen.mockImplementation(async (event: string, cb: unknown) => {
      if (event === "chat:event") {
        chatEventCallback = cb as typeof chatEventCallback;
      }
      return () => {};
    });

    const { useAgentChatEvents } = await import("../use-agent-chat");
    renderHook(() => useAgentChatEvents());

    act(() => {
      chatEventCallback?.({
        payload: {
          sessionId: "s1",
          event: { type: "init", timestamp: "2026-01-01" },
        },
      });
      chatEventCallback?.({
        payload: {
          sessionId: "s1",
          event: { type: "thread.started", thread_id: "t1" },
        },
      });
      chatEventCallback?.({
        payload: {
          sessionId: "s1",
          event: { type: "turn.started" },
        },
      });
    });

    expect(useAgentChatStore.getState().messages.length).toBe(0);
  });

  it("handles error event by showing error message", async () => {
    let chatEventCallback: ((event: { payload: unknown }) => void) | null = null;

    mockListen.mockImplementation(async (event: string, cb: unknown) => {
      if (event === "chat:event") {
        chatEventCallback = cb as typeof chatEventCallback;
      }
      return () => {};
    });

    const { useAgentChatEvents } = await import("../use-agent-chat");
    renderHook(() => useAgentChatEvents());

    act(() => {
      chatEventCallback?.({
        payload: {
          sessionId: "s1",
          event: { type: "error", message: "CLI crashed" },
        },
      });
    });

    const state = useAgentChatStore.getState();
    expect(state.error).toBe("CLI crashed");
  });
});
