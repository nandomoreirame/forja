import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePty, resolveMissingSessionIds } from "../use-pty";
import { ptyDispatcher } from "@/lib/pty-dispatcher";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";

const mockInvoke = vi.fn();

vi.mock("@/lib/ipc", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
  getCurrentWindow: () => ({ label: "main" }),
}));

vi.mock("@/lib/pty-dispatcher", () => {
  const dataHandlers = new Map<string, (data: string) => void>();
  const exitHandlers = new Map<string, (code: number) => void>();
  return {
    ptyDispatcher: {
      registerData: vi.fn((tabId: string, handler: (data: string) => void) => {
        dataHandlers.set(tabId, handler);
      }),
      unregisterData: vi.fn((tabId: string) => {
        dataHandlers.delete(tabId);
      }),
      registerExit: vi.fn((tabId: string, handler: (code: number) => void) => {
        exitHandlers.set(tabId, handler);
      }),
      unregisterExit: vi.fn((tabId: string) => {
        exitHandlers.delete(tabId);
      }),
      // Test helpers to simulate dispatching
      _simulateData: (tabId: string, data: string) => {
        dataHandlers.get(tabId)?.(data);
      },
      _simulateExit: (tabId: string, code: number) => {
        exitHandlers.get(tabId)?.(code);
      },
    },
  };
});

const mockDispatcher = vi.mocked(ptyDispatcher) as typeof ptyDispatcher & {
  _simulateData: (tabId: string, data: string) => void;
  _simulateExit: (tabId: string, code: number) => void;
};

describe("usePty", () => {
  beforeEach(() => {
    mockInvoke.mockClear();
    vi.mocked(ptyDispatcher.registerData).mockClear();
    vi.mocked(ptyDispatcher.unregisterData).mockClear();
    vi.mocked(ptyDispatcher.registerExit).mockClear();
    vi.mocked(ptyDispatcher.unregisterExit).mockClear();
    mockInvoke.mockResolvedValue(undefined);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with isRunning as false", () => {
    const { result } = renderHook(() => usePty({ tabId: "tab-1" }));
    expect(result.current.isRunning).toBe(false);
  });

  it("calls write_pty with tabId when write is called", async () => {
    const { result } = renderHook(() => usePty({ tabId: "tab-1" }));

    await act(async () => {
      await result.current.write("hello");
    });

    expect(mockInvoke).toHaveBeenCalledWith("write_pty", {
      tabId: "tab-1",
      data: "hello",
    });
  });

  it("calls resize_pty with tabId when resize is called", async () => {
    const { result } = renderHook(() => usePty({ tabId: "tab-1" }));

    await act(async () => {
      await result.current.resize(48, 120);
    });

    expect(mockInvoke).toHaveBeenCalledWith("resize_pty", {
      tabId: "tab-1",
      rows: 48,
      cols: 120,
    });
  });

  it("calls close_pty with tabId when close is called", async () => {
    const { result } = renderHook(() => usePty({ tabId: "tab-1" }));

    await act(async () => {
      await result.current.close();
    });

    expect(mockInvoke).toHaveBeenCalledWith("close_pty", {
      tabId: "tab-1",
      force: false,
    });
    expect(result.current.isRunning).toBe(false);
  });

  it("registers with ptyDispatcher on mount", () => {
    renderHook(() => usePty({ tabId: "tab-1" }));

    expect(ptyDispatcher.registerData).toHaveBeenCalledWith("tab-1", expect.any(Function));
    expect(ptyDispatcher.registerExit).toHaveBeenCalledWith("tab-1", expect.any(Function));
  });

  it("unregisters from ptyDispatcher on unmount", () => {
    const { unmount } = renderHook(() => usePty({ tabId: "tab-1" }));

    unmount();

    expect(ptyDispatcher.unregisterData).toHaveBeenCalledWith("tab-1");
    expect(ptyDispatcher.unregisterExit).toHaveBeenCalledWith("tab-1");
  });

  it("calls onData callback when dispatcher routes data to this tab", () => {
    const onData = vi.fn();
    renderHook(() => usePty({ tabId: "tab-1", onData }));

    act(() => {
      mockDispatcher._simulateData("tab-1", "hello");
    });

    expect(onData).toHaveBeenCalledWith("hello");
  });

  it("does not receive data for other tabs (dispatcher handles routing)", () => {
    const onData = vi.fn();
    renderHook(() => usePty({ tabId: "tab-1", onData }));

    act(() => {
      // Simulate data for a different tab — dispatcher won't route it here
      mockDispatcher._simulateData("tab-2", "world");
    });

    expect(onData).not.toHaveBeenCalled();
  });

  it("calls onExit and sets isRunning false on exit", async () => {
    const onExit = vi.fn();
    const { result } = renderHook(() => usePty({ tabId: "tab-1", onExit }));

    // Simulate spawn to set isRunning
    mockInvoke.mockResolvedValueOnce({ tabId: "tab-1" });
    await act(async () => {
      await result.current.spawn("/test/path");
    });
    expect(result.current.isRunning).toBe(true);

    // Simulate exit via dispatcher
    act(() => {
      mockDispatcher._simulateExit("tab-1", 0);
    });

    expect(result.current.isRunning).toBe(false);
    expect(onExit).toHaveBeenCalledWith(0);
  });

  it("calls spawn_pty and returns tab_id from spawn", async () => {
    mockInvoke.mockResolvedValueOnce({ tabId: "tab-1" });
    const { result } = renderHook(() => usePty({ tabId: "tab-1" }));

    let spawnResult: { tabId: string } | undefined;
    await act(async () => {
      spawnResult = await result.current.spawn("/test/path");
    });

    expect(mockInvoke).toHaveBeenCalledWith("spawn_pty", {
      tabId: "tab-1",
      path: "/test/path",
      windowLabel: "main",
    });
    expect(spawnResult?.tabId).toBe("tab-1");
    expect(result.current.isRunning).toBe(true);
  });

  it("passes sessionType to spawn_pty", async () => {
    mockInvoke.mockResolvedValueOnce({ tabId: "tab-1" });
    const { result } = renderHook(() => usePty({ tabId: "tab-1" }));

    await act(async () => {
      await result.current.spawn("/test/path", "gemini");
    });

    expect(mockInvoke).toHaveBeenCalledWith("spawn_pty", {
      tabId: "tab-1",
      path: "/test/path",
      sessionType: "gemini",
      windowLabel: "main",
    });
  });

  it("spawn passes resumeArgs to spawn_pty IPC when provided", async () => {
    mockInvoke.mockResolvedValueOnce({ tabId: "tab-1" });
    const { result } = renderHook(() => usePty({ tabId: "tab-1" }));

    await act(async () => {
      await result.current.spawn("/test/path", "claude", ["--resume", "abc-def-123"]);
    });

    expect(mockInvoke).toHaveBeenCalledWith("spawn_pty", {
      tabId: "tab-1",
      path: "/test/path",
      sessionType: "claude",
      windowLabel: "main",
      resumeArgs: ["--resume", "abc-def-123"],
    });
  });

  it("spawn works without resumeArgs — invoke does not include resumeArgs field", async () => {
    mockInvoke.mockResolvedValueOnce({ tabId: "tab-1" });
    const { result } = renderHook(() => usePty({ tabId: "tab-1" }));

    await act(async () => {
      await result.current.spawn("/test/path", "claude");
    });

    const callArgs = mockInvoke.mock.calls[0];
    expect(callArgs[1]).not.toHaveProperty("resumeArgs");
  });

  it("close passes force=true to close_pty when called with force", async () => {
    mockInvoke.mockResolvedValueOnce({ tabId: "tab-1" });
    const { result } = renderHook(() => usePty({ tabId: "tab-1" }));

    await act(async () => {
      await result.current.spawn("/test/path");
    });

    mockInvoke.mockResolvedValueOnce(undefined);
    await act(async () => {
      await result.current.close(true);
    });

    expect(mockInvoke).toHaveBeenCalledWith("close_pty", { tabId: "tab-1", force: true });
  });

  it("close passes force=false by default to close_pty", async () => {
    mockInvoke.mockResolvedValueOnce({ tabId: "tab-1" });
    const { result } = renderHook(() => usePty({ tabId: "tab-1" }));

    await act(async () => {
      await result.current.spawn("/test/path");
    });

    mockInvoke.mockResolvedValueOnce(undefined);
    await act(async () => {
      await result.current.close();
    });

    expect(mockInvoke).toHaveBeenCalledWith("close_pty", { tabId: "tab-1", force: false });
  });

  describe("session ID detection via PTY regex (CLIs without filesystem detection)", () => {
    // All current CLIs with sessionIdPattern also have sessionDirType,
    // so PTY regex detection is skipped for them. We temporarily remove
    // sessionDirType from gemini's registry entry to test the regex path.
    let originalSessionDirType: string | undefined;

    beforeEach(async () => {
      const { CLI_REGISTRY } = await import("@/lib/cli-registry");
      originalSessionDirType = CLI_REGISTRY.gemini.sessionDirType;
      // biome-ignore lint: test-only mutation to exercise regex detection path
      (CLI_REGISTRY.gemini as Record<string, unknown>).sessionDirType = undefined;

      useTerminalTabsStore.setState({
        tabs: [
          {
            id: "tab-gemini",
            name: "Gemini CLI",
            path: "/test",
            isRunning: true,
            sessionType: "gemini",
          },
        ],
        activeTabId: "tab-gemini",
      });
    });

    afterEach(async () => {
      const { CLI_REGISTRY } = await import("@/lib/cli-registry");
      // biome-ignore lint: restore original value after test
      (CLI_REGISTRY.gemini as Record<string, unknown>).sessionDirType = originalSessionDirType;
    });

    it("detects session ID from ANSI-wrapped PTY output", () => {
      renderHook(() => usePty({ tabId: "tab-gemini" }));

      act(() => {
        mockDispatcher._simulateData(
          "tab-gemini",
          "\x1b[2msession:\x1b[0m \x1b[33mabc-def-123\x1b[0m"
        );
      });

      const tab = useTerminalTabsStore.getState().tabs.find(
        (t) => t.id === "tab-gemini"
      );
      expect(tab?.cliSessionId).toBe("abc-def-123");
    });

    it("detects session ID from plain text PTY output", () => {
      renderHook(() => usePty({ tabId: "tab-gemini" }));

      act(() => {
        mockDispatcher._simulateData("tab-gemini", "session: deadbeef-1234");
      });

      const tab = useTerminalTabsStore.getState().tabs.find(
        (t) => t.id === "tab-gemini"
      );
      expect(tab?.cliSessionId).toBe("deadbeef-1234");
    });
  });

  describe("session ID detection skips PTY regex for CLIs with filesystem detection", () => {
    beforeEach(() => {
      // Claude has sessionDirType: "claude-dir" — PTY regex should be skipped
      useTerminalTabsStore.setState({
        tabs: [
          {
            id: "tab-claude",
            name: "Claude Code",
            path: "/test",
            isRunning: true,
            sessionType: "claude",
          },
        ],
        activeTabId: "tab-claude",
      });
    });

    it("does NOT set cliSessionId from PTY output for Claude (uses filesystem instead)", () => {
      renderHook(() => usePty({ tabId: "tab-claude" }));

      act(() => {
        mockDispatcher._simulateData("tab-claude", "session: abc-def-123");
      });

      const tab = useTerminalTabsStore.getState().tabs.find(
        (t) => t.id === "tab-claude"
      );
      // Should remain undefined because Claude uses filesystem-based detection
      expect(tab?.cliSessionId).toBeUndefined();
    });
  });

  describe("lazy filesystem session detection via interval", () => {
    beforeEach(() => {
      useTerminalTabsStore.setState({
        tabs: [
          {
            id: "tab-lazy",
            name: "Claude Code",
            path: "/test/project",
            isRunning: true,
            sessionType: "claude",
          },
        ],
        activeTabId: "tab-lazy",
      });
    });

    it("detects session ID from filesystem on interval tick", async () => {
      mockInvoke.mockImplementation((channel: string) => {
        if (channel === "get_cli_sessions") {
          return Promise.resolve([
            { sessionId: "new-session-abc", modified: "2024-01-02" },
          ]);
        }
        return Promise.resolve(undefined);
      });

      renderHook(() => usePty({ tabId: "tab-lazy" }));

      // Advance past the interval
      await act(async () => {
        vi.advanceTimersByTime(10_000);
      });

      // Allow the async invoke to resolve
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      const tab = useTerminalTabsStore.getState().tabs.find((t) => t.id === "tab-lazy");
      expect(tab?.cliSessionId).toBe("new-session-abc");
    });

    it("stops polling once session ID is set", async () => {
      let callCount = 0;
      mockInvoke.mockImplementation((channel: string) => {
        if (channel === "get_cli_sessions") {
          callCount++;
          return Promise.resolve([
            { sessionId: "session-xyz", modified: "2024-01-02" },
          ]);
        }
        return Promise.resolve(undefined);
      });

      renderHook(() => usePty({ tabId: "tab-lazy" }));

      // First tick: should detect and set
      await act(async () => {
        vi.advanceTimersByTime(10_000);
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      const firstCount = callCount;
      expect(firstCount).toBe(1);

      // Second tick: should skip because cliSessionId is now set
      await act(async () => {
        vi.advanceTimersByTime(10_000);
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(callCount).toBe(firstCount);
    });

    it("does not poll for terminal tabs", async () => {
      useTerminalTabsStore.setState({
        tabs: [
          {
            id: "tab-term",
            name: "Terminal",
            path: "/test/project",
            isRunning: true,
            sessionType: "terminal",
          },
        ],
        activeTabId: "tab-term",
      });

      renderHook(() => usePty({ tabId: "tab-term" }));

      await act(async () => {
        vi.advanceTimersByTime(10_000);
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      const cliSessionCalls = mockInvoke.mock.calls.filter(
        (c) => c[0] === "get_cli_sessions"
      );
      expect(cliSessionCalls).toHaveLength(0);
    });

    it("clears interval on unmount", () => {
      const { unmount } = renderHook(() => usePty({ tabId: "tab-lazy" }));

      unmount();

      // Advance timers — no calls should happen after unmount
      mockInvoke.mockClear();
      vi.advanceTimersByTime(30_000);

      const cliSessionCalls = mockInvoke.mock.calls.filter(
        (c) => c[0] === "get_cli_sessions"
      );
      expect(cliSessionCalls).toHaveLength(0);
    });

    it("skips filesystem polling for tabs that already have a cliSessionId from spawn", async () => {
      useTerminalTabsStore.setState({
        tabs: [{
          id: "tab-1", name: "Claude", path: "/project",
          isRunning: true, sessionType: "claude",
          cliSessionId: "pre-assigned-uuid",
        }],
      });

      renderHook(() => usePty({ tabId: "tab-1" }));

      await vi.advanceTimersByTimeAsync(10_000 + 100);

      // get_cli_sessions should NOT have been called — tab already has cliSessionId
      expect(mockInvoke).not.toHaveBeenCalledWith(
        "get_cli_sessions",
        expect.anything(),
      );
    });
  });

  describe("resolveMissingSessionIds", () => {
    it("resolves session ID for Claude tabs without one", async () => {
      useTerminalTabsStore.setState({
        tabs: [
          {
            id: "tab-resolve",
            name: "Claude Code",
            path: "/test/project",
            isRunning: true,
            sessionType: "claude",
          },
        ],
        activeTabId: "tab-resolve",
      });

      mockInvoke.mockResolvedValueOnce([
        { sessionId: "resolved-session-123", modified: "2024-01-02" },
      ]);

      await resolveMissingSessionIds("/test/project");

      const tab = useTerminalTabsStore.getState().tabs.find((t) => t.id === "tab-resolve");
      expect(tab?.cliSessionId).toBe("resolved-session-123");
    });

    it("skips tabs that already have a cliSessionId", async () => {
      useTerminalTabsStore.setState({
        tabs: [
          {
            id: "tab-has-id",
            name: "Claude Code",
            path: "/test/project",
            isRunning: true,
            sessionType: "claude",
            cliSessionId: "existing-id",
          },
        ],
        activeTabId: "tab-has-id",
      });

      await resolveMissingSessionIds("/test/project");

      // Should not have called get_cli_sessions
      const cliSessionCalls = mockInvoke.mock.calls.filter(
        (c) => c[0] === "get_cli_sessions"
      );
      expect(cliSessionCalls).toHaveLength(0);
    });

    it("skips terminal tabs", async () => {
      useTerminalTabsStore.setState({
        tabs: [
          {
            id: "tab-terminal",
            name: "Terminal",
            path: "/test/project",
            isRunning: true,
            sessionType: "terminal",
          },
        ],
        activeTabId: "tab-terminal",
      });

      await resolveMissingSessionIds("/test/project");

      const cliSessionCalls = mockInvoke.mock.calls.filter(
        (c) => c[0] === "get_cli_sessions"
      );
      expect(cliSessionCalls).toHaveLength(0);
    });

    it("passes cliId to get_cli_sessions IPC call", async () => {
      useTerminalTabsStore.setState({
        tabs: [
          {
            id: "tab-gemini-resolve",
            name: "Gemini CLI",
            path: "/test/project",
            isRunning: true,
            sessionType: "gemini",
          },
        ],
        activeTabId: "tab-gemini-resolve",
      });

      mockInvoke.mockResolvedValueOnce([
        { sessionId: "gem-session-1", modified: "2026-01-01T00:00:00Z" },
      ]);

      await resolveMissingSessionIds("/test/project");

      expect(mockInvoke).toHaveBeenCalledWith("get_cli_sessions", {
        cliId: "gemini",
        projectPath: "/test/project",
        limit: 10,
      });
    });

    it("skips session IDs already assigned to other tabs of the same CLI type", async () => {
      useTerminalTabsStore.setState({
        tabs: [
          {
            id: "tab-claude-1",
            name: "Claude Code",
            path: "/test/project",
            isRunning: true,
            sessionType: "claude",
            cliSessionId: "session-already-used",
          },
          {
            id: "tab-claude-2",
            name: "Claude Code",
            path: "/test/project",
            isRunning: true,
            sessionType: "claude",
            // No cliSessionId — needs detection
          },
        ],
        activeTabId: "tab-claude-2",
      });

      mockInvoke.mockResolvedValueOnce([
        { sessionId: "session-already-used", modified: "2026-01-02T00:00:00Z" },
        { sessionId: "session-new", modified: "2026-01-01T00:00:00Z" },
      ]);

      await resolveMissingSessionIds("/test/project");

      const tab = useTerminalTabsStore.getState().tabs.find(
        (t) => t.id === "tab-claude-2"
      );
      expect(tab?.cliSessionId).toBe("session-new");
    });

    it("does not assign session ID when all sessions are already in use", async () => {
      useTerminalTabsStore.setState({
        tabs: [
          {
            id: "tab-claude-1",
            name: "Claude Code",
            path: "/test/project",
            isRunning: true,
            sessionType: "claude",
            cliSessionId: "only-session",
          },
          {
            id: "tab-claude-2",
            name: "Claude Code",
            path: "/test/project",
            isRunning: true,
            sessionType: "claude",
          },
        ],
        activeTabId: "tab-claude-2",
      });

      mockInvoke.mockResolvedValueOnce([
        { sessionId: "only-session", modified: "2026-01-01T00:00:00Z" },
      ]);

      await resolveMissingSessionIds("/test/project");

      const tab = useTerminalTabsStore.getState().tabs.find(
        (t) => t.id === "tab-claude-2"
      );
      expect(tab?.cliSessionId).toBeUndefined();
    });

    it("rejects sessions older than tab createdAt for new tabs", async () => {
      const tabCreatedAt = new Date("2026-03-25T12:00:00Z").getTime();
      useTerminalTabsStore.setState({
        tabs: [
          {
            id: "tab-new",
            name: "Claude Code",
            path: "/test/project",
            isRunning: true,
            sessionType: "claude",
            createdAt: tabCreatedAt,
          },
        ],
        activeTabId: "tab-new",
      });

      mockInvoke.mockResolvedValueOnce([
        // This session was modified BEFORE the tab was created
        { sessionId: "old-session", modified: "2026-03-25T11:00:00Z" },
      ]);

      await resolveMissingSessionIds("/test/project");

      const tab = useTerminalTabsStore.getState().tabs.find(
        (t) => t.id === "tab-new"
      );
      expect(tab?.cliSessionId).toBeUndefined();
    });

    it("accepts sessions newer than tab createdAt for new tabs", async () => {
      const tabCreatedAt = new Date("2026-03-25T12:00:00Z").getTime();
      useTerminalTabsStore.setState({
        tabs: [
          {
            id: "tab-new",
            name: "Claude Code",
            path: "/test/project",
            isRunning: true,
            sessionType: "claude",
            createdAt: tabCreatedAt,
          },
        ],
        activeTabId: "tab-new",
      });

      mockInvoke.mockResolvedValueOnce([
        // This session was modified AFTER the tab was created
        { sessionId: "new-session", modified: "2026-03-25T13:00:00Z" },
      ]);

      await resolveMissingSessionIds("/test/project");

      const tab = useTerminalTabsStore.getState().tabs.find(
        (t) => t.id === "tab-new"
      );
      expect(tab?.cliSessionId).toBe("new-session");
    });

    it("accepts any session for restored tabs without createdAt", async () => {
      useTerminalTabsStore.setState({
        tabs: [
          {
            id: "tab-restored",
            name: "Claude Code",
            path: "/test/project",
            isRunning: true,
            sessionType: "claude",
            // No createdAt — restored from disk
          },
        ],
        activeTabId: "tab-restored",
      });

      mockInvoke.mockResolvedValueOnce([
        { sessionId: "old-session", modified: "2020-01-01T00:00:00Z" },
      ]);

      await resolveMissingSessionIds("/test/project");

      const tab = useTerminalTabsStore.getState().tabs.find(
        (t) => t.id === "tab-restored"
      );
      expect(tab?.cliSessionId).toBe("old-session");
    });
  });
});
