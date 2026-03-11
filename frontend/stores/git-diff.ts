import { invoke } from "@/lib/ipc";
import type {
  GitChangedFile,
  GitDiffResult,
  GitProjectCounters,
} from "@/lib/git-diff-types";
import { create } from "zustand";

function emptyCounters(): GitProjectCounters {
  return { modified: 0, added: 0, deleted: 0, untracked: 0, total: 0 };
}

function computeCounters(files: GitChangedFile[]): GitProjectCounters {
  const counters = emptyCounters();

  for (const file of files) {
    const status = file.status;
    if (status === "A") counters.added += 1;
    else if (status === "D") counters.deleted += 1;
    else if (status === "??") counters.untracked += 1;
    else counters.modified += 1;
    counters.total += 1;
  }

  return counters;
}

interface DiffSelectionSnapshot {
  selectedPath: string;
  selectedDiff: GitDiffResult | null;
}

interface GitDiffState {
  changedFilesByProject: Record<string, GitChangedFile[]>;
  projectCountersByPath: Record<string, GitProjectCounters>;
  selectedProjectPath: string | null;
  selectedPath: string | null;
  selectedDiff: GitDiffResult | null;
  diffMode: "split" | "unified";
  isLoadingFiles: boolean;
  isLoadingDiff: boolean;
  error: string | null;
  diffByProject: Record<string, DiffSelectionSnapshot | null>;

  fetchChangedFiles: (projectPath: string) => Promise<void>;
  selectChangedFile: (projectPath: string, relativePath: string) => Promise<void>;
  setDiffMode: (mode: "split" | "unified") => void;
  refresh: (projectPath: string) => Promise<void>;
  clearSelection: () => void;
  saveDiffForProject: (projectPath: string) => void;
  restoreDiffForProject: (projectPath: string) => void;
  reset: () => void;
}

export const useGitDiffStore = create<GitDiffState>((set, get) => ({
  changedFilesByProject: {},
  projectCountersByPath: {},
  selectedProjectPath: null,
  selectedPath: null,
  selectedDiff: null,
  diffMode: "split",
  isLoadingFiles: false,
  isLoadingDiff: false,
  error: null,
  diffByProject: {},

  fetchChangedFiles: async (projectPath: string) => {
    set({ isLoadingFiles: true, error: null });
    try {
      const files = await invoke<GitChangedFile[]>("get_git_changed_files", {
        path: projectPath,
      });
      const safeFiles = files ?? [];
      set((state) => ({
        isLoadingFiles: false,
        changedFilesByProject: {
          ...state.changedFilesByProject,
          [projectPath]: safeFiles,
        },
        projectCountersByPath: {
          ...state.projectCountersByPath,
          [projectPath]: computeCounters(safeFiles),
        },
      }));
    } catch (error) {
      set((state) => ({
        isLoadingFiles: false,
        error: error instanceof Error ? error.message : "Failed to load git changes",
        changedFilesByProject: {
          ...state.changedFilesByProject,
          [projectPath]: [],
        },
        projectCountersByPath: {
          ...state.projectCountersByPath,
          [projectPath]: emptyCounters(),
        },
      }));
    }
  },

  selectChangedFile: async (projectPath: string, relativePath: string) => {
    set({
      selectedProjectPath: projectPath,
      selectedPath: relativePath,
      isLoadingDiff: true,
      error: null,
    });
    try {
      const [diffResult, originalContent, fileContent] = await Promise.all([
        invoke<GitDiffResult>("get_git_file_diff", {
          path: projectPath,
          relativePath,
          stage: "combined",
        }),
        invoke<string>("get_git_file_content_at_head", {
          path: projectPath,
          relativePath,
        }),
        invoke<{ content: string }>("read_file_command", {
          path: `${projectPath}/${relativePath}`,
          maxSizeMb: 10,
        }).then((r) => r.content).catch(() => ""),
      ]);
      set({
        selectedDiff: {
          ...diffResult,
          originalContent,
          modifiedContent: fileContent,
        },
        isLoadingDiff: false,
      });
    } catch (error) {
      set({
        selectedDiff: null,
        isLoadingDiff: false,
        error: error instanceof Error ? error.message : "Failed to load file diff",
      });
    }
  },

  setDiffMode: (mode) => set({ diffMode: mode }),

  refresh: async (projectPath: string) => {
    await get().fetchChangedFiles(projectPath);
  },

  clearSelection: () =>
    set({
      selectedProjectPath: null,
      selectedPath: null,
      selectedDiff: null,
      isLoadingDiff: false,
      error: null,
    }),

  saveDiffForProject: (projectPath: string) => {
    const { selectedPath, selectedDiff, diffByProject } = get();
    if (selectedPath) {
      set({
        diffByProject: {
          ...diffByProject,
          [projectPath]: { selectedPath, selectedDiff },
        },
      });
    } else {
      set({
        diffByProject: {
          ...diffByProject,
          [projectPath]: null,
        },
      });
    }
  },

  restoreDiffForProject: (projectPath: string) => {
    const { diffByProject } = get();
    const saved = diffByProject[projectPath];
    if (saved) {
      set({
        selectedProjectPath: projectPath,
        selectedPath: saved.selectedPath,
        selectedDiff: saved.selectedDiff,
        isLoadingDiff: false,
        error: null,
      });
    } else {
      set({
        selectedProjectPath: null,
        selectedPath: null,
        selectedDiff: null,
        isLoadingDiff: false,
        error: null,
      });
    }
  },

  reset: () =>
    set({
      changedFilesByProject: {},
      projectCountersByPath: {},
      selectedProjectPath: null,
      selectedPath: null,
      selectedDiff: null,
      diffMode: "split",
      isLoadingFiles: false,
      isLoadingDiff: false,
      error: null,
      diffByProject: {},
    }),
}));
