import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSessionStateStore } from "../session-state";
import { useProjectsStore } from "../projects";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
}));

vi.mock("../projects", () => ({
  useProjectsStore: {
    getState: vi.fn(() => ({
      setProjectThinking: vi.fn(),
      markProjectNotified: vi.fn(),
      activeProjectPath: null,
    })),
  },
}));

const mockProjectsStore = vi.mocked(useProjectsStore);
let mockSetProjectThinking: ReturnType<typeof vi.fn>;
let mockMarkProjectNotified: ReturnType<typeof vi.fn>;

describe("useSessionStateStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useSessionStateStore.setState({ states: {} });
    mockSetProjectThinking = vi.fn();
    mockMarkProjectNotified = vi.fn();
    mockProjectsStore.getState.mockReturnValue({
      setProjectThinking: mockSetProjectThinking,
      markProjectNotified: mockMarkProjectNotified,
      activeProjectPath: null,
    } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with empty states", () => {
    const state = useSessionStateStore.getState();
    expect(state.states).toEqual({});
  });

  it("returns idle for unknown tab", () => {
    const { getState } = useSessionStateStore.getState();
    expect(getState("nonexistent")).toBe("idle");
  });

  it("marks tab as thinking when data arrives", () => {
    const { onData, getState } = useSessionStateStore.getState();
    onData("tab-1");
    expect(getState("tab-1")).toBe("thinking");
  });

  it("transitions to ready after timeout with no new data", () => {
    const { onData, getState } = useSessionStateStore.getState();
    onData("tab-1");
    expect(getState("tab-1")).toBe("thinking");

    vi.advanceTimersByTime(2500);
    expect(getState("tab-1")).toBe("ready");
  });

  it("stays thinking if data keeps arriving", () => {
    const { onData, getState } = useSessionStateStore.getState();
    onData("tab-1");
    vi.advanceTimersByTime(1000);
    onData("tab-1");
    vi.advanceTimersByTime(1000);
    onData("tab-1");
    vi.advanceTimersByTime(1000);

    expect(getState("tab-1")).toBe("thinking");
  });

  it("resets debounce timer on each data event", () => {
    const { onData, getState } = useSessionStateStore.getState();
    onData("tab-1");
    vi.advanceTimersByTime(1500);
    onData("tab-1");
    vi.advanceTimersByTime(1500);

    // Only 1.5s since last data, should still be thinking
    expect(getState("tab-1")).toBe("thinking");

    vi.advanceTimersByTime(1000);
    // Now 2.5s since last data, should be ready
    expect(getState("tab-1")).toBe("ready");
  });

  it("tracks multiple tabs independently", () => {
    const { onData, getState } = useSessionStateStore.getState();
    onData("tab-1");
    onData("tab-2");

    vi.advanceTimersByTime(2500);
    expect(getState("tab-1")).toBe("ready");
    expect(getState("tab-2")).toBe("ready");

    onData("tab-1");
    expect(getState("tab-1")).toBe("thinking");
    expect(getState("tab-2")).toBe("ready");
  });

  it("marks tab as exited", () => {
    const { onData, onExit, getState } = useSessionStateStore.getState();
    onData("tab-1");
    onExit("tab-1");
    expect(getState("tab-1")).toBe("exited");
  });

  it("cleans up tab state", () => {
    const { onData, cleanup, getState } = useSessionStateStore.getState();
    onData("tab-1");
    cleanup("tab-1");
    expect(getState("tab-1")).toBe("idle");
  });

  describe("projects store bridging", () => {
    beforeEach(() => {
      mockSetProjectThinking = vi.fn();
      mockMarkProjectNotified = vi.fn();
      mockProjectsStore.getState.mockReturnValue({
        setProjectThinking: mockSetProjectThinking,
        markProjectNotified: mockMarkProjectNotified,
        activeProjectPath: null,
      } as never);
    });

    it("onData with non-terminal meta calls setProjectThinking(projectPath, true)", () => {
      const { onData } = useSessionStateStore.getState();
      onData("tab-1", { projectPath: "/home/user/my-app", sessionType: "claude" });

      expect(mockSetProjectThinking).toHaveBeenCalledWith("/home/user/my-app", true);
    });

    it("onData without meta does NOT call setProjectThinking", () => {
      const { onData } = useSessionStateStore.getState();
      onData("tab-1");

      expect(mockSetProjectThinking).not.toHaveBeenCalled();
    });

    it("onData for terminal does NOT call setProjectThinking", () => {
      const { onData } = useSessionStateStore.getState();
      onData("tab-1", { projectPath: "/home/user/my-app", sessionType: "terminal" });

      expect(mockSetProjectThinking).not.toHaveBeenCalled();
    });

    it("on thinking→ready does not mark project as notified", () => {
      const { onData } = useSessionStateStore.getState();
      onData("tab-1", { projectPath: "/home/user/my-app", sessionType: "claude" });

      vi.advanceTimersByTime(2500);

      expect(mockMarkProjectNotified).not.toHaveBeenCalled();
    });

    it("on thinking→ready with no other tab thinking calls setProjectThinking(false)", () => {
      const { onData } = useSessionStateStore.getState();
      onData("tab-1", { projectPath: "/home/user/my-app", sessionType: "claude" });

      vi.advanceTimersByTime(2500);

      expect(mockSetProjectThinking).toHaveBeenCalledWith("/home/user/my-app", false);
    });

    it("on thinking→ready with another tab still thinking does NOT call setProjectThinking(false)", () => {
      const { onData } = useSessionStateStore.getState();
      // Both tabs for same project
      onData("tab-1", { projectPath: "/home/user/my-app", sessionType: "claude" });
      onData("tab-2", { projectPath: "/home/user/my-app", sessionType: "gemini" });

      // Only advance enough for tab-1's timer (tab-2 was last, so its timer is fresh)
      // Both started at ~same time, but tab-2 resets its own timer
      // We need tab-1 to fire but tab-2 to still be thinking
      // Reset: set tab-1 data, wait 1s, set tab-2 data, wait 2s → tab-1 fires at 3s, tab-2 still thinking
      useSessionStateStore.setState({ states: {} });
      mockSetProjectThinking.mockClear();

      onData("tab-1", { projectPath: "/home/user/my-app", sessionType: "claude" });
      vi.advanceTimersByTime(1000);
      onData("tab-2", { projectPath: "/home/user/my-app", sessionType: "gemini" });
      vi.advanceTimersByTime(1500);

      // tab-1 timer fires (2s since tab-1's onData), tab-2 still thinking (only 1.5s since its onData)
      // setProjectThinking(true) was called for each onData, clear those
      const falseCall = mockSetProjectThinking.mock.calls.find(
        (call) => call[0] === "/home/user/my-app" && call[1] === false
      );
      expect(falseCall).toBeUndefined();
    });

    it("onExit clears thinking if no other tab thinking for project", () => {
      const { onData, onExit } = useSessionStateStore.getState();
      onData("tab-1", { projectPath: "/home/user/my-app", sessionType: "claude" });
      mockSetProjectThinking.mockClear();

      onExit("tab-1");

      expect(mockSetProjectThinking).toHaveBeenCalledWith("/home/user/my-app", false);
    });

    it("cleanup clears thinking if no other tab thinking for project", () => {
      const { onData, cleanup } = useSessionStateStore.getState();
      onData("tab-1", { projectPath: "/home/user/my-app", sessionType: "claude" });
      mockSetProjectThinking.mockClear();

      cleanup("tab-1");

      expect(mockSetProjectThinking).toHaveBeenCalledWith("/home/user/my-app", false);
    });
  });

  describe("notification on session exit", () => {
    it("calls pty:notify-session-finished on exit after AI output", async () => {
      const { invoke } = await import("@/lib/ipc");
      vi.mocked(invoke).mockClear();

      const { onData, onExit } = useSessionStateStore.getState();
      const meta = { projectPath: "/home/user/my-app", sessionType: "claude" };
      onData("tab-1", meta);
      onExit("tab-1");

      expect(invoke).toHaveBeenCalledWith("pty:notify-session-finished", {
        projectPath: "/home/user/my-app",
        sessionType: "claude",
        activeProjectPath: null,
      });
    });

    it("marks project as notified on exit after AI output", () => {
      const { onData, onExit } = useSessionStateStore.getState();
      onData("tab-1", { projectPath: "/home/user/my-app", sessionType: "claude" });
      onExit("tab-1");

      expect(mockMarkProjectNotified).toHaveBeenCalledWith("/home/user/my-app");
    });

    it("does not call notify on thinking → ready transition", async () => {
      const { invoke } = await import("@/lib/ipc");
      vi.mocked(invoke).mockClear();

      const { onData } = useSessionStateStore.getState();
      onData("tab-1", { projectPath: "/home/user/my-app", sessionType: "claude" });

      vi.advanceTimersByTime(2500);

      expect(invoke).not.toHaveBeenCalledWith(
        "pty:notify-session-finished",
        expect.anything(),
      );
    });

    it("does not call notify for terminal sessions", async () => {
      const { invoke } = await import("@/lib/ipc");
      vi.mocked(invoke).mockClear();

      const { onData, onExit } = useSessionStateStore.getState();
      onData("tab-1", { projectPath: "/home/user/my-app", sessionType: "terminal" });
      onExit("tab-1");

      expect(invoke).not.toHaveBeenCalledWith(
        "pty:notify-session-finished",
        expect.anything(),
      );
    });

    it("does not call notify when no metadata provided", async () => {
      const { invoke } = await import("@/lib/ipc");
      vi.mocked(invoke).mockClear();

      const { onData, onExit } = useSessionStateStore.getState();
      onData("tab-1");
      onExit("tab-1");

      expect(invoke).not.toHaveBeenCalledWith(
        "pty:notify-session-finished",
        expect.anything(),
      );
    });

    it("does not call notify when session exits without output", async () => {
      const { invoke } = await import("@/lib/ipc");
      vi.mocked(invoke).mockClear();

      const { onExit } = useSessionStateStore.getState();
      onExit("tab-1");

      expect(invoke).not.toHaveBeenCalledWith(
        "pty:notify-session-finished",
        expect.anything(),
      );
    });
  });
});
