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

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface ContextHubState {
  status: ContextStatus | null;
  syncSummary: SyncSummary | null;
  loading: boolean;
  error: string | null;

  initHub: (projectPath: string) => Promise<void>;
  loadStatus: (projectPath: string) => Promise<void>;
  syncOut: (projectPath: string, options?: SyncOptions) => Promise<void>;
  syncIn: (projectPath: string, options?: SyncOptions) => Promise<void>;
  createSkill: (
    projectPath: string,
    slug: string,
    options?: { content?: string; force?: boolean }
  ) => Promise<string | undefined>;
  createAgent: (
    projectPath: string,
    slug: string,
    options?: { content?: string; force?: boolean }
  ) => Promise<string | undefined>;
}

export const useContextHubStore = create<ContextHubState>((set) => ({
  status: null,
  syncSummary: null,
  loading: false,
  error: null,

  initHub: async (projectPath) => {
    set({ loading: true, error: null });
    try {
      await invoke("context:init", { projectPath });
      set({ loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  loadStatus: async (projectPath) => {
    set({ loading: true, error: null });
    try {
      const status = await invoke<ContextStatus>("context:status", {
        projectPath,
      });
      set({ status, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  syncOut: async (projectPath, options) => {
    set({ loading: true, error: null });
    try {
      const summary = await invoke<SyncSummary>("context:sync_out", {
        projectPath,
        ...options,
      });
      set({ syncSummary: summary, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  syncIn: async (projectPath, options) => {
    set({ loading: true, error: null });
    try {
      const summary = await invoke<SyncSummary>("context:sync_in", {
        projectPath,
        ...options,
      });
      set({ syncSummary: summary, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  createSkill: async (projectPath, slug, options) => {
    set({ loading: true, error: null });
    try {
      const path = await invoke<string>("context:create_skill", {
        projectPath,
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

  createAgent: async (projectPath, slug, options) => {
    set({ loading: true, error: null });
    try {
      const path = await invoke<string>("context:create_agent", {
        projectPath,
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
}));
