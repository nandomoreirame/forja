import { create } from "zustand";
import { invoke } from "@/lib/ipc";
import type { RegistryData, RegistryPlugin, InstallProgress } from "@/lib/plugin-types";
import { usePluginsStore } from "./plugins";

interface MarketplaceState {
  registry: RegistryData | null;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  activeTag: string | null;
  installProgress: Record<string, InstallProgress>;

  fetchRegistry: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setActiveTag: (tag: string | null) => void;
  installPlugin: (name: string) => Promise<void>;
  uninstallPlugin: (name: string) => Promise<void>;
  setInstallProgress: (name: string, progress: InstallProgress) => void;
  getFilteredPlugins: () => RegistryPlugin[];
  getAllTags: () => string[];
}

export const useMarketplaceStore = create<MarketplaceState>((set, get) => ({
  registry: null,
  loading: false,
  error: null,
  searchQuery: "",
  activeTag: null,
  installProgress: {},

  fetchRegistry: async () => {
    set({ loading: true, error: null });
    try {
      const data = await invoke<RegistryData>("plugin:fetch-registry");
      set({ registry: data, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  setActiveTag: (tag: string | null) => set({ activeTag: tag }),

  installPlugin: async (name: string) => {
    try {
      set((state) => ({
        installProgress: {
          ...state.installProgress,
          [name]: { stage: "downloading", percent: 0 },
        },
      }));
      await invoke("plugin:install", { name });
      set((state) => ({
        installProgress: {
          ...state.installProgress,
          [name]: { stage: "done" },
        },
      }));
      // Reload plugins list
      await usePluginsStore.getState().loadPlugins();
    } catch (error) {
      set((state) => ({
        installProgress: {
          ...state.installProgress,
          [name]: { stage: "error", message: (error as Error).message },
        },
      }));
    }
  },

  uninstallPlugin: async (name: string) => {
    try {
      await invoke("plugin:uninstall", { name });
      // Reload plugins list
      await usePluginsStore.getState().loadPlugins();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  setInstallProgress: (name: string, progress: InstallProgress) => {
    set((state) => ({
      installProgress: { ...state.installProgress, [name]: progress },
    }));
  },

  getFilteredPlugins: (): RegistryPlugin[] => {
    const { registry, searchQuery, activeTag } = get();
    if (!registry) return [];

    let plugins = registry.plugins;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      plugins = plugins.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.displayName.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (activeTag) {
      plugins = plugins.filter((p) => p.tags.includes(activeTag));
    }

    return plugins;
  },

  getAllTags: (): string[] => {
    const { registry } = get();
    if (!registry) return [];
    const tagSet = new Set<string>();
    for (const plugin of registry.plugins) {
      for (const tag of plugin.tags) {
        tagSet.add(tag);
      }
    }
    return [...tagSet].sort();
  },
}));
