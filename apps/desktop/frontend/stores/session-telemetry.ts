import { create } from "zustand";
import { invoke } from "@/lib/ipc";

export interface TabTelemetry {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheWriteTokens: number;
  totalCacheReadTokens: number;
  lastContextTokens: number;
  contextPct: number | null;
  model: string | null;
  lastTool: string | null;
  messageCount: number;
  costUsd: number;
}

interface SessionTelemetryState {
  telemetry: Record<string, TabTelemetry>;

  getTelemetry: (tabId: string) => TabTelemetry | null;
  fetchTelemetry: (tabId: string, cliId: string, projectPath: string, sessionId: string) => Promise<void>;
  cleanup: (tabId: string) => void;
}

export const useSessionTelemetryStore = create<SessionTelemetryState>((set, get) => ({
  telemetry: {},

  getTelemetry: (tabId: string) => {
    return get().telemetry[tabId] ?? null;
  },

  fetchTelemetry: async (tabId, cliId, projectPath, sessionId) => {
    try {
      const result = await invoke<TabTelemetry | null>("get_session_telemetry", {
        cliId,
        projectPath,
        sessionId,
      });
      if (result) {
        set((state) => ({
          telemetry: { ...state.telemetry, [tabId]: result },
        }));
      }
    } catch {
      // Non-fatal: telemetry is best-effort
    }
  },

  cleanup: (tabId: string) => {
    set((state) => {
      const { [tabId]: _, ...rest } = state.telemetry;
      return { telemetry: rest };
    });
  },
}));
