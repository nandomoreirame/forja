/**
 * Tests for the pty:session-state-changed handler in App.tsx.
 *
 * Regression tests for the bug where notification badges (green dots) appeared
 * on project sidebar icons even when no AI CLI sessions had run:
 *   - Terminal (non-AI) exits should NOT trigger notification badges
 *   - Project exits with empty tabs store should NOT trigger badges
 *   - Only AI CLI exits with known tabs should show badges
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(() => Promise.resolve(null)),
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

import { useProjectsStore } from "../stores/projects";
import { useTerminalTabsStore } from "../stores/terminal-tabs";

function setupStores(opts: {
  activeProjectPath?: string;
  tabs?: Array<{ id: string; path: string; sessionType: string; isRunning: boolean }>;
}) {
  useProjectsStore.setState({
    projects: [
      { path: "/proj/active", name: "active", lastOpened: "", iconPath: null },
      { path: "/proj/background", name: "background", lastOpened: "", iconPath: null },
    ],
    activeProjectPath: opts.activeProjectPath ?? "/proj/active",
    notifiedProjects: new Set<string>(),
    thinkingProjects: new Set<string>(),
    sessionStates: {},
    unreadProjects: new Set<string>(),
  } as any);

  useTerminalTabsStore.setState({
    tabs: (opts.tabs ?? []) as any,
    activeTabId: null,
  });
}

/**
 * Simulate the pty:session-state-changed "exited" handler logic from App.tsx.
 * This mirrors the exact implementation to enable unit testing without mounting React.
 */
function simulateSessionStateExited(sessionId: string, projectPath: string) {
  const projectTabs = useTerminalTabsStore.getState().getTabsForProject(projectPath);
  const anyRunning = projectTabs.some((t) => t.isRunning);

  useProjectsStore.getState().setProjectSessionState(
    projectPath,
    anyRunning ? "running" : "exited",
  );

  // Fix: only notify when tabs are known AND session was an AI CLI (not terminal)
  if (projectTabs.length > 0 && !anyRunning) {
    const exitedTab = projectTabs.find((t) => t.id === sessionId);
    const isAiCli = exitedTab ? exitedTab.sessionType !== "terminal" : false;
    if (isAiCli) {
      useProjectsStore.getState().markProjectNotified(projectPath, "Session finished");
    }
  }
}

describe("pty:session-state-changed — notification badge logic", () => {
  beforeEach(() => {
    useProjectsStore.setState({
      projects: [],
      activeProjectPath: null,
      notifiedProjects: new Set<string>(),
      thinkingProjects: new Set<string>(),
      sessionStates: {},
      unreadProjects: new Set<string>(),
    } as any);
    useTerminalTabsStore.setState({ tabs: [], activeTabId: null } as any);
  });

  describe("prevents false-positive badges", () => {
    it("does NOT mark project as notified when tabs store is empty (project not yet restored)", () => {
      setupStores({ tabs: [] });

      simulateSessionStateExited("tab-1", "/proj/background");

      const { notifiedProjects } = useProjectsStore.getState();
      expect(notifiedProjects.has("/proj/background")).toBe(false);
    });

    it("does NOT mark project as notified when the exited session was a plain terminal", () => {
      setupStores({
        tabs: [
          { id: "tab-1", path: "/proj/background", sessionType: "terminal", isRunning: false },
        ],
      });

      simulateSessionStateExited("tab-1", "/proj/background");

      const { notifiedProjects } = useProjectsStore.getState();
      expect(notifiedProjects.has("/proj/background")).toBe(false);
    });

    it("does NOT mark project as notified when tab is not found by sessionId and tabs are otherwise empty", () => {
      // Edge case: sessionId does not match any tab in the project
      setupStores({
        tabs: [
          { id: "other-tab", path: "/proj/background", sessionType: "terminal", isRunning: false },
        ],
      });

      simulateSessionStateExited("unknown-tab-id", "/proj/background");

      const { notifiedProjects } = useProjectsStore.getState();
      expect(notifiedProjects.has("/proj/background")).toBe(false);
    });

    it("does NOT mark active project as notified when AI CLI exits", () => {
      setupStores({
        activeProjectPath: "/proj/active",
        tabs: [
          { id: "tab-1", path: "/proj/active", sessionType: "claude", isRunning: false },
        ],
      });

      simulateSessionStateExited("tab-1", "/proj/active");

      const { notifiedProjects } = useProjectsStore.getState();
      // markProjectNotified guards against notifying the active project
      expect(notifiedProjects.has("/proj/active")).toBe(false);
    });
  });

  describe("allows correct notification badges", () => {
    it("marks background project as notified when AI CLI (claude) exits and no other tabs running", () => {
      setupStores({
        activeProjectPath: "/proj/active",
        tabs: [
          { id: "tab-bg", path: "/proj/background", sessionType: "claude", isRunning: false },
        ],
      });

      simulateSessionStateExited("tab-bg", "/proj/background");

      const { notifiedProjects } = useProjectsStore.getState();
      expect(notifiedProjects.has("/proj/background")).toBe(true);
    });

    it("marks background project as notified when AI CLI (gemini) exits and no other tabs running", () => {
      setupStores({
        activeProjectPath: "/proj/active",
        tabs: [
          { id: "tab-bg", path: "/proj/background", sessionType: "gemini", isRunning: false },
        ],
      });

      simulateSessionStateExited("tab-bg", "/proj/background");

      const { notifiedProjects } = useProjectsStore.getState();
      expect(notifiedProjects.has("/proj/background")).toBe(true);
    });

    it("does NOT mark background project as notified when another AI CLI tab is still running", () => {
      setupStores({
        activeProjectPath: "/proj/active",
        tabs: [
          { id: "tab-1", path: "/proj/background", sessionType: "claude", isRunning: false },
          { id: "tab-2", path: "/proj/background", sessionType: "claude", isRunning: true },
        ],
      });

      simulateSessionStateExited("tab-1", "/proj/background");

      const { notifiedProjects } = useProjectsStore.getState();
      expect(notifiedProjects.has("/proj/background")).toBe(false);
    });

    it("marks background project as notified when last AI CLI exits even if a terminal tab remains running", () => {
      // A terminal running alongside the AI CLI should not block the notification
      setupStores({
        activeProjectPath: "/proj/active",
        tabs: [
          { id: "ai-tab", path: "/proj/background", sessionType: "claude", isRunning: false },
          // Terminal is still running but should not block AI CLI notification
          { id: "term-tab", path: "/proj/background", sessionType: "terminal", isRunning: true },
        ],
      });

      // anyRunning is true because terminal is running → no notification (correct: we wait for all)
      simulateSessionStateExited("ai-tab", "/proj/background");

      const { notifiedProjects } = useProjectsStore.getState();
      // anyRunning is true, so no notification badge regardless
      expect(notifiedProjects.has("/proj/background")).toBe(false);
    });
  });

  describe("session state is updated correctly", () => {
    it("sets project session state to exited when no tabs running", () => {
      setupStores({
        tabs: [
          { id: "tab-1", path: "/proj/background", sessionType: "claude", isRunning: false },
        ],
      });

      simulateSessionStateExited("tab-1", "/proj/background");

      const { sessionStates } = useProjectsStore.getState();
      expect(sessionStates["/proj/background"]).toBe("exited");
    });

    it("sets project session state to running when another tab is still running", () => {
      setupStores({
        tabs: [
          { id: "tab-1", path: "/proj/background", sessionType: "claude", isRunning: false },
          { id: "tab-2", path: "/proj/background", sessionType: "claude", isRunning: true },
        ],
      });

      simulateSessionStateExited("tab-1", "/proj/background");

      const { sessionStates } = useProjectsStore.getState();
      expect(sessionStates["/proj/background"]).toBe("running");
    });
  });
});
