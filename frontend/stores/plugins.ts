import { create } from "zustand";
import { invoke } from "@/lib/ipc";
import type { LoadedPlugin, PluginPermission } from "@/lib/plugin-types";

interface PermissionPrompt {
  pluginName: string;
  permissions: PluginPermission[];
}

interface PluginsState {
  plugins: LoadedPlugin[];
  pluginOrder: string[];
  activePluginName: string | null;
  activePluginNameByProject: Record<string, string | null>;
  permissionPrompt: PermissionPrompt | null;
  pluginBadges: Record<string, string>;
  loading: boolean;

  loadPlugins: () => Promise<void>;
  setActivePlugin: (name: string | null) => void;
  enablePlugin: (name: string) => Promise<void>;
  disablePlugin: (name: string) => Promise<void>;
  reorderPlugins: (activeId: string, overId: string) => void;
  requestPermissions: (pluginName: string, permissions: PluginPermission[]) => void;
  grantPermissions: (pluginName: string, permissions: PluginPermission[]) => Promise<void>;
  denyPermissions: (pluginName: string, permissions: PluginPermission[]) => Promise<void>;
  dismissPermissionPrompt: () => void;
  saveActivePluginForProject: (projectPath: string) => void;
  restoreActivePluginForProject: (projectPath: string) => void;
  setPluginBadge: (pluginName: string, text: string) => void;
}

export function getOrderedEnabledPlugins(state: Pick<PluginsState, "plugins" | "pluginOrder">): LoadedPlugin[] {
  const enabled = state.plugins.filter((p) => p.enabled);
  const orderMap = new Map(state.pluginOrder.map((name, i) => [name, i]));
  return [...enabled].sort((a, b) => {
    const ai = orderMap.get(a.manifest.name) ?? Infinity;
    const bi = orderMap.get(b.manifest.name) ?? Infinity;
    return ai - bi;
  });
}

export const usePluginsStore = create<PluginsState>((set, get) => ({
  plugins: [],
  pluginOrder: [],
  activePluginName: null,
  activePluginNameByProject: {},
  permissionPrompt: null,
  pluginBadges: {},
  loading: false,

  loadPlugins: async () => {
    set({ loading: true });
    try {
      const [plugins, persistedOrder] = await Promise.all([
        invoke<LoadedPlugin[]>("plugin:list"),
        invoke<string[]>("plugin:get-plugin-order"),
      ]);
      const loaded = plugins ?? [];
      const loadedNames = new Set(loaded.map((p) => p.manifest.name));

      // Use persisted order if available, otherwise fall back to in-memory order
      const baseOrder = (persistedOrder && persistedOrder.length > 0)
        ? persistedOrder
        : get().pluginOrder;

      // Keep existing order for known plugins, remove absent, append new
      const preserved = baseOrder.filter((n) => loadedNames.has(n));
      const preservedSet = new Set(preserved);
      const newNames = loaded
        .map((p) => p.manifest.name)
        .filter((n) => !preservedSet.has(n));

      set({ plugins: loaded, pluginOrder: [...preserved, ...newNames], loading: false });
    } catch {
      set({ loading: false });
    }
  },

  setActivePlugin: (name: string | null) => {
    set({ activePluginName: name });
  },

  enablePlugin: async (name: string) => {
    await invoke("plugin:enable", { name });
    await get().loadPlugins();
  },

  reorderPlugins: (activeId: string, overId: string) => {
    const { pluginOrder } = get();
    const oldIndex = pluginOrder.indexOf(activeId);
    const newIndex = pluginOrder.indexOf(overId);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
    const newOrder = [...pluginOrder];
    const [moved] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, moved);
    set({ pluginOrder: newOrder });
    invoke("plugin:set-plugin-order", { names: newOrder }).catch(() => {});
  },

  disablePlugin: async (name: string) => {
    await invoke("plugin:disable", { name });
    const { activePluginName } = get();
    if (activePluginName === name) {
      set({ activePluginName: null });
    }
    await get().loadPlugins();
  },

  requestPermissions: (pluginName: string, permissions: PluginPermission[]) => {
    set({ permissionPrompt: { pluginName, permissions } });
  },

  grantPermissions: async (pluginName: string, permissions: PluginPermission[]) => {
    await invoke("plugin:grant-permissions", { name: pluginName, permissions });
    set({ permissionPrompt: null });
  },

  denyPermissions: async (pluginName: string, permissions: PluginPermission[]) => {
    await invoke("plugin:deny-permissions", { name: pluginName, permissions });
    set({ permissionPrompt: null });
  },

  dismissPermissionPrompt: () => {
    set({ permissionPrompt: null });
  },

  saveActivePluginForProject: (projectPath: string) => {
    const { activePluginName, activePluginNameByProject } = get();
    set({
      activePluginNameByProject: {
        ...activePluginNameByProject,
        [projectPath]: activePluginName,
      },
    });
  },

  restoreActivePluginForProject: (projectPath: string) => {
    const { activePluginNameByProject } = get();
    const saved = activePluginNameByProject[projectPath];
    set({ activePluginName: saved ?? null });
  },

  setPluginBadge: (pluginName: string, text: string) => {
    const { pluginBadges } = get();
    if (pluginBadges[pluginName] === text) return;
    set({ pluginBadges: { ...pluginBadges, [pluginName]: text } });
  },
}));
