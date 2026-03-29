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

// Mock file-cache to avoid actual cache operations during watcher tests
vi.mock("../file-cache.js", () => ({
  invalidateFileCache: vi.fn(),
  invalidateProjectCache: vi.fn(),
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
          "**/.forja/**",
        ]),
      });
    });

    it("listens for addDir, unlinkDir, add, unlink, and change events", async () => {
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
      expect(eventNames).toContain("change");
    });

    it("sends files:changed IPC event with 1000ms debounce", async () => {
      const { startFileWatcher } = await import("../file-watcher.js");

      const sender = { send: vi.fn(), isDestroyed: vi.fn(() => false) };
      startFileWatcher(1, "/my-project", sender as never);

      // Find the "add" handler and trigger it
      const addCall = mockOn.mock.calls.find(
        (call: unknown[]) => call[0] === "add",
      );
      const handler = addCall![1] as (...args: unknown[]) => void;
      handler("/my-project/some-file.ts");

      // Not sent immediately
      expect(sender.send).not.toHaveBeenCalled();

      // After 1000ms debounce
      vi.advanceTimersByTime(1000);
      expect(sender.send).toHaveBeenCalledWith("files:changed",
        expect.objectContaining({ path: "/my-project" }),
      );
    });

    it("coalesces multiple filesystem events into a single debounced IPC event", async () => {
      const { startFileWatcher } = await import("../file-watcher.js");

      const sender = { send: vi.fn(), isDestroyed: vi.fn(() => false) };
      startFileWatcher(1, "/my-project", sender as never);

      const addHandler = mockOn.mock.calls.find(
        (call: unknown[]) => call[0] === "add",
      )?.[1] as ((...args: unknown[]) => void) | undefined;
      const changeHandler = mockOn.mock.calls.find(
        (call: unknown[]) => call[0] === "change",
      )?.[1] as ((...args: unknown[]) => void) | undefined;

      expect(addHandler).toBeDefined();
      expect(changeHandler).toBeDefined();

      addHandler!("/my-project/file-a.ts");
      vi.advanceTimersByTime(500);
      changeHandler!("/my-project/file-b.ts");
      vi.advanceTimersByTime(999);

      expect(sender.send).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(sender.send).toHaveBeenCalledTimes(1);
      expect(sender.send).toHaveBeenCalledWith("files:changed",
        expect.objectContaining({ path: "/my-project" }),
      );
    });

    it("coalesces burst filesystem events into a single IPC send", async () => {
      const { startFileWatcher } = await import("../file-watcher.js");

      const sender = { send: vi.fn(), isDestroyed: vi.fn(() => false) };
      startFileWatcher(1, "/my-project", sender as never);

      const addHandler = mockOn.mock.calls.find(
        (call: unknown[]) => call[0] === "add",
      )![1] as ((...args: unknown[]) => void);
      const changeHandler = mockOn.mock.calls.find(
        (call: unknown[]) => call[0] === "change",
      )![1] as ((...args: unknown[]) => void);
      const unlinkHandler = mockOn.mock.calls.find(
        (call: unknown[]) => call[0] === "unlink",
      )![1] as ((...args: unknown[]) => void);

      addHandler("/my-project/a.ts");
      vi.advanceTimersByTime(400);
      changeHandler("/my-project/b.ts");
      vi.advanceTimersByTime(400);
      unlinkHandler("/my-project/c.ts");

      expect(sender.send).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);

      expect(sender.send).toHaveBeenCalledTimes(1);
      expect(sender.send).toHaveBeenCalledWith("files:changed",
        expect.objectContaining({ path: "/my-project" }),
      );
    });

    it("coalesces rapid filesystem events into a single refresh", async () => {
      const { startFileWatcher } = await import("../file-watcher.js");

      const sender = { send: vi.fn(), isDestroyed: vi.fn(() => false) };
      startFileWatcher(1, "/my-project", sender as never);

      const addHandler = mockOn.mock.calls.find(
        (call: unknown[]) => call[0] === "add",
      )?.[1] as ((...args: unknown[]) => void) | undefined;
      const changeHandler = mockOn.mock.calls.find(
        (call: unknown[]) => call[0] === "change",
      )?.[1] as ((...args: unknown[]) => void) | undefined;
      const unlinkHandler = mockOn.mock.calls.find(
        (call: unknown[]) => call[0] === "unlink",
      )?.[1] as ((...args: unknown[]) => void) | undefined;

      addHandler?.("/my-project/src/a.ts");
      vi.advanceTimersByTime(400);
      changeHandler?.("/my-project/src/b.ts");
      vi.advanceTimersByTime(400);
      unlinkHandler?.("/my-project/src/c.ts");

      expect(sender.send).not.toHaveBeenCalled();

      vi.advanceTimersByTime(999);
      expect(sender.send).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(sender.send).toHaveBeenCalledTimes(1);
      expect(sender.send).toHaveBeenCalledWith("files:changed", {
        path: "/my-project",
        changedPaths: expect.arrayContaining(["src/a.ts", "src/b.ts", "src/c.ts"]),
      });
    });

    it("includes changedPaths as relative paths in the files:changed payload", async () => {
      const { startFileWatcher } = await import("../file-watcher.js");

      const sender = { send: vi.fn(), isDestroyed: vi.fn(() => false) };
      startFileWatcher(1, "/my-project", sender as never);

      const addHandler = mockOn.mock.calls.find(
        (call: unknown[]) => call[0] === "add",
      )?.[1] as ((...args: unknown[]) => void) | undefined;

      addHandler?.("/my-project/src/index.ts");

      vi.advanceTimersByTime(1000);

      expect(sender.send).toHaveBeenCalledWith("files:changed", {
        path: "/my-project",
        changedPaths: ["src/index.ts"],
      });
    });

    it("accumulates multiple changed paths during debounce window", async () => {
      const { startFileWatcher } = await import("../file-watcher.js");

      const sender = { send: vi.fn(), isDestroyed: vi.fn(() => false) };
      startFileWatcher(1, "/my-project", sender as never);

      const addHandler = mockOn.mock.calls.find(
        (call: unknown[]) => call[0] === "add",
      )?.[1] as ((...args: unknown[]) => void) | undefined;
      const changeHandler = mockOn.mock.calls.find(
        (call: unknown[]) => call[0] === "change",
      )?.[1] as ((...args: unknown[]) => void) | undefined;

      addHandler?.("/my-project/new-file.ts");
      vi.advanceTimersByTime(200);
      changeHandler?.("/my-project/existing-file.ts");
      vi.advanceTimersByTime(200);
      addHandler?.("/my-project/another-file.ts");

      vi.advanceTimersByTime(1000);

      const payload = sender.send.mock.calls[0]?.[1] as { path: string; changedPaths: string[] };
      expect(payload.changedPaths).toHaveLength(3);
      expect(payload.changedPaths).toContain("new-file.ts");
      expect(payload.changedPaths).toContain("existing-file.ts");
      expect(payload.changedPaths).toContain("another-file.ts");
    });

    it("clears changedPaths after emitting so next event starts fresh", async () => {
      const { startFileWatcher } = await import("../file-watcher.js");

      const sender = { send: vi.fn(), isDestroyed: vi.fn(() => false) };
      startFileWatcher(1, "/my-project", sender as never);

      const addHandler = mockOn.mock.calls.find(
        (call: unknown[]) => call[0] === "add",
      )?.[1] as ((...args: unknown[]) => void) | undefined;

      // First wave
      addHandler?.("/my-project/file-a.ts");
      vi.advanceTimersByTime(1000);

      expect(sender.send).toHaveBeenCalledTimes(1);
      const firstPayload = sender.send.mock.calls[0]?.[1] as { changedPaths: string[] };
      expect(firstPayload.changedPaths).toEqual(["file-a.ts"]);

      // Second wave — should not include file-a.ts
      addHandler?.("/my-project/file-b.ts");
      vi.advanceTimersByTime(1000);

      expect(sender.send).toHaveBeenCalledTimes(2);
      const secondPayload = sender.send.mock.calls[1]?.[1] as { changedPaths: string[] };
      expect(secondPayload.changedPaths).toEqual(["file-b.ts"]);
    });

    it("events from different projects do not mix changedPaths", async () => {
      const { startFileWatcher } = await import("../file-watcher.js");

      const senderA = { send: vi.fn(), isDestroyed: vi.fn(() => false) };
      const senderB = { send: vi.fn(), isDestroyed: vi.fn(() => false) };

      startFileWatcher(1, "/project-a", senderA as never);
      const handlersA = [...mockOn.mock.calls];

      vi.clearAllMocks();
      mockOn.mockReturnThis();

      startFileWatcher(2, "/project-b", senderB as never);
      const handlersB = [...mockOn.mock.calls];

      const addHandlerA = handlersA.find((c) => c[0] === "add")?.[1] as ((...args: unknown[]) => void) | undefined;
      const addHandlerB = handlersB.find((c) => c[0] === "add")?.[1] as ((...args: unknown[]) => void) | undefined;

      addHandlerA?.("/project-a/file.ts");
      addHandlerB?.("/project-b/other.ts");

      vi.advanceTimersByTime(1000);

      expect(senderA.send).toHaveBeenCalledWith("files:changed", {
        path: "/project-a",
        changedPaths: ["file.ts"],
      });
      expect(senderB.send).toHaveBeenCalledWith("files:changed", {
        path: "/project-b",
        changedPaths: ["other.ts"],
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

  describe("configurable depth", () => {
    it("uses provided depth instead of default", async () => {
      const { startFileWatcher } = await import("../file-watcher.js");

      const sender = { send: vi.fn(), isDestroyed: vi.fn(() => false) };
      startFileWatcher(1, "/project", sender as never, { depth: 1 });

      expect(chokidar.default.watch).toHaveBeenCalledWith("/project", expect.objectContaining({
        depth: 1,
      }));
    });

    it("defaults to depth 3 when no options provided", async () => {
      const { startFileWatcher } = await import("../file-watcher.js");

      const sender = { send: vi.fn(), isDestroyed: vi.fn(() => false) };
      startFileWatcher(1, "/project", sender as never);

      expect(chokidar.default.watch).toHaveBeenCalledWith("/project", expect.objectContaining({
        depth: 3,
      }));
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

  describe("suppressPath", () => {
    it("excludes suppressed absolute path from changedPaths in the IPC event", async () => {
      const { startFileWatcher, suppressPath } = await import("../file-watcher.js");

      const sender = { send: vi.fn(), isDestroyed: vi.fn(() => false) };
      startFileWatcher(1, "/my-project", sender as never);

      const changeHandler = mockOn.mock.calls.find(
        (call: unknown[]) => call[0] === "change",
      )?.[1] as ((...args: unknown[]) => void) | undefined;

      // Suppress the path BEFORE the filesystem event fires
      suppressPath("/my-project/TASKS.md");

      changeHandler?.("/my-project/TASKS.md");

      vi.advanceTimersByTime(1000);

      // Should NOT send because the only changed path was suppressed
      expect(sender.send).not.toHaveBeenCalled();
    });

    it("only suppresses the specified path, other paths still fire", async () => {
      const { startFileWatcher, suppressPath } = await import("../file-watcher.js");

      const sender = { send: vi.fn(), isDestroyed: vi.fn(() => false) };
      startFileWatcher(1, "/my-project", sender as never);

      const changeHandler = mockOn.mock.calls.find(
        (call: unknown[]) => call[0] === "change",
      )?.[1] as ((...args: unknown[]) => void) | undefined;

      suppressPath("/my-project/TASKS.md");

      changeHandler?.("/my-project/TASKS.md");
      changeHandler?.("/my-project/src/index.ts");

      vi.advanceTimersByTime(1000);

      expect(sender.send).toHaveBeenCalledWith("files:changed", {
        path: "/my-project",
        changedPaths: ["src/index.ts"],
      });
    });

    it("suppression expires automatically after 2 seconds", async () => {
      const { startFileWatcher, suppressPath } = await import("../file-watcher.js");

      const sender = { send: vi.fn(), isDestroyed: vi.fn(() => false) };
      startFileWatcher(1, "/my-project", sender as never);

      const changeHandler = mockOn.mock.calls.find(
        (call: unknown[]) => call[0] === "change",
      )?.[1] as ((...args: unknown[]) => void) | undefined;

      suppressPath("/my-project/TASKS.md");

      // Wait for suppression to expire (2s)
      vi.advanceTimersByTime(2000);

      changeHandler?.("/my-project/TASKS.md");
      vi.advanceTimersByTime(1000);

      // Now the path should NOT be suppressed anymore
      expect(sender.send).toHaveBeenCalledWith("files:changed", {
        path: "/my-project",
        changedPaths: ["TASKS.md"],
      });
    });

    it("suppression is consumed on first match within window", async () => {
      const { startFileWatcher, suppressPath } = await import("../file-watcher.js");

      const sender = { send: vi.fn(), isDestroyed: vi.fn(() => false) };
      startFileWatcher(1, "/my-project", sender as never);

      const changeHandler = mockOn.mock.calls.find(
        (call: unknown[]) => call[0] === "change",
      )?.[1] as ((...args: unknown[]) => void) | undefined;

      suppressPath("/my-project/TASKS.md");

      // First change — suppressed
      changeHandler?.("/my-project/TASKS.md");
      vi.advanceTimersByTime(1000);
      expect(sender.send).not.toHaveBeenCalled();

      // Second change — no longer suppressed
      changeHandler?.("/my-project/TASKS.md");
      vi.advanceTimersByTime(1000);
      expect(sender.send).toHaveBeenCalledWith("files:changed", {
        path: "/my-project",
        changedPaths: ["TASKS.md"],
      });
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
