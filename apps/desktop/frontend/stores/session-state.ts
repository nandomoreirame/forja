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
  tabId: string;
}

interface SessionStateStoreState {
  states: Record<string, SessionState>;

  getState: (tabId: string) => SessionState;
  onData: (tabId: string, meta?: TabMeta) => void;
  onExit: (tabId: string) => void;
  cleanup: (tabId: string) => void;
  markTabSeen: (tabId: string) => void;
  /** @internal test-only: clears all internal maps/sets */
  _resetInternals: () => void;
}

// Debounce timers per tab (kept outside store to avoid serialization issues)
const timers = new Map<string, ReturnType<typeof setTimeout>>();
// Metadata per tab for notification context
const tabMetas = new Map<string, TabMeta>();
const tabsWithOutput = new Set<string>();
// Tracks tabs that have already sent a notification (prevents re-notifying on repeated thinking→ready cycles)
const notifiedTabs = new Set<string>();

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
              if (!notifiedTabs.has(tabId)) {
                notifiedTabs.add(tabId);
                useProjectsStore.getState().markProjectNotified(storedMeta.projectPath, "Session finished");
                const payload: FinishedNotificationPayload = {
                  projectPath: storedMeta.projectPath,
                  sessionType: storedMeta.sessionType,
                  activeProjectPath: useProjectsStore.getState().activeProjectPath,
                  tabId,
                };
                void invoke("pty:notify-session-finished", payload);
              }
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
      notifiedTabs.delete(tabId);
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

    markTabSeen: (tabId: string) => {
      notifiedTabs.delete(tabId);
    },

    _resetInternals: () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
      tabMetas.clear();
      tabsWithOutput.clear();
      notifiedTabs.clear();
    },
  })
);
