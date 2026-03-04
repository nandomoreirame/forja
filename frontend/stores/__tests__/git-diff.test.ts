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
});
