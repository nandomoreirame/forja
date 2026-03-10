import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock chokidar
const mockOn = vi.fn().mockReturnThis();
const mockClose = vi.fn().mockResolvedValue(undefined);
const mockWatcher = { on: mockOn, close: mockClose };

vi.mock("chokidar", () => ({
  default: {
    watch: vi.fn(() => mockWatcher),
  },
}));

describe("file-watcher", () => {
  let chokidar: typeof import("chokidar");

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.resetModules();
    chokidar = await import("chokidar");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("startFileWatcher", () => {
    it("creates a chokidar watcher on the project path with correct ignore patterns", async () => {
      const { startFileWatcher } = await import("../file-watcher.js");

      const sender = { send: vi.fn(), isDestroyed: vi.fn(() => false) };
      startFileWatcher(1, "/my-project", sender as never);

      expect(chokidar.default.watch).toHaveBeenCalledWith("/my-project", {
        ignoreInitial: true,
        persistent: true,
        depth: 3,
        ignored: expect.arrayContaining([
          "**/node_modules/**",
          "**/.git/**",
          "**/dist/**",
          "**/build/**",
          "**/.next/**",
          "**/.cache/**",
          "**/coverage/**",
          "**/__pycache__/**",
          "**/.venv/**",
        ]),
      });
    });

    it("listens for addDir, unlinkDir, add, and unlink events", async () => {
      const { startFileWatcher } = await import("../file-watcher.js");

      const sender = { send: vi.fn(), isDestroyed: vi.fn(() => false) };
      startFileWatcher(1, "/my-project", sender as never);

      const eventNames = mockOn.mock.calls.map(
        (call: unknown[]) => call[0],
      );
      expect(eventNames).toContain("addDir");
      expect(eventNames).toContain("unlinkDir");
      expect(eventNames).toContain("add");
      expect(eventNames).toContain("unlink");
    });

    it("sends files:changed IPC event with 1000ms debounce", async () => {
      const { startFileWatcher } = await import("../file-watcher.js");

      const sender = { send: vi.fn(), isDestroyed: vi.fn(() => false) };
      startFileWatcher(1, "/my-project", sender as never);

      // Find the "add" handler and trigger it
      const addCall = mockOn.mock.calls.find(
        (call: unknown[]) => call[0] === "add",
      );
      const handler = addCall![1] as () => void;
      handler();

      // Not sent immediately
      expect(sender.send).not.toHaveBeenCalled();

      // After 1000ms debounce
      vi.advanceTimersByTime(1000);
      expect(sender.send).toHaveBeenCalledWith("files:changed", {
        path: "/my-project",
      });
    });

    it("does not send if sender is destroyed", async () => {
      const { startFileWatcher } = await import("../file-watcher.js");

      const sender = { send: vi.fn(), isDestroyed: vi.fn(() => true) };
      startFileWatcher(1, "/my-project", sender as never);

      const addCall = mockOn.mock.calls.find(
        (call: unknown[]) => call[0] === "add",
      );
      const handler = addCall![1] as () => void;
      handler();

      vi.advanceTimersByTime(1000);
      expect(sender.send).not.toHaveBeenCalled();
    });

    it("replaces previous watcher for the same project", async () => {
      const { startFileWatcher } = await import("../file-watcher.js");

      const sender = { send: vi.fn(), isDestroyed: vi.fn(() => false) };
      startFileWatcher(1, "/my-project", sender as never);
      startFileWatcher(1, "/my-project", sender as never);

      // First watcher should be closed
      expect(mockClose).toHaveBeenCalledTimes(1);
      // Two watchers created
      expect(chokidar.default.watch).toHaveBeenCalledTimes(2);
    });
  });

  describe("stopFileWatcher", () => {
    it("closes the watcher for the given project", async () => {
      const { startFileWatcher, stopFileWatcher } = await import(
        "../file-watcher.js"
      );

      const sender = { send: vi.fn(), isDestroyed: vi.fn(() => false) };
      startFileWatcher(1, "/my-project", sender as never);

      mockClose.mockClear();
      stopFileWatcher(1, "/my-project");

      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it("does nothing if no watcher exists for the project", async () => {
      const { stopFileWatcher } = await import("../file-watcher.js");

      // Should not throw
      stopFileWatcher(1, "/nonexistent");
      expect(mockClose).not.toHaveBeenCalled();
    });
  });

  describe("stopAllFileWatchers", () => {
    it("closes all active file watchers", async () => {
      const { startFileWatcher, stopAllFileWatchers } = await import(
        "../file-watcher.js"
      );

      const sender = { send: vi.fn(), isDestroyed: vi.fn(() => false) };
      startFileWatcher(1, "/project-a", sender as never);
      startFileWatcher(1, "/project-b", sender as never);

      mockClose.mockClear();
      stopAllFileWatchers();

      expect(mockClose).toHaveBeenCalledTimes(2);
    });
  });
});
