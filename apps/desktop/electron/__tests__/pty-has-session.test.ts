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

describe("hasPty", () => {
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

  it("returns false when no session exists for tabId", async () => {
    const { hasPty } = await import("../pty");
    expect(hasPty("nonexistent-tab")).toBe(false);
  });

  it("returns true after a session is spawned", async () => {
    const { spawnPty, hasPty } = await import("../pty");

    const mockSender = {
      send: vi.fn(),
      isDestroyed: vi.fn(() => false),
    };

    spawnPty({
      tabId: "existing-tab",
      path: "/home/test/project",
      sessionType: "claude",
      windowId: 1,
      sender: mockSender as unknown as Electron.WebContents,
    });

    expect(hasPty("existing-tab")).toBe(true);
  });

  it("returns false after session is closed", async () => {
    const { spawnPty, closePty, hasPty } = await import("../pty");

    const mockSender = {
      send: vi.fn(),
      isDestroyed: vi.fn(() => false),
    };

    spawnPty({
      tabId: "to-close-tab",
      path: "/home/test/project",
      sessionType: "claude",
      windowId: 1,
      sender: mockSender as unknown as Electron.WebContents,
    });

    expect(hasPty("to-close-tab")).toBe(true);

    closePty("to-close-tab");

    expect(hasPty("to-close-tab")).toBe(false);
  });

  it("returns false after process exits naturally", async () => {
    let exitHandler: ((event: { exitCode: number }) => void) | undefined;
    const mockPtyProcess = {
      onData: vi.fn(),
      onExit: vi.fn((handler: (event: { exitCode: number }) => void) => {
        exitHandler = handler;
      }),
      write: vi.fn(),
      resize: vi.fn(),
      kill: vi.fn(),
    };
    mockPtySpawn.mockReturnValueOnce(mockPtyProcess);

    const { spawnPty, hasPty } = await import("../pty");

    const mockSender = {
      send: vi.fn(),
      isDestroyed: vi.fn(() => false),
    };

    spawnPty({
      tabId: "exiting-tab",
      path: "/home/test/project",
      sessionType: "claude",
      windowId: 1,
      sender: mockSender as unknown as Electron.WebContents,
    });

    expect(hasPty("exiting-tab")).toBe(true);

    // Simulate natural exit
    exitHandler!({ exitCode: 0 });

    expect(hasPty("exiting-tab")).toBe(false);
  });
});
