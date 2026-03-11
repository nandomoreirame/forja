import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGitDiffStore } from "../git-diff";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
}));

describe("useGitDiffStore", () => {
  beforeEach(() => {
    useGitDiffStore.getState().reset();
    vi.clearAllMocks();
  });

  it("loads changed files and computes project counters", async () => {
    const { invoke } = await import("@/lib/ipc");
    vi.mocked(invoke).mockResolvedValue([
      { path: "src/a.ts", status: "M", staged: false, unstaged: true },
      { path: "src/b.ts", status: "A", staged: true, unstaged: false },
      { path: "src/c.ts", status: "D", staged: false, unstaged: true },
      { path: "src/d.ts", status: "??", staged: false, unstaged: true },
    ]);

    await useGitDiffStore.getState().fetchChangedFiles("/repo-a");

    const state = useGitDiffStore.getState();
    expect(state.changedFilesByProject["/repo-a"]).toHaveLength(4);
    expect(state.projectCountersByPath["/repo-a"]).toEqual({
      modified: 1,
      added: 1,
      deleted: 1,
      untracked: 1,
      total: 4,
    });
  });

  it("selects file and loads diff payload", async () => {
    const { invoke } = await import("@/lib/ipc");
    vi.mocked(invoke).mockResolvedValueOnce([
      { path: "src/a.ts", status: "M", staged: false, unstaged: true },
    ]);
    vi.mocked(invoke).mockResolvedValueOnce({
      path: "src/a.ts",
      status: "M",
      patch: "diff --git a/src/a.ts b/src/a.ts",
      truncated: false,
      isBinary: false,
    });

    await useGitDiffStore.getState().fetchChangedFiles("/repo-a");
    await useGitDiffStore.getState().selectChangedFile("/repo-a", "src/a.ts");

    const state = useGitDiffStore.getState();
    expect(state.selectedProjectPath).toBe("/repo-a");
    expect(state.selectedPath).toBe("src/a.ts");
    expect(state.selectedDiff?.patch).toContain("diff --git");
  });

  it("refreshes only the requested project", async () => {
    const { invoke } = await import("@/lib/ipc");
    vi.mocked(invoke)
      .mockResolvedValueOnce([{ path: "a.ts", status: "M", staged: false, unstaged: true }])
      .mockResolvedValueOnce([{ path: "b.ts", status: "A", staged: true, unstaged: false }]);

    await useGitDiffStore.getState().fetchChangedFiles("/repo-a");
    await useGitDiffStore.getState().refresh("/repo-b");

    const state = useGitDiffStore.getState();
    expect(state.changedFilesByProject["/repo-a"]).toHaveLength(1);
    expect(state.changedFilesByProject["/repo-b"]).toHaveLength(1);
  });

  it("handles loading errors gracefully", async () => {
    const { invoke } = await import("@/lib/ipc");
    vi.mocked(invoke).mockRejectedValue(new Error("git failed"));

    await useGitDiffStore.getState().fetchChangedFiles("/repo-a");

    const state = useGitDiffStore.getState();
    expect(state.changedFilesByProject["/repo-a"]).toEqual([]);
    expect(state.error).toBe("git failed");
    expect(state.isLoadingFiles).toBe(false);
  });

  describe("saveDiffForProject", () => {
    it("saves current selected diff state keyed by project path", async () => {
      const { invoke } = await import("@/lib/ipc");
      vi.mocked(invoke).mockResolvedValueOnce({
        path: "src/a.ts",
        status: "M",
        patch: "diff content",
        truncated: false,
        isBinary: false,
        originalContent: "old",
        modifiedContent: "new",
      });
      vi.mocked(invoke).mockResolvedValueOnce("old content");
      vi.mocked(invoke).mockResolvedValueOnce({ content: "new content" });

      useGitDiffStore.setState({
        selectedProjectPath: "/repo-a",
        selectedPath: "src/a.ts",
        selectedDiff: {
          path: "src/a.ts",
          status: "M",
          patch: "diff content",
          truncated: false,
          isBinary: false,
          originalContent: "old",
          modifiedContent: "new",
        },
      });

      useGitDiffStore.getState().saveDiffForProject("/repo-a");

      const { diffByProject } = useGitDiffStore.getState();
      expect(diffByProject["/repo-a"]).toEqual({
        selectedPath: "src/a.ts",
        selectedDiff: {
          path: "src/a.ts",
          status: "M",
          patch: "diff content",
          truncated: false,
          isBinary: false,
          originalContent: "old",
          modifiedContent: "new",
        },
      });
    });

    it("saves null when no file is selected", () => {
      useGitDiffStore.setState({
        selectedProjectPath: null,
        selectedPath: null,
        selectedDiff: null,
      });

      useGitDiffStore.getState().saveDiffForProject("/repo-a");

      const { diffByProject } = useGitDiffStore.getState();
      expect(diffByProject["/repo-a"]).toBeNull();
    });

    it("does not overwrite saved state for other projects", () => {
      useGitDiffStore.setState({
        selectedProjectPath: "/repo-a",
        selectedPath: "src/a.ts",
        selectedDiff: {
          path: "src/a.ts",
          status: "M",
          patch: "A diff",
          truncated: false,
          isBinary: false,
          originalContent: "",
          modifiedContent: "",
        },
        diffByProject: {
          "/repo-b": {
            selectedPath: "src/b.ts",
            selectedDiff: null,
          },
        },
      });

      useGitDiffStore.getState().saveDiffForProject("/repo-a");

      const { diffByProject } = useGitDiffStore.getState();
      expect(diffByProject["/repo-b"]).toBeDefined();
      expect(diffByProject["/repo-b"]?.selectedPath).toBe("src/b.ts");
    });
  });

  describe("restoreDiffForProject", () => {
    it("restores saved diff state for a project", () => {
      useGitDiffStore.setState({
        selectedProjectPath: null,
        selectedPath: null,
        selectedDiff: null,
        diffByProject: {
          "/repo-a": {
            selectedPath: "src/a.ts",
            selectedDiff: {
              path: "src/a.ts",
              status: "M",
              patch: "saved diff",
              truncated: false,
              isBinary: false,
              originalContent: "old",
              modifiedContent: "new",
            },
          },
        },
      });

      useGitDiffStore.getState().restoreDiffForProject("/repo-a");

      const state = useGitDiffStore.getState();
      expect(state.selectedProjectPath).toBe("/repo-a");
      expect(state.selectedPath).toBe("src/a.ts");
      expect(state.selectedDiff?.patch).toBe("saved diff");
    });

    it("clears selection when saved state is null", () => {
      useGitDiffStore.setState({
        selectedProjectPath: "/repo-old",
        selectedPath: "old/file.ts",
        selectedDiff: {
          path: "old/file.ts",
          status: "M",
          patch: "old diff",
          truncated: false,
          isBinary: false,
          originalContent: "",
          modifiedContent: "",
        },
        diffByProject: { "/repo-a": null },
      });

      useGitDiffStore.getState().restoreDiffForProject("/repo-a");

      const state = useGitDiffStore.getState();
      expect(state.selectedProjectPath).toBeNull();
      expect(state.selectedPath).toBeNull();
      expect(state.selectedDiff).toBeNull();
    });

    it("clears selection when no saved state exists for project", () => {
      useGitDiffStore.setState({
        selectedProjectPath: "/repo-old",
        selectedPath: "old/file.ts",
        selectedDiff: {
          path: "old/file.ts",
          status: "M",
          patch: "old diff",
          truncated: false,
          isBinary: false,
          originalContent: "",
          modifiedContent: "",
        },
        diffByProject: {},
      });

      useGitDiffStore.getState().restoreDiffForProject("/repo-unknown");

      const state = useGitDiffStore.getState();
      expect(state.selectedProjectPath).toBeNull();
      expect(state.selectedPath).toBeNull();
      expect(state.selectedDiff).toBeNull();
    });

    it("round-trip: save repo-a, switch to repo-b, save repo-b, restore repo-a", () => {
      // Start at repo-a with a file open
      useGitDiffStore.setState({
        selectedProjectPath: "/repo-a",
        selectedPath: "src/a.ts",
        selectedDiff: {
          path: "src/a.ts",
          status: "M",
          patch: "A diff content",
          truncated: false,
          isBinary: false,
          originalContent: "a old",
          modifiedContent: "a new",
        },
        diffByProject: {},
      });

      // Save repo-a's state
      useGitDiffStore.getState().saveDiffForProject("/repo-a");

      // Switch to repo-b with a different file
      useGitDiffStore.setState({
        selectedProjectPath: "/repo-b",
        selectedPath: "src/b.ts",
        selectedDiff: {
          path: "src/b.ts",
          status: "A",
          patch: "B diff content",
          truncated: false,
          isBinary: false,
          originalContent: "",
          modifiedContent: "b new",
        },
      });

      // Save repo-b's state
      useGitDiffStore.getState().saveDiffForProject("/repo-b");

      // Now restore repo-a
      useGitDiffStore.getState().restoreDiffForProject("/repo-a");

      const state = useGitDiffStore.getState();
      expect(state.selectedProjectPath).toBe("/repo-a");
      expect(state.selectedPath).toBe("src/a.ts");
      expect(state.selectedDiff?.patch).toBe("A diff content");
    });
  });
});
