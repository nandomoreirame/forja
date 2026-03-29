import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock node-pty before any imports
const mockPtySpawn = vi.fn();
vi.mock("node-pty", () => ({
  spawn: mockPtySpawn,
}));

// Mock fs to avoid side effects from resolveNodeManagerPaths
vi.mock("fs", () => ({
  readFileSync: vi.fn(() => { throw new Error("no file"); }),
  readdirSync: vi.fn(() => []),
  existsSync: vi.fn(() => false),
}));

// Mock os
vi.mock("os", () => ({
  homedir: vi.fn(() => "/home/test"),
  platform: vi.fn(() => "linux"),
}));

function makeMockPtyProcess() {
  return {
    onData: vi.fn(),
    onExit: vi.fn(),
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
  };
}

function makeMockSender() {
  return {
    send: vi.fn(),
    isDestroyed: vi.fn(() => false),
  };
}

describe("subscribePtyOutput", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockPtySpawn.mockReturnValue(makeMockPtyProcess());
  });

  it("returns an unsubscribe function", async () => {
    const { subscribePtyOutput } = await import("../pty.js");

    const unsubscribe = subscribePtyOutput(vi.fn());

    expect(typeof unsubscribe).toBe("function");
  });

  it("unsubscribe stops the subscriber from receiving events", async () => {
    const { subscribePtyOutput, notifyPtySubscribers } = await import("../pty.js");

    const subscriber = vi.fn();
    const unsubscribe = subscribePtyOutput(subscriber);

    // Subscriber should receive events before unsubscribing
    notifyPtySubscribers({ event: "data", tabId: "tab-1", data: "hello" });
    expect(subscriber).toHaveBeenCalledTimes(1);

    unsubscribe();

    // Should not receive events after unsubscribing
    notifyPtySubscribers({ event: "data", tabId: "tab-1", data: "world" });
    expect(subscriber).toHaveBeenCalledTimes(1);
  });
});

describe("getActiveSessions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockPtySpawn.mockReturnValue(makeMockPtyProcess());
  });

  it("returns empty array when no sessions exist", async () => {
    const { getActiveSessions } = await import("../pty.js");

    const sessions = getActiveSessions();

    expect(sessions).toEqual([]);
  });

  it("returns active sessions after spawning", async () => {
    const { spawnPty, getActiveSessions } = await import("../pty.js");

    const mockSender = makeMockSender();

    spawnPty({
      tabId: "tab-active-1",
      path: "/home/test/project-a",
      sessionType: "claude",
      windowId: 1,
      sender: mockSender as unknown as Electron.WebContents,
    });

    const sessions = getActiveSessions();

    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      tabId: "tab-active-1",
      projectPath: "/home/test/project-a",
      sessionType: "claude",
    });
  });

  it("returns multiple active sessions", async () => {
    const mockProcessA = makeMockPtyProcess();
    const mockProcessB = makeMockPtyProcess();
    mockPtySpawn
      .mockReturnValueOnce(mockProcessA)
      .mockReturnValueOnce(mockProcessB);

    const { spawnPty, getActiveSessions } = await import("../pty.js");

    const mockSender = makeMockSender();

    spawnPty({
      tabId: "tab-multi-a",
      path: "/home/test/project-a",
      sessionType: "claude",
      windowId: 1,
      sender: mockSender as unknown as Electron.WebContents,
    });

    spawnPty({
      tabId: "tab-multi-b",
      path: "/home/test/project-b",
      sessionType: "gemini",
      windowId: 1,
      sender: mockSender as unknown as Electron.WebContents,
    });

    const sessions = getActiveSessions();

    expect(sessions).toHaveLength(2);
    const tabIds = sessions.map((s) => s.tabId);
    expect(tabIds).toContain("tab-multi-a");
    expect(tabIds).toContain("tab-multi-b");
  });
});

describe("notifyPtySubscribers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockPtySpawn.mockReturnValue(makeMockPtyProcess());
  });

  it("subscriber receives data events with tabId and data", async () => {
    const { subscribePtyOutput, notifyPtySubscribers } = await import("../pty.js");

    const subscriber = vi.fn();
    subscribePtyOutput(subscriber);

    notifyPtySubscribers({ event: "data", tabId: "tab-data-1", data: "some output" });

    expect(subscriber).toHaveBeenCalledWith({
      event: "data",
      tabId: "tab-data-1",
      data: "some output",
    });
  });

  it("subscriber receives session-start events", async () => {
    const { subscribePtyOutput, notifyPtySubscribers } = await import("../pty.js");

    const subscriber = vi.fn();
    subscribePtyOutput(subscriber);

    notifyPtySubscribers({
      event: "session-start",
      tabId: "tab-start-1",
      projectPath: "/home/test/proj",
      sessionType: "claude",
    });

    expect(subscriber).toHaveBeenCalledWith({
      event: "session-start",
      tabId: "tab-start-1",
      projectPath: "/home/test/proj",
      sessionType: "claude",
    });
  });

  it("subscriber receives session-exit events", async () => {
    const { subscribePtyOutput, notifyPtySubscribers } = await import("../pty.js");

    const subscriber = vi.fn();
    subscribePtyOutput(subscriber);

    notifyPtySubscribers({
      event: "session-exit",
      tabId: "tab-exit-1",
      projectPath: "/home/test/proj",
      exitCode: 0,
    });

    expect(subscriber).toHaveBeenCalledWith({
      event: "session-exit",
      tabId: "tab-exit-1",
      projectPath: "/home/test/proj",
      exitCode: 0,
    });
  });

  it("multiple subscribers all receive the same event", async () => {
    const { subscribePtyOutput, notifyPtySubscribers } = await import("../pty.js");

    const subscriberA = vi.fn();
    const subscriberB = vi.fn();
    const subscriberC = vi.fn();

    subscribePtyOutput(subscriberA);
    subscribePtyOutput(subscriberB);
    subscribePtyOutput(subscriberC);

    const event = { event: "data" as const, tabId: "tab-multi-sub", data: "broadcast data" };
    notifyPtySubscribers(event);

    expect(subscriberA).toHaveBeenCalledWith(event);
    expect(subscriberB).toHaveBeenCalledWith(event);
    expect(subscriberC).toHaveBeenCalledWith(event);
  });

  it("subscriber errors do not crash the notification loop", async () => {
    const { subscribePtyOutput, notifyPtySubscribers } = await import("../pty.js");

    const errorSubscriber = vi.fn(() => {
      throw new Error("subscriber crashed");
    });
    const goodSubscriber = vi.fn();

    subscribePtyOutput(errorSubscriber);
    subscribePtyOutput(goodSubscriber);

    // Should not throw even if one subscriber errors
    expect(() => {
      notifyPtySubscribers({ event: "data", tabId: "tab-crash", data: "test" });
    }).not.toThrow();

    // The good subscriber should still be called
    expect(goodSubscriber).toHaveBeenCalledTimes(1);
  });
});

describe("notifyPtySubscribers integration with spawnPty", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("subscriber receives data events when PTY emits data", async () => {
    let dataHandler: ((data: string) => void) | undefined;

    const mockPtyProcess = {
      onData: vi.fn((handler: (data: string) => void) => { dataHandler = handler; }),
      onExit: vi.fn(),
      write: vi.fn(),
      resize: vi.fn(),
      kill: vi.fn(),
    };
    mockPtySpawn.mockReturnValue(mockPtyProcess);

    const { spawnPty, subscribePtyOutput } = await import("../pty.js");

    const subscriber = vi.fn();
    subscribePtyOutput(subscriber);

    const mockSender = makeMockSender();
    spawnPty({
      tabId: "tab-data-integration",
      path: "/home/test/project",
      sessionType: "claude",
      windowId: 1,
      sender: mockSender as unknown as Electron.WebContents,
    });

    dataHandler!("PTY output data");

    expect(subscriber).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "data",
        tabId: "tab-data-integration",
        data: "PTY output data",
      })
    );
  });

  it("subscriber receives session-start event when PTY is spawned", async () => {
    mockPtySpawn.mockReturnValue(makeMockPtyProcess());

    const { spawnPty, subscribePtyOutput } = await import("../pty.js");

    const subscriber = vi.fn();
    subscribePtyOutput(subscriber);

    const mockSender = makeMockSender();
    spawnPty({
      tabId: "tab-start-integration",
      path: "/home/test/project",
      sessionType: "claude",
      windowId: 1,
      sender: mockSender as unknown as Electron.WebContents,
    });

    expect(subscriber).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "session-start",
        tabId: "tab-start-integration",
        projectPath: "/home/test/project",
        sessionType: "claude",
      })
    );
  });

  it("subscriber receives session-exit event when PTY process exits", async () => {
    let exitHandler: ((event: { exitCode: number }) => void) | undefined;

    const mockPtyProcess = {
      onData: vi.fn(),
      onExit: vi.fn((handler: (event: { exitCode: number }) => void) => { exitHandler = handler; }),
      write: vi.fn(),
      resize: vi.fn(),
      kill: vi.fn(),
    };
    mockPtySpawn.mockReturnValue(mockPtyProcess);

    const { spawnPty, subscribePtyOutput } = await import("../pty.js");

    const subscriber = vi.fn();
    subscribePtyOutput(subscriber);

    const mockSender = makeMockSender();
    spawnPty({
      tabId: "tab-exit-integration",
      path: "/home/test/project",
      sessionType: "claude",
      windowId: 1,
      sender: mockSender as unknown as Electron.WebContents,
    });

    exitHandler!({ exitCode: 0 });

    expect(subscriber).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "session-exit",
        tabId: "tab-exit-integration",
        projectPath: "/home/test/project",
        exitCode: 0,
      })
    );
  });
});
