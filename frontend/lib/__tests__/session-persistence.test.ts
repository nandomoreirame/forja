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
        activeTabIndex: 99,
        tabs: [{ path: "/repo", sessionType: "claude" }],
      },
    });
  });

  it("preserves activeProjectPath from old snapshot with activeWorkspaceId", () => {
    window.localStorage.setItem(
      "forja:session:v1",
      JSON.stringify({
        activeWorkspaceId: "old-ws",
        activeProjectPath: "/home/user/proj",
        preview: { isOpen: false, currentFile: null },
        terminal: { activeTabIndex: 0, tabs: [] },
      }),
    );

    const restored = loadPersistedSessionState();
    expect(restored?.activeProjectPath).toBe("/home/user/proj");
    expect(restored?.activeWorkspaceId).toBe("old-ws");
  });

  it("saves and loads tabs with customName", () => {
    const state: PersistedSessionState = {
      activeWorkspaceId: null,
      activeProjectPath: "/repo",
      preview: { isOpen: false, currentFile: null },
      terminal: {
        activeTabIndex: 0,
        tabs: [
          { path: "/repo", sessionType: "claude", customName: "My Build" },
          { path: "/repo", sessionType: "terminal" },
        ],
      },
    };

    savePersistedSessionState(state);
    const restored = loadPersistedSessionState();

    expect(restored?.terminal.tabs[0].customName).toBe("My Build");
    expect(restored?.terminal.tabs[1].customName).toBeUndefined();
  });

  it("ignores non-string customName values during parse", () => {
    window.localStorage.setItem(
      "forja:session:v1",
      JSON.stringify({
        activeProjectPath: "/repo",
        preview: { isOpen: false, currentFile: null },
        terminal: {
          activeTabIndex: 0,
          tabs: [
            { path: "/repo", sessionType: "claude", customName: 123 },
            { path: "/repo", sessionType: "terminal", customName: "" },
          ],
        },
      }),
    );

    const restored = loadPersistedSessionState();
    expect(restored?.terminal.tabs[0].customName).toBeUndefined();
    expect(restored?.terminal.tabs[1].customName).toBeUndefined();
  });

  it("saves and loads tabs with id", () => {
    const state: PersistedSessionState = {
      activeWorkspaceId: null,
      activeProjectPath: "/repo",
      preview: { isOpen: false, currentFile: null },
      terminal: {
        activeTabIndex: 0,
        tabs: [
          { path: "/repo", sessionType: "claude", id: "main-abc123-tab-1" },
          { path: "/repo", sessionType: "terminal" },
        ],
      },
    };

    savePersistedSessionState(state);
    const restored = loadPersistedSessionState();

    expect(restored?.terminal.tabs[0].id).toBe("main-abc123-tab-1");
    expect(restored?.terminal.tabs[1].id).toBeUndefined();
  });

  it("ignores non-string id values during parse", () => {
    window.localStorage.setItem(
      "forja:session:v1",
      JSON.stringify({
        activeProjectPath: "/repo",
        preview: { isOpen: false, currentFile: null },
        terminal: {
          activeTabIndex: 0,
          tabs: [
            { path: "/repo", sessionType: "claude", id: 123 },
            { path: "/repo", sessionType: "terminal", id: "" },
          ],
        },
      }),
    );

    const restored = loadPersistedSessionState();
    expect(restored?.terminal.tabs[0].id).toBeUndefined();
    expect(restored?.terminal.tabs[1].id).toBeUndefined();
  });

  it("ignores legacy split data in stored JSON gracefully", () => {
    window.localStorage.setItem(
      "forja:session:v1",
      JSON.stringify({
        activeProjectPath: "/repo",
        preview: { isOpen: false, currentFile: null },
        terminal: {
          activeTabIndex: 0,
          split: {
            isEnabled: true,
            orientation: "vertical",
            ratio: 50,
            primaryTabIndex: 0,
            secondaryTabIndex: 1,
          },
          tabs: [
            { path: "/repo", sessionType: "claude" },
            { path: "/repo", sessionType: "terminal" },
          ],
        },
      }),
    );

    const restored = loadPersistedSessionState();
    // Should parse without crashing, split data is simply ignored
    expect(restored).not.toBeNull();
    expect(restored?.terminal.activeTabIndex).toBe(0);
    expect(restored?.terminal.tabs).toHaveLength(2);
    // No split property in the restored state
    expect((restored?.terminal as Record<string, unknown>).split).toBeUndefined();
  });
});
