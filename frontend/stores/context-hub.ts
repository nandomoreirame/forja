import { invoke } from "@/lib/ipc";
import { create } from "zustand";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContextStatus {
  initialized: boolean;
  counts: Record<string, number>;
  lastUpdated: string | null;
}

interface SyncSummary {
  timestamp: string;
  direction: "outbound" | "inbound";
  results: Array<{
    tool: string;
    component: string;
    action: string;
    path: string;
    error?: string;
  }>;
}

interface SyncOptions {
  strategy?: string;
  toolIds?: string[];
  components?: string[];
}

export interface HubItem {
  type: string;
  slug: string;
  path: string;
  fingerprint: string;
  lastSyncAt: string | null;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface ContextHubState {
  status: ContextStatus | null;
  syncSummary: SyncSummary | null;
  items: HubItem[];
  currentItem: { type: string; slug: string; content: string } | null;
  loading: boolean;
  error: string | null;

  initHub: () => Promise<void>;
  loadStatus: () => Promise<void>;
  syncOut: (options?: SyncOptions) => Promise<void>;
  syncIn: (options?: SyncOptions) => Promise<void>;
  createSkill: (
    slug: string,
    options?: { content?: string; force?: boolean }
  ) => Promise<string | undefined>;
  createAgent: (
    slug: string,
    options?: { content?: string; force?: boolean }
  ) => Promise<string | undefined>;
  listItems: (type?: string) => Promise<void>;
  readItem: (type: string, slug: string) => Promise<void>;
  writeItem: (type: string, slug: string, content: string) => Promise<void>;
  deleteItem: (type: string, slug: string) => Promise<void>;
  importItem: (type: string, filePath: string) => Promise<void>;
}

export const useContextHubStore = create<ContextHubState>((set) => ({
  status: null,
  syncSummary: null,
  items: [],
  currentItem: null,
  loading: false,
  error: null,

  initHub: async () => {
    set({ loading: true, error: null });
    try {
      await invoke("context:init", {});
      set({ loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  loadStatus: async () => {
    set({ loading: true, error: null });
    try {
      const status = await invoke<ContextStatus>("context:status", {});
      set({ status, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  syncOut: async (options) => {
    set({ loading: true, error: null });
    try {
      const summary = await invoke<SyncSummary>("context:sync_out", {
        ...options,
      });
      set({ syncSummary: summary, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  syncIn: async (options) => {
    set({ loading: true, error: null });
    try {
      const summary = await invoke<SyncSummary>("context:sync_in", {
        ...options,
      });
      set({ syncSummary: summary, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  createSkill: async (slug, options) => {
    set({ loading: true, error: null });
    try {
      const path = await invoke<string>("context:create_skill", {
        slug,
        ...options,
      });
      set({ loading: false });
      return path;
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      return undefined;
    }
  },

  createAgent: async (slug, options) => {
    set({ loading: true, error: null });
    try {
      const path = await invoke<string>("context:create_agent", {
        slug,
        ...options,
      });
      set({ loading: false });
      return path;
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      return undefined;
    }
  },

  listItems: async (type?) => {
    set({ loading: true, error: null });
    try {
      const args: Record<string, string> = {};
      if (type) args.type = type;
      const items = await invoke<HubItem[]>("context:list_items", args);
      set({ items, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  readItem: async (type, slug) => {
    set({ loading: true, error: null });
    try {
      const content = await invoke<string>("context:read_item", { type, slug });
      set({ currentItem: { type, slug, content }, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message, currentItem: null });
    }
  },

  writeItem: async (type, slug, content) => {
    set({ loading: true, error: null });
    try {
      await invoke("context:write_item", { type, slug, content });
      set({ loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  deleteItem: async (type, slug) => {
    set({ loading: true, error: null });
    try {
      await invoke("context:delete_item", { type, slug });
      set({ loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  importItem: async (type, filePath) => {
    set({ loading: true, error: null });
    try {
      await invoke("context:import_item", { type, filePath });
      set({ loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },
}));
