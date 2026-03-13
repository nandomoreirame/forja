import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@/lib/ipc";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
}));

// Must reset the store between tests since Zustand persists state
let usePluginsStore: typeof import("@/stores/plugins").usePluginsStore;

describe("usePluginsStore", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const mod = await import("@/stores/plugins");
    usePluginsStore = mod.usePluginsStore;
  });

  it("starts with empty plugins and no active plugin", () => {
    const state = usePluginsStore.getState();
    expect(state.plugins).toEqual([]);
    expect(state.activePluginName).toBeNull();
    expect(state.loading).toBe(false);
  });

  it("loadPlugins fetches from IPC", async () => {
    const mockPlugins = [
      { manifest: { name: "test" }, path: "/test", entryUrl: "file:///test", enabled: true },
    ];
    vi.mocked(invoke).mockImplementation(async (ch: string) => {
      if (ch === "plugin:list") return mockPlugins;
      if (ch === "plugin:get-plugin-order") return [];
      return undefined;
    });
    await usePluginsStore.getState().loadPlugins();
    expect(invoke).toHaveBeenCalledWith("plugin:list");
    expect(usePluginsStore.getState().plugins).toEqual(mockPlugins);
    expect(usePluginsStore.getState().loading).toBe(false);
  });

  it("setActivePlugin updates state", () => {
    usePluginsStore.getState().setActivePlugin("my-plugin");
    expect(usePluginsStore.getState().activePluginName).toBe("my-plugin");
  });

  it("setActivePlugin to null clears selection", () => {
    usePluginsStore.getState().setActivePlugin("my-plugin");
    usePluginsStore.getState().setActivePlugin(null);
    expect(usePluginsStore.getState().activePluginName).toBeNull();
  });

  it("enablePlugin calls IPC and reloads", async () => {
    vi.mocked(invoke).mockImplementation(async (ch: string) => {
      if (ch === "plugin:list") return [];
      if (ch === "plugin:get-plugin-order") return [];
      return undefined;
    });
    await usePluginsStore.getState().enablePlugin("test-plugin");
    expect(invoke).toHaveBeenCalledWith("plugin:enable", { name: "test-plugin" });
    expect(invoke).toHaveBeenCalledWith("plugin:list");
  });

  it("disablePlugin clears active if same plugin", async () => {
    vi.mocked(invoke).mockImplementation(async (ch: string) => {
      if (ch === "plugin:list") return [];
      if (ch === "plugin:get-plugin-order") return [];
      return undefined;
    });
    usePluginsStore.getState().setActivePlugin("test-plugin");
    await usePluginsStore.getState().disablePlugin("test-plugin");
    expect(usePluginsStore.getState().activePluginName).toBeNull();
  });

  it("requestPermissions sets permission prompt", () => {
    usePluginsStore.getState().requestPermissions("my-plugin", ["git.status", "theme.current"]);
    const prompt = usePluginsStore.getState().permissionPrompt;
    expect(prompt).toEqual({ pluginName: "my-plugin", permissions: ["git.status", "theme.current"] });
  });

  it("dismissPermissionPrompt clears prompt", () => {
    usePluginsStore.getState().requestPermissions("my-plugin", ["git.status"]);
    usePluginsStore.getState().dismissPermissionPrompt();
    expect(usePluginsStore.getState().permissionPrompt).toBeNull();
  });

  it("grantPermissions calls IPC and clears prompt", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);
    usePluginsStore.getState().requestPermissions("my-plugin", ["git.status"]);
    await usePluginsStore.getState().grantPermissions("my-plugin", ["git.status"]);
    expect(invoke).toHaveBeenCalledWith("plugin:grant-permissions", { name: "my-plugin", permissions: ["git.status"] });
    expect(usePluginsStore.getState().permissionPrompt).toBeNull();
  });

  it("saveActivePluginForProject persists per-project state", () => {
    usePluginsStore.getState().setActivePlugin("my-plugin");
    usePluginsStore.getState().saveActivePluginForProject("/my/project");
    expect(usePluginsStore.getState().activePluginNameByProject["/my/project"]).toBe("my-plugin");
  });

  it("restoreActivePluginForProject restores per-project state", () => {
    usePluginsStore.getState().setActivePlugin("my-plugin");
    usePluginsStore.getState().saveActivePluginForProject("/my/project");
    usePluginsStore.getState().setActivePlugin(null);
    usePluginsStore.getState().restoreActivePluginForProject("/my/project");
    expect(usePluginsStore.getState().activePluginName).toBe("my-plugin");
  });
});
