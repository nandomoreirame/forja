import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../tmux.js");

describe("tmux-restore", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  describe("getOrphanedSessions", () => {
    it("returns tmux sessions that match forja prefix with their cwd", async () => {
      const tmux = await import("../tmux.js");
      vi.mocked(tmux.listForjaSessions).mockResolvedValue([
        "forja-tab-1",
        "forja-tab-2",
        "forja-tab-3",
      ]);
      vi.mocked(tmux.getTmuxSessionCwd).mockResolvedValue("/home/user/project");
      vi.mocked(tmux.tabIdFromTmuxSession).mockImplementation((name: string) => {
        if (!name.startsWith("forja-")) return null;
        return name.slice("forja-".length);
      });

      const { getOrphanedSessions } = await import("../tmux-restore.js");
      const orphans = await getOrphanedSessions();

      expect(orphans).toHaveLength(3);
      expect(orphans[0]).toEqual({
        sessionName: "forja-tab-1",
        cwd: "/home/user/project",
        tabId: "tab-1",
      });
    });

    it("returns empty array when no forja sessions exist", async () => {
      const tmux = await import("../tmux.js");
      vi.mocked(tmux.listForjaSessions).mockResolvedValue([]);

      const { getOrphanedSessions } = await import("../tmux-restore.js");
      const orphans = await getOrphanedSessions();
      expect(orphans).toEqual([]);
    });

    it("handles sessions where cwd cannot be resolved", async () => {
      const tmux = await import("../tmux.js");
      vi.mocked(tmux.listForjaSessions).mockResolvedValue(["forja-tab-1"]);
      vi.mocked(tmux.getTmuxSessionCwd).mockResolvedValue(null);
      vi.mocked(tmux.tabIdFromTmuxSession).mockReturnValue("tab-1");

      const { getOrphanedSessions } = await import("../tmux-restore.js");
      const orphans = await getOrphanedSessions();

      expect(orphans).toHaveLength(1);
      expect(orphans[0].cwd).toBeNull();
    });
  });

  describe("cleanupStaleSessions", () => {
    it("kills tmux sessions that have no matching saved tab state", async () => {
      const tmux = await import("../tmux.js");
      vi.mocked(tmux.listForjaSessions).mockResolvedValue([
        "forja-tab-1",
        "forja-tab-2",
        "forja-tab-3",
      ]);
      vi.mocked(tmux.killTmuxSession).mockResolvedValue(undefined);

      const { cleanupStaleSessions } = await import("../tmux-restore.js");
      // Only tab-1 is in saved state — tab-2 and tab-3 are stale
      await cleanupStaleSessions(new Set(["forja-tab-1"]));

      expect(tmux.killTmuxSession).toHaveBeenCalledTimes(2);
      expect(tmux.killTmuxSession).toHaveBeenCalledWith("forja-tab-2");
      expect(tmux.killTmuxSession).toHaveBeenCalledWith("forja-tab-3");
    });

    it("does nothing when all sessions are active", async () => {
      const tmux = await import("../tmux.js");
      vi.mocked(tmux.listForjaSessions).mockResolvedValue(["forja-tab-1"]);
      vi.mocked(tmux.killTmuxSession).mockResolvedValue(undefined);

      const { cleanupStaleSessions } = await import("../tmux-restore.js");
      await cleanupStaleSessions(new Set(["forja-tab-1"]));

      expect(tmux.killTmuxSession).not.toHaveBeenCalled();
    });

    it("kills all sessions when no saved state exists", async () => {
      const tmux = await import("../tmux.js");
      vi.mocked(tmux.listForjaSessions).mockResolvedValue([
        "forja-tab-1",
        "forja-tab-2",
      ]);
      vi.mocked(tmux.killTmuxSession).mockResolvedValue(undefined);

      const { cleanupStaleSessions } = await import("../tmux-restore.js");
      await cleanupStaleSessions(new Set());

      expect(tmux.killTmuxSession).toHaveBeenCalledTimes(2);
    });
  });
});
