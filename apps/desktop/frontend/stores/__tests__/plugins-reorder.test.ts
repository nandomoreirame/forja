import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@/lib/ipc";
import type { LoadedPlugin } from "@/lib/plugin-types";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
}));

function makePlugin(name: string, enabled = true): LoadedPlugin {
  return {
    manifest: { name, displayName: name, version: "1.0.0" },
    path: `/plugins/${name}`,
    entryUrl: `file:///plugins/${name}/index.html`,
    enabled,
  } as LoadedPlugin;
}

let usePluginsStore: typeof import("@/stores/plugins").usePluginsStore;
let getOrderedEnabledPlugins: typeof import("@/stores/plugins").getOrderedEnabledPlugins;

describe("plugin reorder", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const mod = await import("@/stores/plugins");
    usePluginsStore = mod.usePluginsStore;
    getOrderedEnabledPlugins = mod.getOrderedEnabledPlugins;
  });

  describe("reorderPlugins", () => {
    it("moves a plugin from one position to another", async () => {
      const plugins = [makePlugin("a"), makePlugin("b"), makePlugin("c")];
      vi.mocked(invoke).mockImplementation(async (ch: string) => {
        if (ch === "plugin:list") return plugins;
        if (ch === "plugin:get-plugin-order") return [];
        return undefined;
      });
      await usePluginsStore.getState().loadPlugins();

      usePluginsStore.getState().reorderPlugins("c", "a");
      const order = usePluginsStore.getState().pluginOrder;
      expect(order).toEqual(["c", "a", "b"]);
    });

    it("does nothing when activeId equals overId", async () => {
      const plugins = [makePlugin("a"), makePlugin("b")];
      vi.mocked(invoke).mockImplementation(async (ch: string) => {
        if (ch === "plugin:list") return plugins;
        if (ch === "plugin:get-plugin-order") return [];
        return undefined;
      });
      await usePluginsStore.getState().loadPlugins();

      usePluginsStore.getState().reorderPlugins("a", "a");
      expect(usePluginsStore.getState().pluginOrder).toEqual(["a", "b"]);
    });

    it("does nothing when ids are not found", async () => {
      const plugins = [makePlugin("a"), makePlugin("b")];
      vi.mocked(invoke).mockImplementation(async (ch: string) => {
        if (ch === "plugin:list") return plugins;
        if (ch === "plugin:get-plugin-order") return [];
        return undefined;
      });
      await usePluginsStore.getState().loadPlugins();

      usePluginsStore.getState().reorderPlugins("x", "a");
      expect(usePluginsStore.getState().pluginOrder).toEqual(["a", "b"]);
    });
  });

  describe("loadPlugins preserves pluginOrder", () => {
    it("initializes pluginOrder from loaded plugins", async () => {
      const plugins = [makePlugin("a"), makePlugin("b"), makePlugin("c")];
      vi.mocked(invoke).mockImplementation(async (ch: string) => {
        if (ch === "plugin:list") return plugins;
        if (ch === "plugin:get-plugin-order") return [];
        return undefined;
      });
      await usePluginsStore.getState().loadPlugins();

      expect(usePluginsStore.getState().pluginOrder).toEqual(["a", "b", "c"]);
    });

    it("preserves existing order and appends new plugins", async () => {
      // First load
      vi.mocked(invoke).mockImplementation(async (ch: string) => {
        if (ch === "plugin:list") return [makePlugin("a"), makePlugin("b")];
        if (ch === "plugin:get-plugin-order") return [];
        return undefined;
      });
      await usePluginsStore.getState().loadPlugins();

      // Reorder: b before a
      usePluginsStore.getState().reorderPlugins("b", "a");
      expect(usePluginsStore.getState().pluginOrder).toEqual(["b", "a"]);

      // Second load with new plugin "c" — persisted order returns empty so in-memory used
      vi.mocked(invoke).mockImplementation(async (ch: string) => {
        if (ch === "plugin:list") return [makePlugin("a"), makePlugin("b"), makePlugin("c")];
        if (ch === "plugin:get-plugin-order") return [];
        return undefined;
      });
      await usePluginsStore.getState().loadPlugins();

      // "b", "a" order preserved, "c" appended
      expect(usePluginsStore.getState().pluginOrder).toEqual(["b", "a", "c"]);
    });

    it("removes plugins no longer present from order", async () => {
      vi.mocked(invoke).mockImplementation(async (ch: string) => {
        if (ch === "plugin:list") return [makePlugin("a"), makePlugin("b"), makePlugin("c")];
        if (ch === "plugin:get-plugin-order") return [];
        return undefined;
      });
      await usePluginsStore.getState().loadPlugins();

      // Now "b" is gone
      vi.mocked(invoke).mockImplementation(async (ch: string) => {
        if (ch === "plugin:list") return [makePlugin("a"), makePlugin("c")];
        if (ch === "plugin:get-plugin-order") return [];
        return undefined;
      });
      await usePluginsStore.getState().loadPlugins();

      expect(usePluginsStore.getState().pluginOrder).toEqual(["a", "c"]);
    });
  });

  describe("getOrderedEnabledPlugins", () => {
    it("returns enabled plugins sorted by pluginOrder", async () => {
      const plugins = [makePlugin("a"), makePlugin("b", false), makePlugin("c")];
      vi.mocked(invoke).mockImplementation(async (ch: string) => {
        if (ch === "plugin:list") return plugins;
        if (ch === "plugin:get-plugin-order") return [];
        return undefined;
      });
      await usePluginsStore.getState().loadPlugins();

      // Reorder: c before a
      usePluginsStore.getState().reorderPlugins("c", "a");

      const ordered = getOrderedEnabledPlugins(usePluginsStore.getState());
      expect(ordered.map((p) => p.manifest.name)).toEqual(["c", "a"]);
    });

    it("returns empty array when no plugins are enabled", async () => {
      const plugins = [makePlugin("a", false), makePlugin("b", false)];
      vi.mocked(invoke).mockImplementation(async (ch: string) => {
        if (ch === "plugin:list") return plugins;
        if (ch === "plugin:get-plugin-order") return [];
        return undefined;
      });
      await usePluginsStore.getState().loadPlugins();

      const ordered = getOrderedEnabledPlugins(usePluginsStore.getState());
      expect(ordered).toEqual([]);
    });
  });

  describe("persistence via IPC", () => {
    it("loadPlugins fetches persisted order from backend", async () => {
      const plugins = [makePlugin("a"), makePlugin("b"), makePlugin("c")];
      vi.mocked(invoke).mockImplementation(async (channel: string) => {
        if (channel === "plugin:list") return plugins;
        if (channel === "plugin:get-plugin-order") return ["c", "a", "b"];
        return undefined;
      });

      await usePluginsStore.getState().loadPlugins();

      expect(invoke).toHaveBeenCalledWith("plugin:get-plugin-order");
      expect(usePluginsStore.getState().pluginOrder).toEqual(["c", "a", "b"]);
    });

    it("loadPlugins uses default order when persisted order is empty", async () => {
      const plugins = [makePlugin("a"), makePlugin("b")];
      vi.mocked(invoke).mockImplementation(async (channel: string) => {
        if (channel === "plugin:list") return plugins;
        if (channel === "plugin:get-plugin-order") return [];
        return undefined;
      });

      await usePluginsStore.getState().loadPlugins();

      expect(usePluginsStore.getState().pluginOrder).toEqual(["a", "b"]);
    });

    it("reorderPlugins persists new order via IPC", async () => {
      const plugins = [makePlugin("a"), makePlugin("b"), makePlugin("c")];
      vi.mocked(invoke).mockImplementation(async (channel: string) => {
        if (channel === "plugin:list") return plugins;
        if (channel === "plugin:get-plugin-order") return [];
        return undefined;
      });

      await usePluginsStore.getState().loadPlugins();
      vi.mocked(invoke).mockClear();

      usePluginsStore.getState().reorderPlugins("c", "a");

      expect(invoke).toHaveBeenCalledWith("plugin:set-plugin-order", {
        names: ["c", "a", "b"],
      });
    });
  });
});
