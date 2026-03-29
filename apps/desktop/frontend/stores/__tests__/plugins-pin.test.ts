import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@/lib/ipc";
import type { LoadedPlugin } from "@/lib/plugin-types";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
}));

function makePlugin(name: string, displayName?: string, enabled = true): LoadedPlugin {
  return {
    manifest: { name, displayName: displayName ?? name, version: "1.0.0" },
    path: `/plugins/${name}`,
    entryUrl: `file:///plugins/${name}/index.html`,
    enabled,
  } as LoadedPlugin;
}

let usePluginsStore: typeof import("@/stores/plugins").usePluginsStore;

describe("usePluginsStore - pin functionality", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const mod = await import("@/stores/plugins");
    usePluginsStore = mod.usePluginsStore;
  });

  describe("initial state", () => {
    it("starts with no pinned plugin", () => {
      const state = usePluginsStore.getState();
      expect(state.pinnedPluginName).toBeNull();
    });
  });

  describe("pinPlugin", () => {
    it("sets pinnedPluginName when pinPlugin is called", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      await usePluginsStore.getState().pinPlugin("pomodoro");

      expect(usePluginsStore.getState().pinnedPluginName).toBe("pomodoro");
    });

    it("calls plugin:pin IPC with plugin name", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      await usePluginsStore.getState().pinPlugin("pomodoro");

      expect(invoke).toHaveBeenCalledWith("plugin:pin", { name: "pomodoro" });
    });

    it("overwrites previously pinned plugin when pinning a new one", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      await usePluginsStore.getState().pinPlugin("pomodoro");
      await usePluginsStore.getState().pinPlugin("notes");

      expect(usePluginsStore.getState().pinnedPluginName).toBe("notes");
      expect(invoke).toHaveBeenLastCalledWith("plugin:pin", { name: "notes" });
    });
  });

  describe("unpinPlugin", () => {
    it("clears pinnedPluginName when unpinPlugin is called", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      await usePluginsStore.getState().pinPlugin("pomodoro");
      await usePluginsStore.getState().unpinPlugin();

      expect(usePluginsStore.getState().pinnedPluginName).toBeNull();
    });

    it("calls plugin:pin IPC with null to unpin", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      await usePluginsStore.getState().pinPlugin("pomodoro");
      vi.mocked(invoke).mockClear();

      await usePluginsStore.getState().unpinPlugin();

      expect(invoke).toHaveBeenCalledWith("plugin:pin", { name: null });
    });

    it("does nothing when no plugin is pinned", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      // Should not throw even when nothing is pinned
      await usePluginsStore.getState().unpinPlugin();

      expect(usePluginsStore.getState().pinnedPluginName).toBeNull();
    });
  });

  describe("loadPlugins - restores pinned plugin from backend", () => {
    it("fetches pinned plugin via plugin:get-pinned on load", async () => {
      const plugins = [makePlugin("pomodoro")];
      vi.mocked(invoke).mockImplementation(async (ch: string) => {
        if (ch === "plugin:list") return plugins;
        if (ch === "plugin:get-plugin-order") return [];
        if (ch === "plugin:get-pinned") return "pomodoro";
        return undefined;
      });

      await usePluginsStore.getState().loadPlugins();

      expect(invoke).toHaveBeenCalledWith("plugin:get-pinned");
      expect(usePluginsStore.getState().pinnedPluginName).toBe("pomodoro");
    });

    it("sets pinnedPluginName to null when backend returns null", async () => {
      const plugins = [makePlugin("pomodoro")];
      vi.mocked(invoke).mockImplementation(async (ch: string) => {
        if (ch === "plugin:list") return plugins;
        if (ch === "plugin:get-plugin-order") return [];
        if (ch === "plugin:get-pinned") return null;
        return undefined;
      });

      await usePluginsStore.getState().loadPlugins();

      expect(usePluginsStore.getState().pinnedPluginName).toBeNull();
    });

    it("sets activePluginName to pinned plugin when loadPlugins finds a pinned plugin on fresh start", async () => {
      // On app startup, activePluginName is null but a pinned plugin exists in backend
      const plugins = [makePlugin("pomodoro")];
      vi.mocked(invoke).mockImplementation(async (ch: string) => {
        if (ch === "plugin:list") return plugins;
        if (ch === "plugin:get-plugin-order") return [];
        if (ch === "plugin:get-pinned") return "pomodoro";
        return undefined;
      });

      // Simulate fresh start: activePluginName is null
      usePluginsStore.setState({ activePluginName: null });

      await usePluginsStore.getState().loadPlugins();

      // After loading, the pinned plugin should be the active one
      expect(usePluginsStore.getState().activePluginName).toBe("pomodoro");
    });

    it("does not override an already-active plugin when loading pinned plugin", async () => {
      // If user already navigated to a different plugin, don't override with pinned on reload
      const plugins = [makePlugin("pomodoro"), makePlugin("notes")];
      vi.mocked(invoke).mockImplementation(async (ch: string) => {
        if (ch === "plugin:list") return plugins;
        if (ch === "plugin:get-plugin-order") return [];
        if (ch === "plugin:get-pinned") return "pomodoro";
        return undefined;
      });

      // User had "notes" active before reload
      usePluginsStore.setState({ activePluginName: "notes" });

      await usePluginsStore.getState().loadPlugins();

      // The existing active plugin should NOT be overridden by pinned on reload
      expect(usePluginsStore.getState().activePluginName).toBe("notes");
    });

    it("sets activePluginName to null when no pinned plugin and no prior active plugin", async () => {
      const plugins = [makePlugin("pomodoro")];
      vi.mocked(invoke).mockImplementation(async (ch: string) => {
        if (ch === "plugin:list") return plugins;
        if (ch === "plugin:get-plugin-order") return [];
        if (ch === "plugin:get-pinned") return null;
        return undefined;
      });

      usePluginsStore.setState({ activePluginName: null });

      await usePluginsStore.getState().loadPlugins();

      expect(usePluginsStore.getState().activePluginName).toBeNull();
    });
  });
});
