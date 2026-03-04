import { create } from "zustand";
import { invoke } from "@/lib/ipc";

interface GitStatusState {
  statuses: Record<string, string>;
  projectPath: string | null;
  fetchStatuses: (projectPath: string) => Promise<void>;
  getFileStatus: (relativePath: string) => string | undefined;
  hasChangedChildren: (dirRelativePath: string) => boolean;
  clearStatuses: () => void;
}

export const useGitStatusStore = create<GitStatusState>((set, get) => ({
  statuses: {},
  projectPath: null,

  fetchStatuses: async (projectPath: string) => {
    try {
      const result = await invoke<Record<string, string>>(
        "get_git_file_statuses",
        { path: projectPath },
      );
      set({ statuses: result ?? {}, projectPath });
    } catch {
      set({ statuses: {}, projectPath });
    }
  },

  getFileStatus: (relativePath: string) => {
    return get().statuses[relativePath];
  },

  hasChangedChildren: (dirRelativePath: string) => {
    const { statuses } = get();
    const prefix = dirRelativePath.endsWith("/")
      ? dirRelativePath
      : `${dirRelativePath}/`;
    return Object.keys(statuses).some((filePath) =>
      filePath.startsWith(prefix),
    );
  },

  clearStatuses: () => set({ statuses: {}, projectPath: null }),
}));
