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
        split: {
          isEnabled: true,
          orientation: "vertical",
          ratio: 60,
          splitTabIndex: 0,
          secondarySessionType: "claude",
        },
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
        split: {
          isEnabled: false,
          orientation: "vertical",
          ratio: 50,
          splitTabIndex: 0,
          secondarySessionType: null,
        },
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
        terminal: { isPaneOpen: true, activeTabIndex: 0, tabs: [] },
      }),
    );

    const restored = loadPersistedSessionState();
    expect(restored?.activeProjectPath).toBe("/home/user/proj");
    expect(restored?.activeWorkspaceId).toBe("old-ws");
    expect(restored?.terminal.split).toEqual({
      isEnabled: false,
      orientation: "vertical",
      ratio: 50,
      splitTabIndex: 0,
      secondarySessionType: null,
    });
  });

  it("parses secondarySessionType from stored data", () => {
    window.localStorage.setItem(
      "forja:session:v1",
      JSON.stringify({
        activeProjectPath: "/repo",
        preview: { isOpen: false, currentFile: null },
        terminal: {
          isPaneOpen: true,
          activeTabIndex: 0,
          split: {
            isEnabled: true,
            orientation: "horizontal",
            ratio: 40,
            splitTabIndex: 1,
            secondarySessionType: "gemini",
          },
          tabs: [
            { path: "/repo", sessionType: "claude" },
            { path: "/repo", sessionType: "gemini" },
          ],
        },
      }),
    );

    const restored = loadPersistedSessionState();
    expect(restored?.terminal.split.splitTabIndex).toBe(1);
    expect(restored?.terminal.split.secondarySessionType).toBe("gemini");
  });

  it("handles legacy format with primaryTabIndex/secondaryTabIndex gracefully", () => {
    window.localStorage.setItem(
      "forja:session:v1",
      JSON.stringify({
        activeProjectPath: "/repo",
        preview: { isOpen: false, currentFile: null },
        terminal: {
          isPaneOpen: true,
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
    // Should still parse without crashing, splitTabIndex falls back to 0
    expect(restored?.terminal.split.splitTabIndex).toBe(0);
    expect(restored?.terminal.split.secondarySessionType).toBeNull();
  });
});
