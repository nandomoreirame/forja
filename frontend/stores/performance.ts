import { create } from "zustand";
import { invoke } from "@/lib/ipc";

interface PerformanceState {
  resolved: "full" | "lite";
  tabHibernation: boolean;
  tabHibernationTimeoutMs: number;
  loaded: boolean;
  isLite: boolean;

  loadPerformanceMode: () => Promise<void>;
}

export const usePerformanceStore = create<PerformanceState>((set) => ({
  resolved: "full",
  tabHibernation: false,
  tabHibernationTimeoutMs: 0,
  loaded: false,
  isLite: false,

  loadPerformanceMode: async () => {
    try {
      const config = await invoke<{
        resolved: "full" | "lite";
        tabHibernation: boolean;
        tabHibernationTimeoutMs: number;
      }>("get_performance_mode");

      set({
        resolved: config.resolved,
        tabHibernation: config.tabHibernation,
        tabHibernationTimeoutMs: config.tabHibernationTimeoutMs,
        loaded: true,
        isLite: config.resolved === "lite",
      });
    } catch {
      set({ loaded: true });
    }
  },
}));
