import { describe, it, expect, vi, beforeEach } from "vitest";
import * as childProcess from "child_process";
import * as ptyModule from "node-pty";

vi.mock("child_process");
vi.mock("node-pty");

/**
 * Integration test for the full tmux session persistence lifecycle.
 * Tests the coordination between tmux.ts, pty-tmux.ts, pty.ts, and tmux-restore.ts.
 *
 * Since we can't rely on tmux being installed in CI, all tmux commands
 * are mocked at the child_process level.
 */
describe("tmux session persistence (integration)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  it("full lifecycle: spawn -> detach -> list orphans -> reattach -> force-kill", async () => {
    // Track which tmux sessions "exist"
    const activeSessions = new Set<string>();

    // Mock child_process.execFile to simulate tmux commands
    vi.mocked(childProcess.execFile).mockImplementation(
      (_cmd, args, _opts, cb: any) => {
        const subcommand = args?.[0];
        if (subcommand === "-V") {
          // tmux version check
          if (cb) cb(null, "tmux 3.4\n", "");
        } else if (subcommand === "new-session") {
          // Create session
          const nameIdx = (args as string[]).indexOf("-s");
          if (nameIdx >= 0) {
            activeSessions.add((args as string[])[nameIdx + 1]);
          }
          if (cb) cb(null, "", "");
        } else if (subcommand === "set-option") {
          // Status bar hide — no-op
          if (cb) cb(null, "", "");
        } else if (subcommand === "list-sessions") {
          // List sessions
          const output = Array.from(activeSessions).join("\n");
          if (cb) cb(null, output ? output + "\n" : "", "");
        } else if (subcommand === "kill-session") {
          // Kill session
          const targetIdx = (args as string[]).indexOf("-t");
          if (targetIdx >= 0) {
            activeSessions.delete((args as string[])[targetIdx + 1]);
          }
          if (cb) cb(null, "", "");
        } else if (subcommand === "display-message") {
          // Get CWD
          if (cb) cb(null, "/home/user/project\n", "");
        } else {
          if (cb) cb(null, "", "");
        }
        return {} as any;
      },
    );

    // Mock node-pty spawn
    const mockPtyProcess = {
      onData: vi.fn(),
      onExit: vi.fn(),
      write: vi.fn(),
      resize: vi.fn(),
      kill: vi.fn(),
      pid: 1234,
    };
    vi.mocked(ptyModule.spawn).mockReturnValue(mockPtyProcess as any);

    // === Step 1: Verify tmux is available ===
    const { isTmuxAvailable } = await import("../tmux.js");
    expect(await isTmuxAvailable()).toBe(true);

    // === Step 2: Spawn a tmux PTY ===
    const { spawnTmuxPty } = await import("../pty-tmux.js");
    const spawnResult = await spawnTmuxPty({
      sessionName: "forja-integration-tab",
      cwd: "/home/user/project",
      shell: "/bin/zsh",
      cols: 120,
      rows: 40,
    });

    expect(spawnResult.sessionName).toBe("forja-integration-tab");
    expect(spawnResult.process).toBe(mockPtyProcess);
    expect(activeSessions.has("forja-integration-tab")).toBe(true);

    // node-pty should have been called to attach
    expect(ptyModule.spawn).toHaveBeenCalledWith(
      "tmux",
      ["attach-session", "-t", "forja-integration-tab"],
      expect.any(Object),
    );

    // === Step 3: Detach (simulate app close - just kill the pty attach) ===
    mockPtyProcess.kill();
    // tmux session should still exist
    expect(activeSessions.has("forja-integration-tab")).toBe(true);

    // === Step 4: List orphaned sessions ===
    const { getOrphanedSessions } = await import("../tmux-restore.js");
    const orphans = await getOrphanedSessions();

    expect(orphans).toHaveLength(1);
    expect(orphans[0].sessionName).toBe("forja-integration-tab");
    expect(orphans[0].cwd).toBe("/home/user/project");

    // === Step 5: Reattach to the orphaned session ===
    const mockReattachPty = {
      onData: vi.fn(),
      onExit: vi.fn(),
      write: vi.fn(),
      resize: vi.fn(),
      kill: vi.fn(),
      pid: 5678,
    };
    vi.mocked(ptyModule.spawn).mockReturnValue(mockReattachPty as any);

    const { reattachTmuxPty } = await import("../pty-tmux.js");
    const reattachResult = reattachTmuxPty({
      sessionName: "forja-integration-tab",
      cols: 120,
      rows: 40,
    });

    expect(reattachResult.process).toBe(mockReattachPty);
    expect(activeSessions.has("forja-integration-tab")).toBe(true);

    // === Step 6: Force-kill (user explicitly closes tab) ===
    const { killTmuxSession } = await import("../tmux.js");
    await killTmuxSession("forja-integration-tab");

    expect(activeSessions.has("forja-integration-tab")).toBe(false);

    // === Step 7: Verify no orphans remain ===
    const remainingOrphans = await getOrphanedSessions();
    expect(remainingOrphans).toHaveLength(0);
  });

  it("cleanup removes stale sessions not in saved state", async () => {
    const activeSessions = new Set<string>();

    vi.mocked(childProcess.execFile).mockImplementation(
      (_cmd, args, _opts, cb: any) => {
        const subcommand = args?.[0];
        if (subcommand === "list-sessions") {
          const output = Array.from(activeSessions).join("\n");
          if (cb) cb(null, output ? output + "\n" : "", "");
        } else if (subcommand === "kill-session") {
          const targetIdx = (args as string[]).indexOf("-t");
          if (targetIdx >= 0) {
            activeSessions.delete((args as string[])[targetIdx + 1]);
          }
          if (cb) cb(null, "", "");
        } else {
          if (cb) cb(null, "", "");
        }
        return {} as any;
      },
    );

    // Simulate 3 existing sessions
    activeSessions.add("forja-tab-1");
    activeSessions.add("forja-tab-2");
    activeSessions.add("forja-tab-3");

    const { cleanupStaleSessions } = await import("../tmux-restore.js");

    // Only tab-1 is in saved state
    await cleanupStaleSessions(new Set(["forja-tab-1"]));

    // tab-2 and tab-3 should have been killed
    expect(activeSessions.size).toBe(1);
    expect(activeSessions.has("forja-tab-1")).toBe(true);
  });
});
