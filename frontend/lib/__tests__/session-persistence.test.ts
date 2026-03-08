import { describe, expect, it, beforeEach } from "vitest";
import {
  loadPersistedSessionState,
  savePersistedSessionState,
  type PersistedSessionState,
} from "../session-persistence";

describe("session-persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("saves and loads a valid session snapshot", () => {
    const state: PersistedSessionState = {
      activeWorkspaceId: "ws-1",
      activeProjectPath: "/repo",
      preview: { isOpen: true, currentFile: "/repo/src/a.ts" },
      terminal: {
        isPaneOpen: true,
        activeTabIndex: 1,
        tabs: [
          { path: "/repo", sessionType: "claude" },
          { path: "/repo", sessionType: "terminal" },
        ],
      },
    };

    savePersistedSessionState(state);
    expect(loadPersistedSessionState()).toEqual(state);
  });

  it("returns null for invalid json", () => {
    window.localStorage.setItem("forja:session:v1", "{invalid json");
    expect(loadPersistedSessionState()).toBeNull();
  });

  it("filters invalid terminal tabs and keeps valid ones", () => {
    window.localStorage.setItem(
      "forja:session:v1",
      JSON.stringify({
        activeWorkspaceId: "ws-1",
        activeProjectPath: "/repo",
        preview: { isOpen: true, currentFile: "/repo/src/a.ts" },
        terminal: {
          isPaneOpen: true,
          activeTabIndex: 99,
          tabs: [
            { path: "/repo", sessionType: "claude" },
            { path: "/repo", sessionType: "unknown" },
            { path: 123, sessionType: "terminal" },
          ],
        },
      }),
    );

    expect(loadPersistedSessionState()).toEqual({
      activeWorkspaceId: "ws-1",
      activeProjectPath: "/repo",
      preview: { isOpen: true, currentFile: "/repo/src/a.ts" },
      terminal: {
        isPaneOpen: true,
        activeTabIndex: 99,
        tabs: [{ path: "/repo", sessionType: "claude" }],
      },
    });
  });

  it("preserves activeProjectPath from old snapshot with activeWorkspaceId", () => {
    // Simulate old format with workspaceId
    window.localStorage.setItem(
      "forja:session:v1",
      JSON.stringify({
        activeWorkspaceId: "old-ws",
        activeProjectPath: "/home/user/proj",
        preview: { isOpen: false, currentFile: null },
        terminal: { isPaneOpen: true, activeTabIndex: 0, tabs: [] },
      }),
    );

    const restored = loadPersistedSessionState();
    expect(restored?.activeProjectPath).toBe("/home/user/proj");
    // workspaceId is still read but will be ignored by App.tsx
    expect(restored?.activeWorkspaceId).toBe("old-ws");
  });
});

