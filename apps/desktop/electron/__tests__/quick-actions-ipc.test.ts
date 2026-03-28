import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock electron-store before importing config
vi.mock("electron-store", () => {
  class MockStore<T extends Record<string, unknown>> {
    private store: Record<string, unknown>;
    private defaults: Record<string, unknown>;
    constructor(opts?: { defaults?: T }) {
      this.defaults = { ...(opts?.defaults ?? {}) };
      this.store = { ...this.defaults };
    }
    get<K extends keyof T>(key: K): T[K] {
      return (this.store[key as string] ?? undefined) as T[K];
    }
    set<K extends keyof T>(key: K, value: T[K]): void {
      this.store[key as string] = value;
    }
    has(key: string): boolean {
      return key in this.store;
    }
    delete(key: string): void {
      delete this.store[key];
    }
    clear(): void {
      this.store = { ...this.defaults };
    }
  }

  return { default: MockStore };
});

// Mock paths module
vi.mock("../paths.js", () => ({
  getForjaConfigDir: () => "/tmp/test-forja",
  getForjaConfigName: () => "config-test",
}));

// Mock project-config module
vi.mock("../project-config.js", () => ({
  readProjectConfig: vi.fn().mockReturnValue(null),
  patchProjectUi: vi.fn(),
  clearProjectUi: vi.fn(),
}));

// Mock plugins/types
vi.mock("../plugins/types.js", () => ({}));

describe("quick actions - config module", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("getQuickActions returns empty array when config has no quickActions", async () => {
    const { getQuickActions } = await import("../config.js");
    expect(getQuickActions()).toEqual([]);
  });

  it("getQuickActions returns stored actions after saveQuickActions", async () => {
    const { getQuickActions, saveQuickActions } = await import("../config.js");
    const actions = [{ actionId: "action-1" }, { actionId: "action-2" }];
    saveQuickActions(actions);
    expect(getQuickActions()).toEqual(actions);
  });

  it("saveQuickActions persists actions that can be retrieved", async () => {
    const { getQuickActions, saveQuickActions } = await import("../config.js");
    saveQuickActions([{ actionId: "my-action" }]);
    const result = getQuickActions();
    expect(result).toHaveLength(1);
    expect(result[0].actionId).toBe("my-action");
  });

  it("saveQuickActions overwrites previously stored actions", async () => {
    const { getQuickActions, saveQuickActions } = await import("../config.js");
    saveQuickActions([{ actionId: "action-old" }]);
    saveQuickActions([{ actionId: "action-new-1" }, { actionId: "action-new-2" }]);
    const result = getQuickActions();
    expect(result).toHaveLength(2);
    expect(result[0].actionId).toBe("action-new-1");
    expect(result[1].actionId).toBe("action-new-2");
  });

  it("saveQuickActions with empty array clears stored actions", async () => {
    const { getQuickActions, saveQuickActions } = await import("../config.js");
    saveQuickActions([{ actionId: "some-action" }]);
    saveQuickActions([]);
    expect(getQuickActions()).toEqual([]);
  });

  it("getQuickActions returns empty array when store value is not an array", async () => {
    const { getQuickActions, _testHelpers } = await import("../config.js");
    // Force a non-array value via test helpers
    _testHelpers.setStoreValue("quickActions", null);
    expect(getQuickActions()).toEqual([]);
  });
});
