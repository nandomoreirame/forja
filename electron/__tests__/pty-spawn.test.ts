import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock node-pty
const mockPtySpawn = vi.fn();
vi.mock("node-pty", () => ({
  spawn: mockPtySpawn,
}));

// Mock os and path (used in resolveShellPath)
vi.mock("os", () => ({
  homedir: vi.fn(() => "/home/test"),
  platform: vi.fn(() => "linux"),
}));

describe("spawnPty - session type handling", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    // Set up mock pty process
    const mockPtyProcess = {
      onData: vi.fn(),
      onExit: vi.fn(),
      write: vi.fn(),
      resize: vi.fn(),
      kill: vi.fn(),
    };
    mockPtySpawn.mockReturnValue(mockPtyProcess);
  });

  it("spawns opencode binary directly with no extra args", async () => {
    const { spawnPty } = await import("../pty");

    const mockSender = {
      send: vi.fn(),
      isDestroyed: vi.fn(() => false),
    };

    spawnPty({
      tabId: "test-tab",
      path: "/home/test/project",
      sessionType: "opencode",
      windowId: 1,
      sender: mockSender as unknown as Electron.WebContents,
    });

    expect(mockPtySpawn).toHaveBeenCalledWith(
      "opencode",
      [],
      expect.objectContaining({ cwd: "/home/test/project" })
    );
  });

  it("spawns gh binary with copilot as first arg for gh-copilot", async () => {
    const { spawnPty } = await import("../pty");

    const mockSender = {
      send: vi.fn(),
      isDestroyed: vi.fn(() => false),
    };

    spawnPty({
      tabId: "test-tab-copilot",
      path: "/home/test/project",
      sessionType: "gh-copilot",
      windowId: 1,
      sender: mockSender as unknown as Electron.WebContents,
    });

    expect(mockPtySpawn).toHaveBeenCalledWith(
      "gh",
      expect.arrayContaining(["copilot"]),
      expect.objectContaining({ cwd: "/home/test/project" })
    );
  });

  it("gh-copilot passes copilot as first arg before extraArgs", async () => {
    const { spawnPty } = await import("../pty");

    const mockSender = {
      send: vi.fn(),
      isDestroyed: vi.fn(() => false),
    };

    spawnPty({
      tabId: "test-tab-copilot-args",
      path: "/home/test/project",
      sessionType: "gh-copilot",
      windowId: 1,
      sender: mockSender as unknown as Electron.WebContents,
      extraArgs: ["--extra-flag"],
    });

    const callArgs = mockPtySpawn.mock.calls[0];
    const spawnedBinary = callArgs[0];
    const spawnedArgs = callArgs[1] as string[];

    expect(spawnedBinary).toBe("gh");
    expect(spawnedArgs[0]).toBe("copilot");
    expect(spawnedArgs).toContain("--extra-flag");
  });

  it("spawns terminal with user shell when sessionType is terminal", async () => {
    process.env.SHELL = "/bin/zsh";
    const { spawnPty } = await import("../pty");

    const mockSender = {
      send: vi.fn(),
      isDestroyed: vi.fn(() => false),
    };

    spawnPty({
      tabId: "test-terminal",
      path: "/home/test/project",
      sessionType: "terminal",
      windowId: 1,
      sender: mockSender as unknown as Electron.WebContents,
    });

    expect(mockPtySpawn).toHaveBeenCalledWith(
      "/bin/zsh",
      [],
      expect.objectContaining({ cwd: "/home/test/project" })
    );
  });

  it("spawns claude binary directly for claude sessionType", async () => {
    const { spawnPty } = await import("../pty");

    const mockSender = {
      send: vi.fn(),
      isDestroyed: vi.fn(() => false),
    };

    spawnPty({
      tabId: "test-claude",
      path: "/home/test/project",
      sessionType: "claude",
      windowId: 1,
      sender: mockSender as unknown as Electron.WebContents,
    });

    expect(mockPtySpawn).toHaveBeenCalledWith(
      "claude",
      [],
      expect.objectContaining({ cwd: "/home/test/project" })
    );
  });
});

describe("spawnPty - session state events", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    const mockPtyProcess = {
      onData: vi.fn(),
      onExit: vi.fn(),
      write: vi.fn(),
      resize: vi.fn(),
      kill: vi.fn(),
    };
    mockPtySpawn.mockReturnValue(mockPtyProcess);
  });

  it("does not emit running state for terminal sessions", async () => {
    process.env.SHELL = "/bin/zsh";
    const { spawnPty } = await import("../pty");

    const mockSender = {
      send: vi.fn(),
      isDestroyed: vi.fn(() => false),
    };

    spawnPty({
      tabId: "test-terminal-state",
      path: "/home/test/project",
      sessionType: "terminal",
      windowId: 1,
      sender: mockSender as unknown as Electron.WebContents,
    });

    const runningCalls = mockSender.send.mock.calls.filter(
      ([channel, payload]: [string, { state?: string }]) =>
        channel === "pty:session-state-changed" && payload?.state === "running"
    );
    expect(runningCalls).toHaveLength(0);
  });

  it("emits running state for AI CLI sessions", async () => {
    const { spawnPty } = await import("../pty");

    const mockSender = {
      send: vi.fn(),
      isDestroyed: vi.fn(() => false),
    };

    spawnPty({
      tabId: "test-claude-state",
      path: "/home/test/project",
      sessionType: "claude",
      windowId: 1,
      sender: mockSender as unknown as Electron.WebContents,
    });

    expect(mockSender.send).toHaveBeenCalledWith("pty:session-state-changed", {
      sessionId: "test-claude-state",
      projectPath: "/home/test/project",
      state: "running",
      exitCode: null,
    });
  });
});
