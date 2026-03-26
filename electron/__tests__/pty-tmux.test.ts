import { describe, it, expect, vi, beforeEach } from "vitest";
import * as childProcess from "child_process";
import * as ptyModule from "node-pty";

vi.mock("child_process");
vi.mock("node-pty");

describe("pty-tmux", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  describe("spawnTmuxPty", () => {
    it("creates a tmux session then spawns node-pty attached to it", async () => {
      // Mock tmux session creation
      vi.mocked(childProcess.execFile).mockImplementation(
        (_cmd, _args, _opts, cb: any) => {
          if (cb) cb(null, "", "");
          return {} as any;
        },
      );

      // Mock node-pty spawn
      const mockPty = {
        onData: vi.fn(),
        onExit: vi.fn(),
        write: vi.fn(),
        resize: vi.fn(),
        kill: vi.fn(),
        pid: 1234,
      };
      vi.mocked(ptyModule.spawn).mockReturnValue(mockPty as any);

      const { spawnTmuxPty } = await import("../pty-tmux.js");
      const result = await spawnTmuxPty({
        sessionName: "forja-tab-1",
        cwd: "/home/user/project",
        shell: "/bin/zsh",
        cols: 120,
        rows: 40,
      });

      expect(result.process).toBe(mockPty);
      expect(result.sessionName).toBe("forja-tab-1");
      expect(ptyModule.spawn).toHaveBeenCalledWith(
        "tmux",
        expect.arrayContaining(["attach-session", "-t", "forja-tab-1"]),
        expect.objectContaining({ cols: 120, rows: 40 }),
      );
    });
  });

  describe("reattachTmuxPty", () => {
    it("attaches to an existing tmux session without creating a new one", async () => {
      const mockPty = {
        onData: vi.fn(),
        onExit: vi.fn(),
        write: vi.fn(),
        resize: vi.fn(),
        kill: vi.fn(),
        pid: 5678,
      };
      vi.mocked(ptyModule.spawn).mockReturnValue(mockPty as any);

      const { reattachTmuxPty } = await import("../pty-tmux.js");
      const result = reattachTmuxPty({
        sessionName: "forja-tab-1",
        cols: 120,
        rows: 40,
      });

      expect(result.process).toBe(mockPty);
      expect(result.sessionName).toBe("forja-tab-1");
      expect(ptyModule.spawn).toHaveBeenCalledWith(
        "tmux",
        expect.arrayContaining(["attach-session", "-t", "forja-tab-1"]),
        expect.objectContaining({ cols: 120, rows: 40 }),
      );

      // Should NOT call execFile (no tmux session creation)
      expect(childProcess.execFile).not.toHaveBeenCalled();
    });
  });
});
