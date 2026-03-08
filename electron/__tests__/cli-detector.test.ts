import { describe, it, expect, vi, beforeEach } from "vitest";
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
  });

  describe("detectGhCopilot", () => {
    it("returns true when gh is installed and copilot extension is present", async () => {
      mockExecFile.mockImplementation((_cmd, args, _opts, cb) => {
        const argList = args as string[];
        if (argList.includes("extension") && argList.includes("list")) {
          // Simulate gh extension list output containing copilot
          (cb as (err: null, stdout: string) => void)(null, "github/gh-copilot\nsome/other-extension\n");
        } else {
          // which gh - found
          (cb as (err: null) => void)(null);
        }
        return {} as ReturnType<typeof execFile>;
      });

      const { detectGhCopilot } = await import("../cli-detector");
      const result = await detectGhCopilot();
      expect(result).toBe(true);
    });

    it("returns false when gh is not installed", async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, cb) => {
        (cb as (err: Error) => void)(new Error("gh not found"));
        return {} as ReturnType<typeof execFile>;
      });

      const { detectGhCopilot } = await import("../cli-detector");
      const result = await detectGhCopilot();
      expect(result).toBe(false);
    });

    it("returns false when gh is installed but copilot extension is not present", async () => {
      mockExecFile.mockImplementation((_cmd, args, _opts, cb) => {
        const argList = args as string[];
        if (argList.includes("extension") && argList.includes("list")) {
          // gh extension list output - no copilot
          (cb as (err: null, stdout: string) => void)(null, "some/other-extension\n");
        } else {
          // which gh - found
          (cb as (err: null) => void)(null);
        }
        return {} as ReturnType<typeof execFile>;
      });

      const { detectGhCopilot } = await import("../cli-detector");
      const result = await detectGhCopilot();
      expect(result).toBe(false);
    });

    it("returns false when gh extension list fails", async () => {
      let callCount = 0;
      mockExecFile.mockImplementation((_cmd, args, _opts, cb) => {
        const argList = args as string[];
        callCount++;
        if (argList.includes("extension") && argList.includes("list")) {
          (cb as (err: Error, stdout: string) => void)(new Error("command failed"), "");
        } else {
          (cb as (err: null) => void)(null);
        }
        return {} as ReturnType<typeof execFile>;
      });

      const { detectGhCopilot } = await import("../cli-detector");
      const result = await detectGhCopilot();
      expect(result).toBe(false);
      // Verify it checked for gh first
      expect(callCount).toBeGreaterThan(0);
    });
  });

  describe("detectInstalledClis", () => {
    it("returns a map of CLI IDs to their detection results", async () => {
      mockExecFile.mockImplementation((_cmd, args, _opts, cb) => {
        const argList = args as string[];
        // opencode and gh are installed
        if (argList.includes("opencode") || argList.includes("gh")) {
          (cb as (err: null) => void)(null);
        } else if (argList.includes("extension") && argList.includes("list")) {
          // copilot extension is present
          (cb as (err: null, stdout: string) => void)(null, "github/gh-copilot\n");
        } else {
          // everything else is not installed
          (cb as (err: Error) => void)(new Error("not found"));
        }
        return {} as ReturnType<typeof execFile>;
      });

      const { detectInstalledClis } = await import("../cli-detector");
      const result = await detectInstalledClis(["opencode", "gh-copilot", "claude", "gemini"]);

      expect(result["opencode"]).toBe(true);
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
});
