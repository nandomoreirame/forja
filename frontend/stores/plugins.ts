import { create } from "zustand";
import { invoke } from "@/lib/ipc";
import type { LoadedPlugin, PluginPermission } from "@/lib/plugin-types";

interface PermissionPrompt {
  pluginName: string;
  permissions: PluginPermission[];
}

interface PluginsState {
  plugins: LoadedPlugin[];
  activePluginName: string | null;
  activePluginNameByProject: Record<string, string | null>;
  permissionPrompt: PermissionPrompt | null;
  loading: boolean;

  loadPlugins: () => Promise<void>;
  setActivePlugin: (name: string | null) => void;
  enablePlugin: (name: string) => Promise<void>;
  disablePlugin: (name: string) => Promise<void>;
  requestPermissions: (pluginName: string, permissions: PluginPermission[]) => void;
  grantPermissions: (pluginName: string, permissions: PluginPermission[]) => Promise<void>;
  denyPermissions: (pluginName: string, permissions: PluginPermission[]) => Promise<void>;
  dismissPermissionPrompt: () => void;
  saveActivePluginForProject: (projectPath: string) => void;
  restoreActivePluginForProject: (projectPath: string) => void;
}

export const usePluginsStore = create<PluginsState>((set, get) => ({
  plugins: [],
  activePluginName: null,
  activePluginNameByProject: {},
  permissionPrompt: null,
  loading: false,

  loadPlugins: async () => {
    set({ loading: true });
    try {
      const plugins = await invoke<LoadedPlugin[]>("plugin:list");
      set({ plugins: plugins ?? [], loading: false });
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
}));
