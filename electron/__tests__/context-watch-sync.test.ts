import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock chokidar
const mockWatch = vi.fn();
const mockWatcherClose = vi.fn().mockResolvedValue(undefined);
const mockWatcherOn = vi.fn();

vi.mock("chokidar", () => ({
  default: {
    watch: (...args: unknown[]) => {
      mockWatch(...args);
      return {
        on: mockWatcherOn,
        close: mockWatcherClose,
      };
    },
  },
}));

// Mock os
vi.mock("os", () => ({
  default: { homedir: vi.fn(() => "/home/user") },
  homedir: vi.fn(() => "/home/user"),
}));

import {
  startContextWatcher,
  stopContextWatcher,
  getContextSyncState,
  resetSyncFlags,
} from "../context/context-watch-sync.js";

describe("context-watch-sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    resetSyncFlags();
  });

  afterEach(() => {
    stopContextWatcher("/project");
    vi.useRealTimers();
  });

  it("starts watching .forja/context directory", () => {
    startContextWatcher("/project");

    expect(mockWatch).toHaveBeenCalled();
    const firstCallPath = mockWatch.mock.calls[0][0];
    // Should watch the context directory
    expect(firstCallPath).toContain(".forja/context");
  });

  it("starts watching CLI tool directories", () => {
    startContextWatcher("/project");

    // Multiple watch calls: one for hub, plus CLI tool dirs
    expect(mockWatch.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("registers change event handlers on watchers", () => {
    startContextWatcher("/project");

    // Should register 'change', 'add', 'unlink' events
    const eventNames = mockWatcherOn.mock.calls.map((c) => c[0] as string);
    expect(eventNames).toContain("change");
    expect(eventNames).toContain("add");
  });

  it("sets pendingSyncOut when hub file changes", () => {
    startContextWatcher("/project");

    // Find the 'change' callback for the hub watcher
    // The hub watcher is the first watch call
    const hubChangeCallbacks = mockWatcherOn.mock.calls
      .filter((c) => c[0] === "change");

    // Trigger a change in hub
    if (hubChangeCallbacks.length > 0) {
      hubChangeCallbacks[0][1]("/project/.forja/context/skills/tdd/SKILL.md");
      vi.advanceTimersByTime(1000);
    }

    const state = getContextSyncState("/project");
    expect(state.pendingSyncOut).toBe(true);
  });

  it("sets pendingSyncIn when CLI tool file changes", () => {
    startContextWatcher("/project");

    // Find change callbacks — CLI watcher comes after hub watcher
    const changeCallbacks = mockWatcherOn.mock.calls
      .filter((c) => c[0] === "change");

    // The second set of change callbacks should be from CLI watchers
    if (changeCallbacks.length > 1) {
      changeCallbacks[1][1]("/home/user/.claude/agents/test.md");
      vi.advanceTimersByTime(1000);
    }

    const state = getContextSyncState("/project");
    expect(state.pendingSyncIn).toBe(true);
  });

  it("stops watchers and cleans up", () => {
    startContextWatcher("/project");
    stopContextWatcher("/project");

    expect(mockWatcherClose).toHaveBeenCalled();
  });

  it("returns clean state after reset", () => {
    const state = getContextSyncState("/project");
    expect(state.pendingSyncOut).toBe(false);
    expect(state.pendingSyncIn).toBe(false);
  });

  it("debounces rapid changes", () => {
    startContextWatcher("/project");

    const hubChangeCallbacks = mockWatcherOn.mock.calls
      .filter((c) => c[0] === "change");

    if (hubChangeCallbacks.length > 0) {
      // Trigger multiple rapid changes
      hubChangeCallbacks[0][1]("file1.md");
      hubChangeCallbacks[0][1]("file2.md");
      hubChangeCallbacks[0][1]("file3.md");

      // Before debounce completes
      const stateBefore = getContextSyncState("/project");
      // Flags may not be set yet due to debounce
      expect(stateBefore.pendingSyncOut).toBe(false);

      // After debounce
      vi.advanceTimersByTime(1000);
      const stateAfter = getContextSyncState("/project");
      expect(stateAfter.pendingSyncOut).toBe(true);
    }
  });
});
