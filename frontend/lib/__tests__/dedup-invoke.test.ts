import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@/lib/ipc";
import { dedupInvoke } from "../dedup-invoke";

const mockInvoke = vi.mocked(invoke);

describe("dedupInvoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the result from invoke", async () => {
    mockInvoke.mockResolvedValueOnce({ files: ["a.ts"] });

    const result = await dedupInvoke("get_git_file_statuses", { path: "/foo" });

    expect(result).toEqual({ files: ["a.ts"] });
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockInvoke).toHaveBeenCalledWith("get_git_file_statuses", { path: "/foo" });
  });

  it("two concurrent calls with same args return the same promise (deduplication)", () => {
    let resolveFirst!: (value: unknown) => void;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    mockInvoke.mockReturnValueOnce(firstPromise as Promise<unknown>);

    const promise1 = dedupInvoke("get_git_file_statuses", { path: "/foo" });
    const promise2 = dedupInvoke("get_git_file_statuses", { path: "/foo" });

    expect(promise1).toBe(promise2);
    expect(mockInvoke).toHaveBeenCalledTimes(1);

    resolveFirst({ files: [] });
  });

  it("calls with different args create separate promises", () => {
    let resolveFirst!: (value: unknown) => void;
    let resolveSecond!: (value: unknown) => void;

    const firstPromise = new Promise((resolve) => { resolveFirst = resolve; });
    const secondPromise = new Promise((resolve) => { resolveSecond = resolve; });

    mockInvoke
      .mockReturnValueOnce(firstPromise as Promise<unknown>)
      .mockReturnValueOnce(secondPromise as Promise<unknown>);

    const promise1 = dedupInvoke("get_git_file_statuses", { path: "/foo" });
    const promise2 = dedupInvoke("get_git_file_statuses", { path: "/bar" });

    expect(promise1).not.toBe(promise2);
    expect(mockInvoke).toHaveBeenCalledTimes(2);

    resolveFirst({});
    resolveSecond({});
  });

  it("after a call resolves, a new call with same args creates a new promise", async () => {
    mockInvoke
      .mockResolvedValueOnce("first-result")
      .mockResolvedValueOnce("second-result");

    const result1 = await dedupInvoke<string>("get_git_branch", { path: "/repo" });
    expect(result1).toBe("first-result");
    expect(mockInvoke).toHaveBeenCalledTimes(1);

    // After first resolved, next call should fire a new invoke
    const result2 = await dedupInvoke<string>("get_git_branch", { path: "/repo" });
    expect(result2).toBe("second-result");
    expect(mockInvoke).toHaveBeenCalledTimes(2);
  });

  it("after a call rejects, a new call with same args creates a new promise (cache cleared on error)", async () => {
    mockInvoke
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce("recovered-result");

    await expect(dedupInvoke("get_git_branch", { path: "/repo" })).rejects.toThrow("network error");
    expect(mockInvoke).toHaveBeenCalledTimes(1);

    // Cache should be cleared after rejection
    const result = await dedupInvoke<string>("get_git_branch", { path: "/repo" });
    expect(result).toBe("recovered-result");
    expect(mockInvoke).toHaveBeenCalledTimes(2);
  });

  it("calls with no args are also deduplicated", () => {
    let resolve!: (value: unknown) => void;
    const pending = new Promise((r) => { resolve = r; });
    mockInvoke.mockReturnValueOnce(pending as Promise<unknown>);

    const promise1 = dedupInvoke("get_system_info");
    const promise2 = dedupInvoke("get_system_info");

    expect(promise1).toBe(promise2);
    expect(mockInvoke).toHaveBeenCalledTimes(1);

    resolve({});
  });

  it("calls with different channels but same args create separate promises", () => {
    let resolveA!: (value: unknown) => void;
    let resolveB!: (value: unknown) => void;

    const promiseA = new Promise((r) => { resolveA = r; });
    const promiseB = new Promise((r) => { resolveB = r; });

    mockInvoke
      .mockReturnValueOnce(promiseA as Promise<unknown>)
      .mockReturnValueOnce(promiseB as Promise<unknown>);

    const args = { path: "/foo" };
    const promise1 = dedupInvoke("channel_a", args);
    const promise2 = dedupInvoke("channel_b", args);

    expect(promise1).not.toBe(promise2);
    expect(mockInvoke).toHaveBeenCalledTimes(2);

    resolveA({});
    resolveB({});
  });
});
