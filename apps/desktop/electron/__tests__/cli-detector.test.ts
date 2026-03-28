import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { execFile } from "child_process";

// Mock child_process
vi.mock("child_process", () => ({
  execFile: vi.fn(),
}));

const mockExecFile = vi.mocked(execFile);

describe("cli-detector", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe("detectCli", () => {
    it("returns true when binary is found via which", async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, cb) => {
        (cb as (err: null) => void)(null);
        return {} as ReturnType<typeof execFile>;
      });

      const { detectCli } = await import("../cli-detector");
      const result = await detectCli("claude");
      expect(result).toBe(true);
    });

    it("returns false when binary is not found", async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, cb) => {
        (cb as (err: Error) => void)(new Error("not found"));
        return {} as ReturnType<typeof execFile>;
      });

      const { detectCli } = await import("../cli-detector");
      const result = await detectCli("claude");
      expect(result).toBe(false);
    });

    it("uses 'where.exe' on Windows and 'which' on Unix", async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, cb) => {
        (cb as (err: null) => void)(null);
        return {} as ReturnType<typeof execFile>;
      });

      const { detectCli } = await import("../cli-detector");
      await detectCli("claude");

      const cmd = mockExecFile.mock.calls[0][0];
      if (process.platform === "win32") {
        expect(cmd).toBe("where.exe");
      } else {
        expect(cmd).toBe("which");
      }
    });
  });

  describe("detectInstalledClis", () => {
    it("returns a map of CLI IDs to their detection results", async () => {
      mockExecFile.mockImplementation((_cmd, args, _opts, cb) => {
        const argList = args as string[];
        // copilot binary is found, others are not
        if (argList.includes("copilot")) {
          (cb as (err: null) => void)(null);
        } else {
          (cb as (err: Error) => void)(new Error("not found"));
        }
        return {} as ReturnType<typeof execFile>;
      });

      const { detectInstalledClis } = await import("../cli-detector");
      const result = await detectInstalledClis(["gh-copilot", "claude", "gemini"]);

      expect(result["gh-copilot"]).toBe(true);
      expect(result["claude"]).toBe(false);
      expect(result["gemini"]).toBe(false);
    });

    it("handles empty cliIds array", async () => {
      const { detectInstalledClis } = await import("../cli-detector");
      const result = await detectInstalledClis([]);
      expect(result).toEqual({});
    });
  });

  describe("CLI cache", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.resetModules();
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("CLI_CACHE_TTL_MS is exported and equals 24 hours", async () => {
      const { CLI_CACHE_TTL_MS } = await import("../cli-detector");
      expect(CLI_CACHE_TTL_MS).toBe(24 * 60 * 60 * 1000);
    });

    it("detectInstalledClis returns cached results on second call within TTL", async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, cb) => {
        (cb as (err: null) => void)(null);
        return {} as ReturnType<typeof execFile>;
      });

      const { detectInstalledClis } = await import("../cli-detector");

      // First call — should trigger execFile
      await detectInstalledClis(["claude", "gemini"]);
      const callsAfterFirst = mockExecFile.mock.calls.length;
      expect(callsAfterFirst).toBeGreaterThan(0);

      // Second call within TTL — should NOT trigger more execFile calls
      await detectInstalledClis(["claude", "gemini"]);
      expect(mockExecFile.mock.calls.length).toBe(callsAfterFirst);
    });

    it("detectInstalledClis fetches fresh data after TTL expires", async () => {
      const { CLI_CACHE_TTL_MS } = await import("../cli-detector");

      mockExecFile.mockImplementation((_cmd, _args, _opts, cb) => {
        (cb as (err: null) => void)(null);
        return {} as ReturnType<typeof execFile>;
      });

      const { detectInstalledClis } = await import("../cli-detector");

      // First call
      await detectInstalledClis(["claude"]);
      const callsAfterFirst = mockExecFile.mock.calls.length;

      // Advance time beyond TTL
      vi.advanceTimersByTime(CLI_CACHE_TTL_MS + 1);

      // Second call after TTL — should trigger fresh execFile calls
      await detectInstalledClis(["claude"]);
      expect(mockExecFile.mock.calls.length).toBeGreaterThan(callsAfterFirst);
    });

    it("clearCliCache forces fresh detection on next call", async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, cb) => {
        (cb as (err: null) => void)(null);
        return {} as ReturnType<typeof execFile>;
      });

      const { detectInstalledClis, clearCliCache } = await import("../cli-detector");

      // First call — populates cache
      await detectInstalledClis(["claude"]);
      const callsAfterFirst = mockExecFile.mock.calls.length;

      // Invalidate cache manually
      clearCliCache();

      // Second call after cache clear — should trigger fresh execFile calls
      await detectInstalledClis(["claude"]);
      expect(mockExecFile.mock.calls.length).toBeGreaterThan(callsAfterFirst);
    });

    it("cached results are filtered by requested cliIds", async () => {
      mockExecFile.mockImplementation((_cmd, args, _opts, cb) => {
        const argList = args as string[];
        if (argList.includes("claude")) {
          (cb as (err: null) => void)(null); // claude found
        } else {
          (cb as (err: Error) => void)(new Error("not found")); // others not found
        }
        return {} as ReturnType<typeof execFile>;
      });

      const { detectInstalledClis } = await import("../cli-detector");

      // First call with multiple CLIs — populates cache
      await detectInstalledClis(["claude", "gemini"]);

      // Second call with subset — should return only the requested subset
      const result = await detectInstalledClis(["claude"]);
      expect(result).toHaveProperty("claude");
      expect(result).not.toHaveProperty("gemini");
      expect(result["claude"]).toBe(true);
    });
  });
});
