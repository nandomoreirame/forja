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

vi.mock("../ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, asChild, ...props }: { children: React.ReactNode; asChild?: boolean }) =>
    asChild ? <>{children}</> : <span {...props}>{children}</span>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="tooltip-content" className="sr-only">{children}</span>
  ),
}));

vi.mock("@/lib/cli-registry", () => ({
  CLI_REGISTRY: {
    claude: { displayName: "Claude Code", iconColor: "text-brand" },
    gemini: { displayName: "Gemini CLI", iconColor: "text-ctp-blue" },
    codex: { displayName: "Codex CLI", iconColor: "text-ctp-green" },
    "cursor-agent": { displayName: "Cursor Agent", iconColor: "text-ctp-peach" },
    "gh-copilot": { displayName: "GitHub Copilot", iconColor: "text-ctp-lavender" },
  },
  computeTabDisplayNames: (tabs: Array<{ id: string; sessionType: string; customName?: string }>) => {
    const result: Record<string, string> = {};
    for (const tab of tabs) {
      result[tab.id] = tab.customName ?? tab.sessionType;
    }
    return result;
  },
  getSessionDisplayName: (sessionType: string) => sessionType,
}));

describe("SessionStatusBar telemetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionTelemetryStore.setState({ telemetry: {} });
    useSessionStateStore.getState()._resetInternals();
    useSessionStateStore.setState({ states: {} });
    useTerminalTabsStore.setState({ tabs: [], activeTabId: null, counter: 0 });
  });

  it("displays token count when telemetry is available", () => {
    useTerminalTabsStore.setState({
      tabs: [{
        id: "tab-1",
        name: "Claude",
        path: "/project",
        isRunning: true,
        sessionType: "claude" as const,
        cliSessionId: "sess-abc",
        createdAt: Date.now(),
      }],
      activeTabId: "tab-1",
    });

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

    // Token count: 15000 input + 5000 cache write + 2000 cache read = 22000 -> "22.0k"
    expect(screen.getByText("22.0k")).toBeInTheDocument();
    // Cost display
    expect(screen.getByText("$0.42")).toBeInTheDocument();
  });

  it("displays last active tool when thinking", () => {
    useTerminalTabsStore.setState({
      tabs: [{
        id: "tab-2",
        name: "Claude",
        path: "/project",
        isRunning: true,
        sessionType: "claude" as const,
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

  it("does not show telemetry section for terminal sessions", () => {
    useTerminalTabsStore.setState({
      tabs: [{
        id: "tab-3",
        name: "Terminal",
        path: "/project",
        isRunning: true,
        sessionType: "terminal" as const,
      }],
    });

    render(<SessionStatusBar tabId="tab-3" path="/project" sessionType="terminal" />);

    // Should not have any dollar sign (cost indicator)
    const allText = document.body.textContent ?? "";
    expect(allText).not.toContain("$0.");
  });

  it("does not show tool when not thinking", () => {
    useTerminalTabsStore.setState({
      tabs: [{
        id: "tab-4",
        name: "Claude",
        path: "/project",
        isRunning: true,
        sessionType: "claude" as const,
        cliSessionId: "sess-def",
        createdAt: Date.now(),
      }],
      activeTabId: "tab-4",
    });

    useSessionTelemetryStore.setState({
      telemetry: {
        "tab-4": {
          totalInputTokens: 5000,
          totalOutputTokens: 1000,
          totalCacheWriteTokens: 0,
          totalCacheReadTokens: 0,
          model: "claude-sonnet-4-6",
          lastTool: "Read",
          messageCount: 2,
          costUsd: 0.03,
        },
      },
    });

    // State is "ready", not "thinking"
    useSessionStateStore.setState({ states: { "tab-4": "ready" } });

    render(<SessionStatusBar tabId="tab-4" path="/project" sessionType="claude" />);

    // Tool name should NOT appear when not thinking
    expect(screen.queryByText("Read")).not.toBeInTheDocument();
  });
});
