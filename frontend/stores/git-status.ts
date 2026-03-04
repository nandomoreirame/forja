import { create } from "zustand";
import { invoke } from "@/lib/ipc";

interface GitStatusState {
  statuses: Record<string, string>;
  projectPath: string | null;
  statusesByProject: Record<string, Record<string, string>>;
  _changedDirsByProject: Record<string, Set<string>>;
  fetchStatuses: (projectPath: string) => Promise<void>;
  getFileStatus: (relativePath: string, projectPath?: string) => string | undefined;
  hasChangedChildren: (dirRelativePath: string, projectPath?: string) => boolean;
  clearStatuses: (projectPath?: string) => void;
}

function computeChangedDirs(statuses: Record<string, string>): Set<string> {
  const dirs = new Set<string>();
  for (const filePath of Object.keys(statuses)) {
    let dir = filePath;
    while (dir.includes("/")) {
      dir = dir.substring(0, dir.lastIndexOf("/"));
      if (dirs.has(dir)) break; // parent dirs already added
      dirs.add(dir);
    }
  }
  return dirs;
}

export const useGitStatusStore = create<GitStatusState>((set, get) => ({
  statuses: {},
  projectPath: null,
  statusesByProject: {},
  _changedDirsByProject: {},

  fetchStatuses: async (projectPath: string) => {
    try {
      const result = await invoke<Record<string, string>>(
        "get_git_file_statuses",
        { path: projectPath },
      );
      const data = result ?? {};
      set((state) => ({
        statuses: data,
        projectPath,
        statusesByProject: {
          ...state.statusesByProject,
          [projectPath]: data,
        },
        _changedDirsByProject: {
          ...state._changedDirsByProject,
          [projectPath]: computeChangedDirs(data),
        },
      }));
    } catch {
      set((state) => ({
        statuses: {},
        projectPath,
        statusesByProject: {
          ...state.statusesByProject,
          [projectPath]: {},
        },
        _changedDirsByProject: {
          ...state._changedDirsByProject,
          [projectPath]: new Set(),
        },
      }));
    }
  },

  getFileStatus: (relativePath: string, projectPath?: string) => {
    const { statusesByProject, projectPath: activeProjectPath, statuses } = get();
    const effectiveProjectPath = projectPath ?? activeProjectPath;
    if (!effectiveProjectPath) return statuses[relativePath];
    const map = statusesByProject[effectiveProjectPath];
    if (!map || Object.keys(map).length === 0) return statuses[relativePath];
    return map[relativePath];
  },

  hasChangedChildren: (dirRelativePath: string, projectPath?: string) => {
    const { _changedDirsByProject, statusesByProject, projectPath: activeProjectPath, statuses } = get();
    const effectiveProjectPath = projectPath ?? activeProjectPath;
    const normalized = dirRelativePath.endsWith("/")
      ? dirRelativePath.slice(0, -1)
      : dirRelativePath;

    // Fast path: use pre-computed dir Set (populated by fetchStatuses)
    if (effectiveProjectPath) {
      const dirSet = _changedDirsByProject[effectiveProjectPath];
      if (dirSet) return dirSet.has(normalized);
    }

    // Fallback: linear scan for direct setState usage (e.g. tests)
    let map = statuses;
    if (effectiveProjectPath) {
      const projectMap = statusesByProject[effectiveProjectPath];
      map = projectMap && Object.keys(projectMap).length > 0 ? projectMap : statuses;
    }
    const prefix = normalized + "/";
    return Object.keys(map).some((filePath) => filePath.startsWith(prefix));
  },

  clearStatuses: (projectPath?: string) =>
    set((state) => {
      if (!projectPath) {
        return {
          statuses: {},
          projectPath: null,
          statusesByProject: {},
          _changedDirsByProject: {},
        };
      }

      const nextByProject = { ...state.statusesByProject };
      delete nextByProject[projectPath];
      const nextDirs = { ...state._changedDirsByProject };
      delete nextDirs[projectPath];
      return {
        statuses: state.projectPath === projectPath ? {} : state.statuses,
        projectPath: state.projectPath === projectPath ? null : state.projectPath,
        statusesByProject: nextByProject,
        _changedDirsByProject: nextDirs,
      };
    }),
}));
