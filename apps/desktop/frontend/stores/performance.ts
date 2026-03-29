import { create } from "zustand";
import { invoke } from "@/lib/ipc";

interface PerformanceState {
  resolved: "full" | "lite";
  loaded: boolean;
  isLite: boolean;

  loadPerformanceMode: () => Promise<void>;
  toggleLiteMode: () => void;
}

export const usePerformanceStore = create<PerformanceState>((set, get) => ({
  resolved: "full",
  loaded: false,
  isLite: false,

  loadPerformanceMode: async () => {
    try {
      const config = await invoke<{
        resolved: "full" | "lite";
      }>("get_performance_mode");

      set({
        resolved: config.resolved,
        loaded: true,
        isLite: config.resolved === "lite",
      });
    } catch {
      set({ loaded: true });
    }
  },

  toggleLiteMode: () => {
    const next = get().resolved === "lite" ? "full" : "lite";
    const isLite = next === "lite";
    set({
      resolved: next,
      isLite,
    });
  },
}));
