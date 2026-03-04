import { describe, it, expect, vi, beforeEach } from "vitest";
import { useGitStatusStore } from "../git-status";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
}));

describe("useGitStatusStore", () => {
  beforeEach(() => {
    useGitStatusStore.setState({
      statuses: {},
      projectPath: null,
      statusesByProject: {},
    });
    vi.clearAllMocks();
  });

  it("has correct initial state", () => {
    const state = useGitStatusStore.getState();
    expect(state.statuses).toEqual({});
    expect(state.projectPath).toBeNull();
    expect(state.statusesByProject).toEqual({});
  });

  it("getFileStatus returns undefined when no statuses loaded", () => {
    expect(useGitStatusStore.getState().getFileStatus("src/App.tsx")).toBeUndefined();
  });

  it("getFileStatus returns status for known file", () => {
    useGitStatusStore.setState({
      statuses: { "src/App.tsx": "M", "newfile.ts": "??" },
      projectPath: "/project",
    });

    expect(useGitStatusStore.getState().getFileStatus("src/App.tsx")).toBe("M");
    expect(useGitStatusStore.getState().getFileStatus("newfile.ts")).toBe("??");
  });

  it("getFileStatus returns undefined for unknown file", () => {
    useGitStatusStore.setState({
      statuses: { "src/App.tsx": "M" },
      projectPath: "/project",
    });

    expect(useGitStatusStore.getState().getFileStatus("other.ts")).toBeUndefined();
  });

  it("hasChangedChildren returns true when directory has changed files", () => {
    useGitStatusStore.setState({
      statuses: { "src/App.tsx": "M", "src/utils/helper.ts": "??" },
      projectPath: "/project",
    });

    expect(useGitStatusStore.getState().hasChangedChildren("src")).toBe(true);
  });

  it("hasChangedChildren returns false when directory has no changed files", () => {
    useGitStatusStore.setState({
      statuses: { "lib/index.ts": "M" },
      projectPath: "/project",
    });

    expect(useGitStatusStore.getState().hasChangedChildren("src")).toBe(false);
  });

  it("hasChangedChildren handles trailing slash correctly", () => {
    useGitStatusStore.setState({
      statuses: { "src/App.tsx": "M" },
      projectPath: "/project",
    });

    expect(useGitStatusStore.getState().hasChangedChildren("src/")).toBe(true);
  });

  it("clearStatuses resets state", () => {
    useGitStatusStore.setState({
      statuses: { "src/App.tsx": "M" },
      projectPath: "/project",
    });

    useGitStatusStore.getState().clearStatuses();

    expect(useGitStatusStore.getState().statuses).toEqual({});
    expect(useGitStatusStore.getState().projectPath).toBeNull();
  });

  it("fetchStatuses calls IPC and stores result", async () => {
    const mockResult = { "src/App.tsx": "M", "README.md": "??" };
    const { invoke } = await import("@/lib/ipc");
    vi.mocked(invoke).mockResolvedValue(mockResult);

    await useGitStatusStore.getState().fetchStatuses("/project");

    expect(invoke).toHaveBeenCalledWith("get_git_file_statuses", {
      path: "/project",
    });
    expect(useGitStatusStore.getState().statuses).toEqual(mockResult);
    expect(useGitStatusStore.getState().projectPath).toBe("/project");
    expect(useGitStatusStore.getState().statusesByProject["/project"]).toEqual(mockResult);
  });

  it("fetchStatuses handles error gracefully", async () => {
    const { invoke } = await import("@/lib/ipc");
    vi.mocked(invoke).mockRejectedValue(new Error("IPC error"));

    await useGitStatusStore.getState().fetchStatuses("/project");

    expect(useGitStatusStore.getState().statuses).toEqual({});
    expect(useGitStatusStore.getState().projectPath).toBe("/project");
  });
});
