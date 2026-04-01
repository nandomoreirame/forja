import { invoke } from "@/lib/ipc";
import type { SessionType } from "@/lib/cli-registry";
import type { TerminalTab } from "@/stores/terminal-tabs";
import { create } from "zustand";
import { useProjectsStore } from "./projects";
import { useTerminalTabsStore } from "./terminal-tabs";

export interface SavedSession {
  id: string;
  sessionType: SessionType;
  customName?: string;
  cliSessionId?: string;
  savedAt: string;
}

interface SavedSessionsState {
  sessions: SavedSession[];
  loading: boolean;
  loadSessions: (projectPath: string | null) => Promise<void>;
  saveSession: (tab: TerminalTab) => Promise<void>;
  restoreSession: (id: string) => Promise<boolean>;
  restoreLastSaved: () => Promise<boolean>;
  deleteSession: (id: string) => Promise<void>;
}

export const useSavedSessionsStore = create<SavedSessionsState>((set, get) => ({
  sessions: [],
  loading: false,

  loadSessions: async (projectPath) => {
    if (!projectPath) {
      set({ sessions: [], loading: false });
      return;
    }

    set({ loading: true });
    try {
      const sessions = await invoke<SavedSession[]>("saved_sessions:load", {
        projectPath,
      });
      set({ sessions, loading: false });
    } catch {
      set({ sessions: [], loading: false });
    }
  },

  saveSession: async (tab) => {
    const projectPath = tab.path || useProjectsStore.getState().activeProjectPath;
    if (!projectPath) return;

    const entry: SavedSession = {
      id: globalThis.crypto?.randomUUID?.() ?? `saved-${Date.now()}`,
      sessionType: tab.sessionType,
      ...(tab.customName ? { customName: tab.customName } : {}),
      ...(tab.cliSessionId ? { cliSessionId: tab.cliSessionId } : {}),
      savedAt: new Date().toISOString(),
    };

    await invoke("saved_sessions:save", { projectPath, entry });

    if (useProjectsStore.getState().activeProjectPath === projectPath) {
      set((state) => ({ sessions: [...state.sessions, entry] }));
    }
  },

  restoreSession: async (id) => {
    const projectPath = useProjectsStore.getState().activeProjectPath;
    if (!projectPath) return false;

    const entry = get().sessions.find((session) => session.id === id);
    if (!entry) return false;

    const tabsStore = useTerminalTabsStore.getState();
    const tabId = tabsStore.nextTabId();

    // Register tab WITHOUT creating the layout block yet.
    // This prevents TerminalSession from mounting before cliSessionId is set,
    // which would cause it to generate a new session ID instead of using --resume.
    tabsStore.registerTab(tabId, projectPath, entry.sessionType, entry.customName);
    if (entry.cliSessionId) {
      tabsStore.setCliSessionId(tabId, entry.cliSessionId);
    }

    // Now set active and create the layout block — TerminalSession will mount
    // and find the cliSessionId already present, triggering --resume correctly.
    tabsStore.setActiveTab(tabId);
    const { useTilingLayoutStore } = await import("./tiling-layout");
    useTilingLayoutStore.getState().addBlock(
      { type: "terminal", tabId, sessionType: entry.sessionType },
      undefined,
      tabId,
    );

    await invoke("saved_sessions:delete", { projectPath, id });
    set((state) => ({
      sessions: state.sessions.filter((session) => session.id !== id),
    }));

    return true;
  },

  restoreLastSaved: async () => {
    const [latest] = [...get().sessions].sort(
      (left, right) =>
        new Date(right.savedAt).getTime() - new Date(left.savedAt).getTime(),
    );

    if (!latest) return false;
    return get().restoreSession(latest.id);
  },

  deleteSession: async (id) => {
    const projectPath = useProjectsStore.getState().activeProjectPath;
    if (!projectPath) return;

    await invoke("saved_sessions:delete", { projectPath, id });
    set((state) => ({
      sessions: state.sessions.filter((session) => session.id !== id),
    }));
  },
}));

let lastProjectPath = useProjectsStore.getState().activeProjectPath;

useProjectsStore.subscribe((state) => {
  if (state.activeProjectPath === lastProjectPath) return;
  lastProjectPath = state.activeProjectPath;
  void useSavedSessionsStore.getState().loadSessions(state.activeProjectPath);
});

void useSavedSessionsStore.getState().loadSessions(lastProjectPath);
