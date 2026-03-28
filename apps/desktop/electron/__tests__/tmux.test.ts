import { describe, it, expect, vi, beforeEach } from "vitest";
import * as childProcess from "child_process";

vi.mock("child_process");

describe("tmux", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  describe("isTmuxAvailable", () => {
    it("returns true when tmux is installed", async () => {
      vi.mocked(childProcess.execFile).mockImplementation(
        (_cmd, _args, _opts, cb: any) => {
          cb(null, "tmux 3.4\n", "");
          return {} as any;
        },
      );

      const { isTmuxAvailable } = await import("../tmux.js");
      const result = await isTmuxAvailable();
      expect(result).toBe(true);
    });

    it("returns false when tmux is not installed", async () => {
      vi.mocked(childProcess.execFile).mockImplementation(
        (_cmd, _args, _opts, cb: any) => {
          cb(new Error("not found"), "", "");
          return {} as any;
        },
      );

      const { isTmuxAvailable } = await import("../tmux.js");
      const result = await isTmuxAvailable();
      expect(result).toBe(false);
    });
  });

  describe("getTmuxVersion", () => {
    it("parses tmux version string", async () => {
      vi.mocked(childProcess.execFile).mockImplementation(
        (_cmd, _args, _opts, cb: any) => {
          cb(null, "tmux 3.4\n", "");
          return {} as any;
        },
      );

      const { getTmuxVersion } = await import("../tmux.js");
      const version = await getTmuxVersion();
      expect(version).toBe("3.4");
    });

    it("returns null when tmux is not installed", async () => {
      vi.mocked(childProcess.execFile).mockImplementation(
        (_cmd, _args, _opts, cb: any) => {
          cb(new Error("not found"), "", "");
          return {} as any;
        },
      );

      const { getTmuxVersion } = await import("../tmux.js");
      const version = await getTmuxVersion();
      expect(version).toBeNull();
    });
  });

  describe("tmux session management", () => {
    describe("tmuxSessionName", () => {
      it("creates a prefixed session name from tab id", async () => {
        const { tmuxSessionName } = await import("../tmux.js");
        expect(tmuxSessionName("tab-1")).toBe("forja-tab-1");
      });

      it("replaces dots and colons with dashes", async () => {
        const { tmuxSessionName } = await import("../tmux.js");
        expect(tmuxSessionName("tab.1:abc")).toBe("forja-tab-1-abc");
      });
    });

    describe("tabIdFromTmuxSession", () => {
      it("extracts tab id from tmux session name", async () => {
        const { tabIdFromTmuxSession } = await import("../tmux.js");
        expect(tabIdFromTmuxSession("forja-tab-1")).toBe("tab-1");
      });

      it("returns null for non-forja sessions", async () => {
        const { tabIdFromTmuxSession } = await import("../tmux.js");
        expect(tabIdFromTmuxSession("other-session")).toBeNull();
      });
    });

    describe("createTmuxSession", () => {
      it("creates a named tmux session with the correct shell and cwd", async () => {
        const mockExecFile = vi.mocked(childProcess.execFile);
        mockExecFile.mockImplementation((_cmd, _args, _opts, cb: any) => {
          if (cb) cb(null, "", "");
          return {} as any;
        });

        const { createTmuxSession } = await import("../tmux.js");
        await createTmuxSession({
          sessionName: "forja-tab-1",
          cwd: "/home/user/project",
          shell: "/bin/zsh",
          cols: 120,
          rows: 40,
        });

        expect(mockExecFile).toHaveBeenCalledWith(
          "tmux",
          expect.arrayContaining(["new-session", "-d", "-s", "forja-tab-1"]),
          expect.objectContaining({ cwd: "/home/user/project" }),
          expect.any(Function),
        );
      });

      it("resolves without error when session already exists (duplicate session)", async () => {
        const mockExecFile = vi.mocked(childProcess.execFile);
        mockExecFile.mockImplementation((_cmd, args, _opts, cb: any) => {
          if (args && (args as string[])[0] === "new-session") {
            cb(new Error("duplicate session: forja-tab-1"), "", "");
          } else {
            cb(null, "", "");
          }
          return {} as any;
        });

        const { createTmuxSession } = await import("../tmux.js");
        // Should NOT reject — duplicate means session survived, we'll reattach
        await expect(
          createTmuxSession({
            sessionName: "forja-tab-1",
            cwd: "/home/user/project",
            shell: "/bin/zsh",
            cols: 120,
            rows: 40,
          }),
        ).resolves.toBeUndefined();
      });

      it("rejects on non-duplicate errors", async () => {
        const mockExecFile = vi.mocked(childProcess.execFile);
        mockExecFile.mockImplementation((_cmd, _args, _opts, cb: any) => {
          cb(new Error("tmux server not running"), "", "");
          return {} as any;
        });

        const { createTmuxSession } = await import("../tmux.js");
        await expect(
          createTmuxSession({
            sessionName: "forja-tab-1",
            cwd: "/home/user/project",
            shell: "/bin/zsh",
            cols: 120,
            rows: 40,
          }),
        ).rejects.toThrow("tmux server not running");
      });
    });

    describe("listForjaSessions", () => {
      it("returns only forja-prefixed sessions", async () => {
        vi.mocked(childProcess.execFile).mockImplementation(
          (_cmd, args, _opts, cb: any) => {
            if (args && args[0] === "list-sessions") {
              cb(null, "forja-tab-1\nother-session\nforja-tab-2\n", "");
            } else {
              cb(null, "", "");
            }
            return {} as any;
          },
        );

        const { listForjaSessions } = await import("../tmux.js");
        const sessions = await listForjaSessions();
        expect(sessions).toEqual(["forja-tab-1", "forja-tab-2"]);
      });

      it("returns empty array when no tmux server is running", async () => {
        vi.mocked(childProcess.execFile).mockImplementation(
          (_cmd, _args, _opts, cb: any) => {
            cb(new Error("no server running"), "", "");
            return {} as any;
          },
        );

        const { listForjaSessions } = await import("../tmux.js");
        const sessions = await listForjaSessions();
        expect(sessions).toEqual([]);
      });
    });

    describe("killTmuxSession", () => {
      it("kills a specific tmux session by name", async () => {
        const mockExecFile = vi.mocked(childProcess.execFile);
        mockExecFile.mockImplementation((_cmd, _args, _opts, cb: any) => {
          cb(null, "", "");
          return {} as any;
        });

        const { killTmuxSession } = await import("../tmux.js");
        await killTmuxSession("forja-tab-1");

        expect(mockExecFile).toHaveBeenCalledWith(
          "tmux",
          ["kill-session", "-t", "forja-tab-1"],
          expect.any(Object),
          expect.any(Function),
        );
      });
    });

    describe("getTmuxSessionCwd", () => {
      it("returns the working directory of a tmux session", async () => {
        vi.mocked(childProcess.execFile).mockImplementation(
          (_cmd, args, _opts, cb: any) => {
            if (args && args[0] === "display-message") {
              cb(null, "/home/user/project\n", "");
            } else {
              cb(null, "", "");
            }
            return {} as any;
          },
        );

        const { getTmuxSessionCwd } = await import("../tmux.js");
        const cwd = await getTmuxSessionCwd("forja-tab-1");
        expect(cwd).toBe("/home/user/project");
      });

      it("returns null when session does not exist", async () => {
        vi.mocked(childProcess.execFile).mockImplementation(
          (_cmd, _args, _opts, cb: any) => {
            cb(new Error("session not found"), "", "");
            return {} as any;
          },
        );

        const { getTmuxSessionCwd } = await import("../tmux.js");
        const cwd = await getTmuxSessionCwd("forja-tab-1");
        expect(cwd).toBeNull();
      });
    });

    describe("killAllForjaSessions", () => {
      it("kills all forja-prefixed sessions", async () => {
        const mockExecFile = vi.mocked(childProcess.execFile);
        mockExecFile.mockImplementation((_cmd, args, _opts, cb: any) => {
          if (args && args[0] === "list-sessions") {
            cb(null, "forja-tab-1\nforja-tab-2\n", "");
          } else {
            cb(null, "", "");
          }
          return {} as any;
        });

        const { killAllForjaSessions } = await import("../tmux.js");
        await killAllForjaSessions();

        const killCalls = mockExecFile.mock.calls.filter(
          (call) => call[1] && (call[1] as string[])[0] === "kill-session",
        );
        expect(killCalls).toHaveLength(2);
      });
    });

    describe("getTmuxPaneCommand", () => {
      it("returns the foreground process name for a tmux session", async () => {
        vi.mocked(childProcess.execFile).mockImplementation(
          (_cmd, args, _opts, cb: any) => {
            if (args && args[0] === "display-message") {
              cb(null, "btop\n", "");
            } else {
              cb(null, "", "");
            }
            return {} as any;
          },
        );

        const { getTmuxPaneCommand } = await import("../tmux.js");
        const command = await getTmuxPaneCommand("forja-tab-1");
        expect(command).toBe("btop");
      });

      it("calls tmux display-message with pane_current_command format", async () => {
        const mockExecFile = vi.mocked(childProcess.execFile);
        mockExecFile.mockImplementation((_cmd, _args, _opts, cb: any) => {
          cb(null, "node\n", "");
          return {} as any;
        });

        const { getTmuxPaneCommand } = await import("../tmux.js");
        await getTmuxPaneCommand("forja-tab-1");

        expect(mockExecFile).toHaveBeenCalledWith(
          "tmux",
          expect.arrayContaining([
            "display-message",
            "-t",
            "forja-tab-1",
            "-p",
            "#{pane_current_command}",
          ]),
          expect.any(Object),
          expect.any(Function),
        );
      });

      it("returns null when session does not exist", async () => {
        vi.mocked(childProcess.execFile).mockImplementation(
          (_cmd, _args, _opts, cb: any) => {
            cb(new Error("session not found"), "", "");
            return {} as any;
          },
        );

        const { getTmuxPaneCommand } = await import("../tmux.js");
        const command = await getTmuxPaneCommand("forja-tab-1");
        expect(command).toBeNull();
      });

      it("returns null when stdout is empty", async () => {
        vi.mocked(childProcess.execFile).mockImplementation(
          (_cmd, _args, _opts, cb: any) => {
            cb(null, "\n", "");
            return {} as any;
          },
        );

        const { getTmuxPaneCommand } = await import("../tmux.js");
        const command = await getTmuxPaneCommand("forja-tab-1");
        expect(command).toBeNull();
      });
    });

    describe("formatPaneCommandForDisplay", () => {
      it("returns btop as-is", async () => {
        const { formatPaneCommandForDisplay } = await import("../tmux.js");
        expect(formatPaneCommandForDisplay("btop")).toBe("btop");
      });

      it("returns node as-is", async () => {
        const { formatPaneCommandForDisplay } = await import("../tmux.js");
        expect(formatPaneCommandForDisplay("node")).toBe("node");
      });

      it("returns pnpm as-is", async () => {
        const { formatPaneCommandForDisplay } = await import("../tmux.js");
        expect(formatPaneCommandForDisplay("pnpm")).toBe("pnpm");
      });

      it("normalizes python3 to python", async () => {
        const { formatPaneCommandForDisplay } = await import("../tmux.js");
        expect(formatPaneCommandForDisplay("python3")).toBe("python");
      });

      it("normalizes python2 to python", async () => {
        const { formatPaneCommandForDisplay } = await import("../tmux.js");
        expect(formatPaneCommandForDisplay("python2")).toBe("python");
      });

      it("returns vim as-is", async () => {
        const { formatPaneCommandForDisplay } = await import("../tmux.js");
        expect(formatPaneCommandForDisplay("vim")).toBe("vim");
      });

      it("returns null for shell commands (zsh)", async () => {
        const { formatPaneCommandForDisplay } = await import("../tmux.js");
        expect(formatPaneCommandForDisplay("zsh")).toBeNull();
      });

      it("returns null for shell commands (bash)", async () => {
        const { formatPaneCommandForDisplay } = await import("../tmux.js");
        expect(formatPaneCommandForDisplay("bash")).toBeNull();
      });

      it("returns null for shell commands (sh)", async () => {
        const { formatPaneCommandForDisplay } = await import("../tmux.js");
        expect(formatPaneCommandForDisplay("sh")).toBeNull();
      });

      it("returns null for fish shell", async () => {
        const { formatPaneCommandForDisplay } = await import("../tmux.js");
        expect(formatPaneCommandForDisplay("fish")).toBeNull();
      });

      it("returns unknown commands as-is", async () => {
        const { formatPaneCommandForDisplay } = await import("../tmux.js");
        expect(formatPaneCommandForDisplay("mytool")).toBe("mytool");
      });

      it("returns null for empty string", async () => {
        const { formatPaneCommandForDisplay } = await import("../tmux.js");
        expect(formatPaneCommandForDisplay("")).toBeNull();
      });
    });
  });
});
