import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { SessionStatusBar } from "../session-status-bar";

// Mock IPC
const mockInvoke = vi.fn();
vi.mock("@/lib/ipc", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
  listen: vi.fn(() => () => {}),
}));

// Mock session-state store
const mockSessionStates: Record<string, string> = {};
vi.mock("@/stores/session-state", () => ({
  useSessionStateStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      states: mockSessionStates,
      getState: (tabId: string) => mockSessionStates[tabId] ?? "idle",
    }),
}));

// Mock terminal-tabs store
const mockTabs: Array<{
  id: string;
  sessionType: string;
  cliSessionId?: string;
  isRunning?: boolean;
  createdAt?: number;
}> = [];
vi.mock("@/stores/terminal-tabs", () => ({
  useTerminalTabsStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      tabs: mockTabs,
    }),
}));

// Mock cli-registry
vi.mock("@/lib/cli-registry", () => ({
  CLI_REGISTRY: {
    claude: { displayName: "Claude Code", iconColor: "text-brand" },
    gemini: { displayName: "Gemini CLI", iconColor: "text-ctp-blue" },
    codex: { displayName: "Codex CLI", iconColor: "text-ctp-green" },
    "cursor-agent": { displayName: "Cursor Agent", iconColor: "text-ctp-peach" },
    "gh-copilot": { displayName: "GitHub Copilot", iconColor: "text-ctp-lavender" },
  },
}));

/** Flush microtasks so IPC promises and state updates settle. */
async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("SessionStatusBar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockInvoke.mockReset();
    mockTabs.length = 0;
    for (const key of Object.keys(mockSessionStates)) {
      delete mockSessionStates[key];
    }

    // Default IPC responses
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "get_git_info_command") {
        return Promise.resolve({ branch: "main", modified_count: 0 });
      }
      if (channel === "get_session_host_info") {
        return Promise.resolve({ hostname: "archlinux", username: "nando" });
      }
      return Promise.resolve(undefined);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("AI CLI sessions", () => {
    it("renders CLI display name for claude session", async () => {
      mockTabs.push({
        id: "tab-1",
        sessionType: "claude",
        isRunning: true,
        createdAt: Date.now(),
      });

      render(
        <SessionStatusBar tabId="tab-1" path="/home/user/project" sessionType="claude" />
      );

      await flushPromises();

      expect(screen.getByText("Claude Code")).toBeInTheDocument();
    });

    it("renders session state indicator", async () => {
      mockTabs.push({
        id: "tab-2",
        sessionType: "claude",
        isRunning: true,
        createdAt: Date.now(),
      });
      mockSessionStates["tab-2"] = "thinking";

      render(
        <SessionStatusBar tabId="tab-2" path="/home/user/project" sessionType="claude" />
      );

      await flushPromises();

      expect(screen.getByText("thinking")).toBeInTheDocument();
    });

    it("renders truncated session ID when available", async () => {
      mockTabs.push({
        id: "tab-3",
        sessionType: "claude",
        isRunning: true,
        createdAt: Date.now(),
        cliSessionId: "abcdef12-3456-7890-abcd-ef1234567890",
      });

      render(
        <SessionStatusBar tabId="tab-3" path="/home/user/project" sessionType="claude" />
      );

      await flushPromises();

      // Should show first 8 chars of session ID
      expect(screen.getByText("abcdef12")).toBeInTheDocument();
    });

    it("renders git branch with project name", async () => {
      mockTabs.push({
        id: "tab-4",
        sessionType: "claude",
        isRunning: true,
        createdAt: Date.now(),
      });

      render(
        <SessionStatusBar tabId="tab-4" path="/home/user/my-project" sessionType="claude" />
      );

      await flushPromises();

      expect(screen.getByText(/my-project/)).toBeInTheDocument();
      expect(screen.getByText(/main/)).toBeInTheDocument();
    });

    it("renders dirty indicator when git has modifications", async () => {
      mockTabs.push({
        id: "tab-5",
        sessionType: "claude",
        isRunning: true,
        createdAt: Date.now(),
      });

      mockInvoke.mockImplementation((channel: string) => {
        if (channel === "get_git_info_command") {
          return Promise.resolve({ branch: "main", modified_count: 3 });
        }
        if (channel === "get_session_host_info") {
          return Promise.resolve({ hostname: "archlinux", username: "nando" });
        }
        return Promise.resolve(undefined);
      });

      render(
        <SessionStatusBar tabId="tab-5" path="/home/user/project" sessionType="claude" />
      );

      await flushPromises();

      // Dirty indicator: asterisk after branch name
      expect(screen.getByText(/main\*/)).toBeInTheDocument();
    });

    it("renders elapsed time since session creation", async () => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      mockTabs.push({
        id: "tab-6",
        sessionType: "claude",
        isRunning: true,
        createdAt: fiveMinutesAgo,
      });

      render(
        <SessionStatusBar tabId="tab-6" path="/home/user/project" sessionType="claude" />
      );

      await flushPromises();

      expect(screen.getByText("5m")).toBeInTheDocument();
    });

    it("renders elapsed time in hours and minutes format", async () => {
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000 - 30 * 60 * 1000;
      mockTabs.push({
        id: "tab-7",
        sessionType: "claude",
        isRunning: true,
        createdAt: twoHoursAgo,
      });

      render(
        <SessionStatusBar tabId="tab-7" path="/home/user/project" sessionType="claude" />
      );

      await flushPromises();

      expect(screen.getByText("2h30m")).toBeInTheDocument();
    });

    it("does not show host info for AI sessions", async () => {
      mockTabs.push({
        id: "tab-8",
        sessionType: "claude",
        isRunning: true,
        createdAt: Date.now(),
      });

      render(
        <SessionStatusBar tabId="tab-8" path="/home/user/project" sessionType="claude" />
      );

      await flushPromises();

      expect(screen.queryByText("nando@archlinux")).not.toBeInTheDocument();
    });

    it("shows ready state with correct styling", async () => {
      mockTabs.push({
        id: "tab-ready",
        sessionType: "claude",
        isRunning: true,
        createdAt: Date.now(),
      });
      mockSessionStates["tab-ready"] = "ready";

      render(
        <SessionStatusBar tabId="tab-ready" path="/home/user/project" sessionType="claude" />
      );

      await flushPromises();

      const readyEl = screen.getByText("ready");
      expect(readyEl).toBeInTheDocument();
    });

    it("shows exited state", async () => {
      mockTabs.push({
        id: "tab-exited",
        sessionType: "claude",
        isRunning: false,
        createdAt: Date.now(),
      });
      mockSessionStates["tab-exited"] = "exited";

      render(
        <SessionStatusBar tabId="tab-exited" path="/home/user/project" sessionType="claude" />
      );

      await flushPromises();

      expect(screen.getByText("exited")).toBeInTheDocument();
    });
  });

  describe("Terminal sessions", () => {
    it("renders user@hostname for terminal sessions", async () => {
      mockTabs.push({
        id: "tab-term-1",
        sessionType: "terminal",
        isRunning: true,
        createdAt: Date.now(),
      });

      render(
        <SessionStatusBar tabId="tab-term-1" path="/home/user/project" sessionType="terminal" />
      );

      await flushPromises();

      expect(screen.getByText("nando@archlinux")).toBeInTheDocument();
    });

    it("renders project path (shortened) for terminal sessions", async () => {
      mockTabs.push({
        id: "tab-term-2",
        sessionType: "terminal",
        isRunning: true,
        createdAt: Date.now(),
      });

      render(
        <SessionStatusBar
          tabId="tab-term-2"
          path="/home/nando/dev/projects/forja"
          sessionType="terminal"
        />
      );

      await flushPromises();

      // Should shorten home dir to ~
      expect(screen.getByText("~/dev/projects/forja")).toBeInTheDocument();
    });

    it("renders git branch for terminal sessions", async () => {
      mockTabs.push({
        id: "tab-term-3",
        sessionType: "terminal",
        isRunning: true,
        createdAt: Date.now(),
      });

      render(
        <SessionStatusBar tabId="tab-term-3" path="/home/user/project" sessionType="terminal" />
      );

      await flushPromises();

      expect(screen.getByText(/main/)).toBeInTheDocument();
    });

    it("does not show session state for terminal sessions", async () => {
      mockTabs.push({
        id: "tab-term-4",
        sessionType: "terminal",
        isRunning: true,
        createdAt: Date.now(),
      });
      mockSessionStates["tab-term-4"] = "thinking";

      render(
        <SessionStatusBar tabId="tab-term-4" path="/home/user/project" sessionType="terminal" />
      );

      await flushPromises();

      expect(screen.queryByText("thinking")).not.toBeInTheDocument();
    });

    it("does not show elapsed time for terminal sessions", async () => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      mockTabs.push({
        id: "tab-term-5",
        sessionType: "terminal",
        isRunning: true,
        createdAt: fiveMinutesAgo,
      });

      render(
        <SessionStatusBar tabId="tab-term-5" path="/home/user/project" sessionType="terminal" />
      );

      await flushPromises();

      expect(screen.queryByText("5m")).not.toBeInTheDocument();
    });

    it("does not show CLI name for terminal sessions", async () => {
      mockTabs.push({
        id: "tab-term-6",
        sessionType: "terminal",
        isRunning: true,
        createdAt: Date.now(),
      });

      render(
        <SessionStatusBar tabId="tab-term-6" path="/home/user/project" sessionType="terminal" />
      );

      await flushPromises();

      expect(screen.queryByText("Claude Code")).not.toBeInTheDocument();
      expect(screen.queryByText("Terminal")).not.toBeInTheDocument();
    });
  });

  describe("git info", () => {
    it("handles git info fetch failure gracefully", async () => {
      mockTabs.push({
        id: "tab-git-fail",
        sessionType: "terminal",
        isRunning: true,
        createdAt: Date.now(),
      });

      mockInvoke.mockImplementation((channel: string) => {
        if (channel === "get_git_info_command") {
          return Promise.reject(new Error("git not found"));
        }
        if (channel === "get_session_host_info") {
          return Promise.resolve({ hostname: "archlinux", username: "nando" });
        }
        return Promise.resolve(undefined);
      });

      render(
        <SessionStatusBar tabId="tab-git-fail" path="/home/user/project" sessionType="terminal" />
      );

      await flushPromises();

      // Should still render without git info, no crash
      expect(screen.getByText("nando@archlinux")).toBeInTheDocument();
    });

    it("handles host info fetch failure gracefully", async () => {
      mockTabs.push({
        id: "tab-host-fail",
        sessionType: "terminal",
        isRunning: true,
        createdAt: Date.now(),
      });

      mockInvoke.mockImplementation((channel: string) => {
        if (channel === "get_git_info_command") {
          return Promise.resolve({ branch: "main", modified_count: 0 });
        }
        if (channel === "get_session_host_info") {
          return Promise.reject(new Error("unavailable"));
        }
        return Promise.resolve(undefined);
      });

      render(
        <SessionStatusBar tabId="tab-host-fail" path="/home/user/project" sessionType="terminal" />
      );

      await flushPromises();

      // Should still render git info without crashing
      expect(screen.getByText(/main/)).toBeInTheDocument();
    });
  });

  describe("separators", () => {
    it("renders pipe separators between sections", async () => {
      mockTabs.push({
        id: "tab-sep",
        sessionType: "claude",
        isRunning: true,
        createdAt: Date.now(),
      });

      const { container } = render(
        <SessionStatusBar tabId="tab-sep" path="/home/user/project" sessionType="claude" />
      );

      await flushPromises();

      // Check for separator elements
      const separators = container.querySelectorAll(".text-ctp-surface1");
      expect(separators.length).toBeGreaterThan(0);
    });
  });

  describe("gemini session", () => {
    it("renders Gemini CLI name for gemini session", async () => {
      mockTabs.push({
        id: "tab-gem",
        sessionType: "gemini",
        isRunning: true,
        createdAt: Date.now(),
      });

      render(
        <SessionStatusBar tabId="tab-gem" path="/home/user/project" sessionType="gemini" />
      );

      await flushPromises();

      expect(screen.getByText("Gemini CLI")).toBeInTheDocument();
    });
  });

  describe("model name", () => {
    it("renders model name when available for AI session", async () => {
      mockTabs.push({
        id: "tab-model",
        sessionType: "claude",
        isRunning: true,
        createdAt: Date.now(),
        cliSessionId: "abc123",
      });

      mockInvoke.mockImplementation((channel: string) => {
        if (channel === "get_git_info_command") {
          return Promise.resolve({ branch: "main", modified_count: 0 });
        }
        if (channel === "get_session_host_info") {
          return Promise.resolve({ hostname: "arch", username: "nando" });
        }
        if (channel === "get_session_model") {
          return Promise.resolve("claude-opus-4-6");
        }
        return Promise.resolve(undefined);
      });

      render(
        <SessionStatusBar tabId="tab-model" path="/home/user/project" sessionType="claude" />
      );

      await flushPromises();

      // Should display formatted model name
      expect(screen.getByText("Opus 4.6")).toBeInTheDocument();
    });

    it("does not render model name for terminal sessions", async () => {
      mockTabs.push({
        id: "tab-term-model",
        sessionType: "terminal",
        isRunning: true,
        createdAt: Date.now(),
      });

      mockInvoke.mockImplementation((channel: string) => {
        if (channel === "get_git_info_command") {
          return Promise.resolve({ branch: "main", modified_count: 0 });
        }
        if (channel === "get_session_host_info") {
          return Promise.resolve({ hostname: "arch", username: "nando" });
        }
        if (channel === "get_session_model") {
          return Promise.resolve("claude-opus-4-6");
        }
        return Promise.resolve(undefined);
      });

      render(
        <SessionStatusBar tabId="tab-term-model" path="/home/user/project" sessionType="terminal" />
      );

      await flushPromises();

      expect(screen.queryByText("Opus 4.6")).not.toBeInTheDocument();
    });

    it("handles model fetch failure gracefully", async () => {
      mockTabs.push({
        id: "tab-model-fail",
        sessionType: "claude",
        isRunning: true,
        createdAt: Date.now(),
        cliSessionId: "abc123",
      });

      mockInvoke.mockImplementation((channel: string) => {
        if (channel === "get_git_info_command") {
          return Promise.resolve({ branch: "main", modified_count: 0 });
        }
        if (channel === "get_session_model") {
          return Promise.reject(new Error("not found"));
        }
        return Promise.resolve(undefined);
      });

      render(
        <SessionStatusBar tabId="tab-model-fail" path="/home/user/project" sessionType="claude" />
      );

      await flushPromises();

      // Should still render CLI name without crashing
      expect(screen.getByText("Claude Code")).toBeInTheDocument();
    });

    it("formats known model IDs to friendly names", async () => {
      mockTabs.push({
        id: "tab-model-fmt",
        sessionType: "claude",
        isRunning: true,
        createdAt: Date.now(),
        cliSessionId: "xyz789",
      });

      mockInvoke.mockImplementation((channel: string) => {
        if (channel === "get_git_info_command") {
          return Promise.resolve({ branch: "main", modified_count: 0 });
        }
        if (channel === "get_session_model") {
          return Promise.resolve("claude-sonnet-4-6");
        }
        return Promise.resolve(undefined);
      });

      render(
        <SessionStatusBar tabId="tab-model-fmt" path="/home/user/project" sessionType="claude" />
      );

      await flushPromises();

      expect(screen.getByText("Sonnet 4.6")).toBeInTheDocument();
    });
  });
});
