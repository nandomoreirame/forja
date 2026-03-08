import { create } from "zustand";
import { invoke } from "@/lib/ipc";

// Catppuccin Mocha palette colors for project icons (excluding too-dark/light)
const PROJECT_COLORS = [
  "#cba6f7", // mauve (brand)
  "#f38ba8", // red
  "#fab387", // peach
  "#f9e2af", // yellow
  "#a6e3a1", // green
  "#94e2d5", // teal
  "#89dceb", // sky
  "#89b4fa", // blue
  "#b4befe", // lavender
  "#f5c2e7", // pink
];

function basename(p: string): string {
  return p.replace(/\\/g, "/").split("/").filter(Boolean).pop() ?? p;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export type SessionState = "running" | "exited" | "idle";

export interface Project {
  path: string;
  name: string;
  lastOpened: string;
  iconPath?: string | null;
}

interface ProjectsState {
  projects: Project[];
  activeProjectPath: string | null;
  loading: boolean;
  sessionStates: Record<string, SessionState>;
  unreadProjects: Set<string>;

  loadProjects: () => Promise<void>;
  addProject: (projectPath: string) => Promise<void>;
  removeProject: (projectPath: string) => void;
  setActiveProject: (projectPath: string) => void;
  switchToProject: (projectPath: string) => Promise<void>;
  loadProjectIcon: (projectPath: string) => Promise<void>;
  updateProject: (projectPath: string, updates: { name?: string; iconPath?: string | null }) => void;
  getProjectInitial: (nameOrPath: string) => string;
  getProjectColor: (nameOrPath: string) => string;
  setProjectSessionState: (projectPath: string, state: SessionState) => void;
  markProjectAsRead: (projectPath: string) => void;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  activeProjectPath: null,
  loading: false,
  sessionStates: {},
  unreadProjects: new Set<string>(),

  loadProjects: async () => {
    set({ loading: true });
    try {
      const raw = await invoke<Array<{ path: string; name: string; last_opened: string }>>(
        "get_recent_projects"
      );
      const projects: Project[] = (raw ?? []).map((p) => ({
        path: p.path,
        name: p.name || basename(p.path),
        lastOpened: p.last_opened,
        iconPath: null,
      }));
      set({ projects, loading: false });
      // Load icons for all projects (non-blocking, fire-and-forget)
      for (const p of projects) {
        get().loadProjectIcon(p.path).catch(() => {});
      }
    } catch {
      set({ loading: false });
    }
  },

  addProject: async (projectPath: string) => {
    const name = basename(projectPath);
    await invoke("add_recent_project", { path: projectPath });
    const existing = get().projects.find((p) => p.path === projectPath);
    if (!existing) {
      const newProject: Project = {
        path: projectPath,
        name,
        lastOpened: new Date().toISOString(),
        iconPath: null,
      };
      set((state) => ({ projects: [newProject, ...state.projects] }));
    }
    set({ activeProjectPath: projectPath });
    // Load icon asynchronously (non-blocking)
    get().loadProjectIcon(projectPath).catch(() => {});
  },

  removeProject: (projectPath: string) => {
    const { projects, activeProjectPath } = get();
    const newProjects = projects.filter((p) => p.path !== projectPath);
    let newActive = activeProjectPath;
    if (activeProjectPath === projectPath) {
      newActive = newProjects[0]?.path ?? null;
    }
    set({ projects: newProjects, activeProjectPath: newActive });
    // Persist removal to disk
    invoke("remove_recent_project", { path: projectPath }).catch(() => {});
  },

  setActiveProject: (projectPath: string) => {
    set({ activeProjectPath: projectPath });
  },

  switchToProject: async (projectPath: string) => {
    const previousPath = get().activeProjectPath;
    set({ activeProjectPath: projectPath });
    get().markProjectAsRead(projectPath);

    // Save/restore terminal tabs per project
    const { useTerminalTabsStore } = await import("./terminal-tabs");
    const tabsStore = useTerminalTabsStore.getState();
    if (previousPath && previousPath !== projectPath) {
      tabsStore.saveActiveTabForProject(previousPath);
    }
    tabsStore.restoreActiveTabForProject(projectPath);

    const { useFileTreeStore } = await import("./file-tree");
    await useFileTreeStore.getState().openProjectPath(projectPath);
    // Load icon if not already loaded
    const project = get().projects.find((p) => p.path === projectPath);
    if (project && project.iconPath === null) {
      await get().loadProjectIcon(projectPath);
    }
  },

  updateProject: (projectPath, updates) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.path === projectPath ? { ...p, ...updates } : p
      ),
    }));
  },

  loadProjectIcon: async (projectPath: string) => {
    try {
      const iconPath = await invoke<string | null>("detect_project_icon", { path: projectPath });
      set((state) => ({
        projects: state.projects.map((p) =>
          p.path === projectPath ? { ...p, iconPath: iconPath ?? null } : p
        ),
      }));
    } catch {
      // Non-fatal: keep letter icon
    }
  },

  getProjectInitial: (nameOrPath: string) => {
    const name = basename(nameOrPath);
    return (name[0] ?? "?").toUpperCase();
  },

  getProjectColor: (nameOrPath: string) => {
    const name = basename(nameOrPath);
    const index = hashString(name) % PROJECT_COLORS.length;
    return PROJECT_COLORS[index];
  },

  setProjectSessionState: (projectPath, state) => {
    set((s) => {
      const newUnread = new Set(s.unreadProjects);
      if (state === "exited" && s.activeProjectPath !== projectPath) {
        newUnread.add(projectPath);
      }
      return {
        sessionStates: { ...s.sessionStates, [projectPath]: state },
        unreadProjects: newUnread,
      };
    });
  },

  markProjectAsRead: (projectPath) => {
    set((s) => {
      const newUnread = new Set(s.unreadProjects);
      newUnread.delete(projectPath);
      return { unreadProjects: newUnread };
    });
  },
}));
