import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

import { invoke } from "@/lib/ipc";
import { useAgentChatStore } from "../agent-chat";

const mockInvoke = vi.mocked(invoke);

describe("useAgentChatStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAgentChatStore.setState({
      messages: [],
      sessionId: null,
      cliId: null,
      projectPath: null,
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
    it("spawns a chat session via IPC with projectPath", async () => {
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

    it("spawns a chat session without projectPath", async () => {
      mockInvoke.mockResolvedValue({ sessionId: "s1" });
      await useAgentChatStore.getState().startSession("claude");
      expect(mockInvoke).toHaveBeenCalledWith("chat:spawn", {
        sessionId: expect.any(String),
        cliId: "claude",
      });
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

  describe("appendToLastAssistantMessage", () => {
    it("creates new assistant message when no messages exist", () => {
      useAgentChatStore.getState().appendToLastAssistantMessage("Hello");
      const messages = useAgentChatStore.getState().messages;
      expect(messages.length).toBe(1);
      expect(messages[0].role).toBe("assistant");
      expect(messages[0].content).toBe("Hello");
    });

    it("creates new assistant message when last message is from user", () => {
      useAgentChatStore.setState({
        messages: [{ id: "m1", role: "user", content: "ping", timestamp: "t" }],
        sessionId: "s1",
        status: "streaming",
      });

      useAgentChatStore.getState().appendToLastAssistantMessage("pong");
      const messages = useAgentChatStore.getState().messages;
      expect(messages.length).toBe(2);
      expect(messages[1].role).toBe("assistant");
      expect(messages[1].content).toBe("pong");
    });

    it("appends to existing assistant message when last message is assistant", () => {
      useAgentChatStore.setState({
        messages: [{ id: "m1", role: "assistant", content: "first line", timestamp: "t" }],
        sessionId: "s1",
        status: "streaming",
      });

      useAgentChatStore.getState().appendToLastAssistantMessage("\nsecond line");
      const messages = useAgentChatStore.getState().messages;
      expect(messages.length).toBe(1);
      expect(messages[0].content).toBe("first line\nsecond line");
    });

    it("accumulates multiple appends to the same assistant message", () => {
      useAgentChatStore.getState().appendToLastAssistantMessage("line1");
      useAgentChatStore.getState().appendToLastAssistantMessage("\nline2");
      useAgentChatStore.getState().appendToLastAssistantMessage("\nline3");

      const messages = useAgentChatStore.getState().messages;
      expect(messages.length).toBe(1);
      expect(messages[0].content).toBe("line1\nline2\nline3");
    });
  });

  describe("switchSession", () => {
    it("closes current session and starts a new one with different CLI", async () => {
      useAgentChatStore.setState({
        sessionId: "s1",
        cliId: "claude",
        projectPath: "/project",
        status: "ready",
        messages: [{ id: "m1", role: "user", content: "Hello", timestamp: "t" }],
      });

      mockInvoke.mockResolvedValue(undefined);

      await useAgentChatStore.getState().switchSession("gemini");

      expect(mockInvoke).toHaveBeenCalledWith("chat:close", { sessionId: "s1" });
      expect(mockInvoke).toHaveBeenCalledWith("chat:spawn", {
        sessionId: expect.any(String),
        cliId: "gemini",
        projectPath: "/project",
      });

      expect(useAgentChatStore.getState().cliId).toBe("gemini");
      expect(useAgentChatStore.getState().status).toBe("ready");
    });

    it("keeps existing messages when switching CLI", async () => {
      useAgentChatStore.setState({
        sessionId: "s1",
        cliId: "claude",
        projectPath: "/project",
        status: "ready",
        messages: [
          { id: "m1", role: "user", content: "Hello", timestamp: "t" },
          { id: "m2", role: "assistant", content: "Hi!", timestamp: "t" },
        ],
      });

      mockInvoke.mockResolvedValue(undefined);

      await useAgentChatStore.getState().switchSession("gemini");

      const messages = useAgentChatStore.getState().messages;
      expect(messages.length).toBe(2);
      expect(messages[0].content).toBe("Hello");
      expect(messages[1].content).toBe("Hi!");
    });

    it("switches session even without projectPath", async () => {
      useAgentChatStore.setState({
        sessionId: "s1",
        cliId: "claude",
        projectPath: null,
        status: "ready",
      });

      mockInvoke.mockResolvedValue(undefined);

      await useAgentChatStore.getState().switchSession("gemini");

      expect(mockInvoke).toHaveBeenCalledWith("chat:spawn", {
        sessionId: expect.any(String),
        cliId: "gemini",
      });
    });

    it("does nothing when switching to same CLI", async () => {
      useAgentChatStore.setState({
        sessionId: "s1",
        cliId: "claude",
        projectPath: "/project",
        status: "ready",
      });

      await useAgentChatStore.getState().switchSession("claude");

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("sets error when new session spawn fails", async () => {
      useAgentChatStore.setState({
        sessionId: "s1",
        cliId: "claude",
        projectPath: "/project",
        status: "ready",
      });

      mockInvoke
        .mockResolvedValueOnce(undefined) // close succeeds
        .mockRejectedValueOnce(new Error("spawn failed")); // spawn fails

      await useAgentChatStore.getState().switchSession("gemini");

      expect(useAgentChatStore.getState().status).toBe("error");
      expect(useAgentChatStore.getState().error).toBe("spawn failed");
    });
  });

  describe("sendMessage with context commands", () => {
    beforeEach(() => {
      useAgentChatStore.setState({
        sessionId: "s1",
        cliId: "claude",
        status: "ready",
        projectPath: null,
      });
    });

    it("intercepts /context init without needing projectPath", async () => {
      mockInvoke.mockResolvedValue({ initialized: true });
      await useAgentChatStore.getState().sendMessage("/context init");

      expect(mockInvoke).toHaveBeenCalledWith("context:init", {});
    });

    it("intercepts /context status without needing projectPath", async () => {
      mockInvoke.mockResolvedValue({
        initialized: true,
        counts: { skill: 1, agent: 0, doc: 0, plan: 0 },
        lastUpdated: null,
      });
      await useAgentChatStore.getState().sendMessage("/context status");

      expect(mockInvoke).toHaveBeenCalledWith("context:status", {});
    });

    it("intercepts /skill create and calls hub IPC", async () => {
      mockInvoke.mockResolvedValue("/path/to/skill");
      await useAgentChatStore.getState().sendMessage("/skill create tdd");

      expect(mockInvoke).toHaveBeenCalledWith("context:create_skill", {
        slug: "tdd",
      });
    });

    it("intercepts /agent create and calls hub IPC", async () => {
      mockInvoke.mockResolvedValue("/path/to/agent");
      await useAgentChatStore.getState().sendMessage("/agent create reviewer");

      expect(mockInvoke).toHaveBeenCalledWith("context:create_agent", {
        slug: "reviewer",
      });
    });

    it("sends non-command messages normally via chat:send", async () => {
      mockInvoke.mockResolvedValue({ sent: true });
      await useAgentChatStore.getState().sendMessage("Hello world");

      expect(mockInvoke).toHaveBeenCalledWith("chat:send", {
        sessionId: "s1",
        message: "Hello world",
      });
    });

    it("adds system message about the result", async () => {
      mockInvoke.mockResolvedValue(undefined);
      await useAgentChatStore.getState().sendMessage("/context init");

      const messages = useAgentChatStore.getState().messages;
      const systemMsgs = messages.filter((m) => m.role === "system");
      expect(systemMsgs.length).toBeGreaterThan(0);
    });
  });
});
