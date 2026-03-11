import { create } from "zustand";
import { invoke } from "@/lib/ipc";
import { useProjectsStore } from "./projects";

export type SessionState = "idle" | "thinking" | "ready" | "exited";

const READY_TIMEOUT_MS = 2000;

interface TabMeta {
  projectPath: string;
  sessionType: string;
}

interface FinishedNotificationPayload extends TabMeta {
  activeProjectPath: string | null;
}

interface SessionStateStoreState {
  states: Record<string, SessionState>;

  getState: (tabId: string) => SessionState;
  onData: (tabId: string, meta?: TabMeta) => void;
  onExit: (tabId: string) => void;
  cleanup: (tabId: string) => void;
}

// Debounce timers per tab (kept outside store to avoid serialization issues)
const timers = new Map<string, ReturnType<typeof setTimeout>>();
// Metadata per tab for notification context
const tabMetas = new Map<string, TabMeta>();
const tabsWithOutput = new Set<string>();

function isAnyTabThinkingForProject(projectPath: string, excludeTabId?: string): boolean {
  const { states } = useSessionStateStore.getState();
  for (const [tid, state] of Object.entries(states)) {
    if (tid === excludeTabId) continue;
    if (state === "thinking" && tabMetas.get(tid)?.projectPath === projectPath) return true;
  }
  return false;
}

export const useSessionStateStore = create<SessionStateStoreState>(
  (set, get) => ({
    states: {},

    getState: (tabId: string) => {
      return get().states[tabId] ?? "idle";
    },

    onData: (tabId: string, meta?: TabMeta) => {
      if (meta) tabMetas.set(tabId, meta);
      tabsWithOutput.add(tabId);

      // Mark as thinking
      set((state) => ({
        states: { ...state.states, [tabId]: "thinking" },
      }));

      // Bridge to projects store for sidebar spinner
      if (meta && meta.sessionType !== "terminal") {
        useProjectsStore.getState().setProjectThinking(meta.projectPath, true);
      }

      // Clear existing timer and set new one
      const existing = timers.get(tabId);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        // Only transition if still thinking (not exited)
        if (get().states[tabId] === "thinking") {
          set((state) => ({
            states: { ...state.states, [tabId]: "ready" },
          }));

          const storedMeta = tabMetas.get(tabId);
          if (storedMeta && storedMeta.sessionType !== "terminal") {
            if (!isAnyTabThinkingForProject(storedMeta.projectPath, tabId)) {
              useProjectsStore.getState().setProjectThinking(storedMeta.projectPath, false);
            }
          }
        }
        timers.delete(tabId);
      }, READY_TIMEOUT_MS);

      timers.set(tabId, timer);
    },

    onExit: (tabId: string) => {
      const existing = timers.get(tabId);
      if (existing) {
        clearTimeout(existing);
        timers.delete(tabId);
      }
      set((state) => ({
        states: { ...state.states, [tabId]: "exited" },
      }));

      // Bridge to projects store: clear thinking if no other tab thinking
      const meta = tabMetas.get(tabId);
      if (meta && meta.sessionType !== "terminal") {
        if (tabsWithOutput.has(tabId)) {
          const payload: FinishedNotificationPayload = {
            projectPath: meta.projectPath,
            sessionType: meta.sessionType,
            activeProjectPath: useProjectsStore.getState().activeProjectPath,
          };
          void invoke("pty:notify-session-finished", payload);
          useProjectsStore.getState().markProjectNotified(meta.projectPath);
        }
        if (!isAnyTabThinkingForProject(meta.projectPath, tabId)) {
          useProjectsStore.getState().setProjectThinking(meta.projectPath, false);
        }
      }
      tabsWithOutput.delete(tabId);
    },

    cleanup: (tabId: string) => {
      const existing = timers.get(tabId);
      if (existing) {
        clearTimeout(existing);
        timers.delete(tabId);
      }

      // Bridge to projects store: clear thinking if no other tab thinking
      const meta = tabMetas.get(tabId);
      tabMetas.delete(tabId);
      tabsWithOutput.delete(tabId);
      if (meta && meta.sessionType !== "terminal") {
        if (!isAnyTabThinkingForProject(meta.projectPath, tabId)) {
          useProjectsStore.getState().setProjectThinking(meta.projectPath, false);
        }
      }

      set((state) => {
        const { [tabId]: _, ...rest } = state.states;
        return { states: rest };
      });
    },
  })
);
