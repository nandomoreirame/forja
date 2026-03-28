import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useGitStatusStore, GIT_STATUS_TTL_MS } from "../git-status";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
}));

describe("useGitStatusStore — TTL cache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useGitStatusStore.setState({
      statuses: {},
      projectPath: null,
      statusesByProject: {},
      _changedDirsByProject: {},
      _lastFetchByProject: {},
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("GIT_STATUS_TTL_MS is exported and equals 5000", () => {
    expect(GIT_STATUS_TTL_MS).toBe(5000);
  });

  it("fetchStatuses calls IPC on first call for a project", async () => {
    const mockResult = { "src/App.tsx": "M" };
    const { invoke } = await import("@/lib/ipc");
    vi.mocked(invoke).mockResolvedValue(mockResult);

    await useGitStatusStore.getState().fetchStatuses("/project");

    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith("get_git_file_statuses", {
      path: "/project",
    });
  });

  it("fetchStatuses skips IPC if called again within TTL for the same project", async () => {
    const mockResult = { "src/App.tsx": "M" };
    const { invoke } = await import("@/lib/ipc");
    vi.mocked(invoke).mockResolvedValue(mockResult);

    await useGitStatusStore.getState().fetchStatuses("/project");
    expect(invoke).toHaveBeenCalledTimes(1);

    // Advance time by less than TTL (e.g., 3s)
    vi.advanceTimersByTime(3000);

    await useGitStatusStore.getState().fetchStatuses("/project");
    // Should NOT have called IPC again
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("fetchStatuses calls IPC for a different project regardless of TTL", async () => {
    const mockResultA = { "src/App.tsx": "M" };
    const mockResultB = { "lib/index.ts": "??" };
    const { invoke } = await import("@/lib/ipc");
    vi.mocked(invoke)
      .mockResolvedValueOnce(mockResultA)
      .mockResolvedValueOnce(mockResultB);

    await useGitStatusStore.getState().fetchStatuses("/project-a");
    expect(invoke).toHaveBeenCalledTimes(1);

    // Different project: should fetch immediately
    await useGitStatusStore.getState().fetchStatuses("/project-b");
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(invoke).toHaveBeenLastCalledWith("get_git_file_statuses", {
      path: "/project-b",
    });
  });

  it("fetchStatuses calls IPC after TTL expires", async () => {
    const mockResult = { "src/App.tsx": "M" };
    const { invoke } = await import("@/lib/ipc");
    vi.mocked(invoke).mockResolvedValue(mockResult);

    await useGitStatusStore.getState().fetchStatuses("/project");
    expect(invoke).toHaveBeenCalledTimes(1);

    // Advance time past TTL (5001ms)
    vi.advanceTimersByTime(GIT_STATUS_TTL_MS + 1);

    await useGitStatusStore.getState().fetchStatuses("/project");
    // Should call IPC again because TTL expired
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it("forceFetchStatuses always calls IPC even within TTL", async () => {
    const mockResult = { "src/App.tsx": "M" };
    const { invoke } = await import("@/lib/ipc");
    vi.mocked(invoke).mockResolvedValue(mockResult);

    // First fetch
    await useGitStatusStore.getState().fetchStatuses("/project");
    expect(invoke).toHaveBeenCalledTimes(1);

    // Call forceFetchStatuses immediately (within TTL)
    await useGitStatusStore.getState().forceFetchStatuses("/project");
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(invoke).toHaveBeenLastCalledWith("get_git_file_statuses", {
      path: "/project",
    });
  });

  it("forceFetchStatuses updates state correctly", async () => {
    const initialResult = { "src/App.tsx": "M" };
    const updatedResult = { "src/App.tsx": "M", "new-file.ts": "??" };
    const { invoke } = await import("@/lib/ipc");
    vi.mocked(invoke)
      .mockResolvedValueOnce(initialResult)
      .mockResolvedValueOnce(updatedResult);

    await useGitStatusStore.getState().fetchStatuses("/project");
    expect(useGitStatusStore.getState().statusesByProject["/project"]).toEqual(initialResult);

    await useGitStatusStore.getState().forceFetchStatuses("/project");
    expect(useGitStatusStore.getState().statusesByProject["/project"]).toEqual(updatedResult);
  });

  it("clearStatuses resets the TTL timestamp for a specific project", async () => {
    const mockResult = { "src/App.tsx": "M" };
    const { invoke } = await import("@/lib/ipc");
    vi.mocked(invoke).mockResolvedValue(mockResult);

    // Fetch to populate cache
    await useGitStatusStore.getState().fetchStatuses("/project");
    expect(invoke).toHaveBeenCalledTimes(1);

    // Clear the project (should reset TTL)
    useGitStatusStore.getState().clearStatuses("/project");

    // Now fetching again (within original TTL window) should call IPC
    await useGitStatusStore.getState().fetchStatuses("/project");
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it("clearStatuses without args resets all TTL timestamps", async () => {
    const mockResult = { "src/App.tsx": "M" };
    const { invoke } = await import("@/lib/ipc");
    vi.mocked(invoke).mockResolvedValue(mockResult);

    // Fetch two projects
    await useGitStatusStore.getState().fetchStatuses("/project-a");
    await useGitStatusStore.getState().fetchStatuses("/project-b");
    expect(invoke).toHaveBeenCalledTimes(2);

    // Clear all
    useGitStatusStore.getState().clearStatuses();

    // Both projects should fetch again
    await useGitStatusStore.getState().fetchStatuses("/project-a");
    await useGitStatusStore.getState().fetchStatuses("/project-b");
    expect(invoke).toHaveBeenCalledTimes(4);
  });

  it("_lastFetchByProject is updated after a successful fetch", async () => {
    const mockResult = { "src/App.tsx": "M" };
    const { invoke } = await import("@/lib/ipc");
    vi.mocked(invoke).mockResolvedValue(mockResult);

    const before = Date.now();
    await useGitStatusStore.getState().fetchStatuses("/project");
    const after = Date.now();

    const lastFetch = useGitStatusStore.getState()._lastFetchByProject["/project"];
    expect(lastFetch).toBeGreaterThanOrEqual(before);
    expect(lastFetch).toBeLessThanOrEqual(after);
  });

  it("_lastFetchByProject is updated after forceFetchStatuses", async () => {
    const mockResult = { "src/App.tsx": "M" };
    const { invoke } = await import("@/lib/ipc");
    vi.mocked(invoke).mockResolvedValue(mockResult);

    await useGitStatusStore.getState().fetchStatuses("/project");
    const firstFetchTime = useGitStatusStore.getState()._lastFetchByProject["/project"];

    vi.advanceTimersByTime(1000);

    await useGitStatusStore.getState().forceFetchStatuses("/project");
    const secondFetchTime = useGitStatusStore.getState()._lastFetchByProject["/project"];

    expect(secondFetchTime).toBeGreaterThan(firstFetchTime);
  });
});
