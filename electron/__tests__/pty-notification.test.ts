import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildSessionFinishedNotification } from "../pty-notifications";

const { mockNotificationInstance, MockNotification } = vi.hoisted(() => {
  const instance = {
    on: vi.fn(),
    show: vi.fn(),
  };

  let lastOpts: Record<string, unknown> = {};

  const NotifClass = class MockNotification {
    static isSupported = vi.fn(() => true);
    static get lastOpts() {
      return lastOpts;
    }
    constructor(opts: Record<string, unknown>) {
      lastOpts = opts;
      return instance as unknown as MockNotification;
    }
  };

  return { mockNotificationInstance: instance, MockNotification: NotifClass };
});

vi.mock("child_process", () => ({
  execFile: vi.fn(),
}));

vi.mock("electron", () => ({
  Notification: MockNotification,
}));

describe("buildSessionFinishedNotification", () => {
  it("builds title with project name", () => {
    const notif = buildSessionFinishedNotification({
      projectPath: "/home/user/my-app",
      sessionType: "claude",
      activeProjectPath: null,
    });
    expect(notif.title).toContain("my-app");
  });

  it("builds body with capitalized session type and finished copy", () => {
    const notif = buildSessionFinishedNotification({
      projectPath: "/home/user/my-app",
      sessionType: "claude",
      activeProjectPath: null,
    });
    expect(notif.body).toContain("Claude");
    expect(notif.body.toLowerCase()).toContain("finished");
  });

  it("capitalizes different session types", () => {
    const notif = buildSessionFinishedNotification({
      projectPath: "/home/user/proj",
      sessionType: "gemini",
      activeProjectPath: null,
    });
    expect(notif.body).toContain("Gemini");
  });
});

describe("showSessionFinishedNotification", () => {
  const readyInfo = {
    projectPath: "/home/user/my-app",
    sessionType: "claude",
    activeProjectPath: null,
  };

  let originalPlatform: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockNotificationInstance.on.mockReset();
    mockNotificationInstance.show.mockReset();
    originalPlatform = Object.getOwnPropertyDescriptor(process, "platform");
  });

  afterEach(() => {
    if (originalPlatform) {
      Object.defineProperty(process, "platform", originalPlatform);
    }
  });

  function setPlatform(value: string) {
    Object.defineProperty(process, "platform", {
      value,
      writable: true,
      configurable: true,
    });
  }

  function makeMockWindow(focused: boolean) {
    return {
      isFocused: vi.fn(() => focused),
      show: vi.fn(),
      focus: vi.fn(),
      webContents: { send: vi.fn() },
    } as unknown as Electron.BrowserWindow;
  }

  it("does nothing when window is focused", async () => {
    const { execFile } = await import("child_process");
    const { showSessionFinishedNotification } = await import(
      "../pty-notifications"
    );

    const win = makeMockWindow(true);
    showSessionFinishedNotification(
      { ...readyInfo, activeProjectPath: "/home/user/my-app" },
      win,
    );

    expect(execFile).not.toHaveBeenCalled();
    expect(mockNotificationInstance.show).not.toHaveBeenCalled();
  });

  it("shows notification when window is focused but another project is active", async () => {
    setPlatform("darwin");
    const { showSessionFinishedNotification } = await import(
      "../pty-notifications"
    );

    const win = makeMockWindow(true);
    showSessionFinishedNotification(
      { ...readyInfo, activeProjectPath: "/home/user/other-app" },
      win,
    );

    expect(mockNotificationInstance.show).toHaveBeenCalled();
  });

  it("on Linux calls notify-send via execFile", async () => {
    setPlatform("linux");
    const { execFile } = await import("child_process");
    const { showSessionFinishedNotification } = await import(
      "../pty-notifications"
    );

    const win = makeMockWindow(false);
    showSessionFinishedNotification(readyInfo, win);

    expect(mockNotificationInstance.show).toHaveBeenCalled();
    expect(execFile).not.toHaveBeenCalled();
  });

  it("on Linux falls back to notify-send when Electron notifications are unsupported", async () => {
    setPlatform("linux");
    MockNotification.isSupported.mockReturnValueOnce(false);
    const { execFile } = await import("child_process");
    const { showSessionFinishedNotification } = await import(
      "../pty-notifications"
    );

    const win = makeMockWindow(false);
    showSessionFinishedNotification(readyInfo, win);

    expect(execFile).toHaveBeenCalledWith(
      "notify-send",
      expect.arrayContaining(["--app-name=Forja"]),
      expect.any(Function),
    );
  });

  it("on macOS uses Electron.Notification", async () => {
    setPlatform("darwin");
    const { showSessionFinishedNotification } = await import(
      "../pty-notifications"
    );

    const win = makeMockWindow(false);
    showSessionFinishedNotification(readyInfo, win);

    const lastOpts = MockNotification.lastOpts;
    expect(lastOpts).toEqual(
      expect.objectContaining({
        title: expect.stringContaining("my-app"),
        body: expect.any(String),
      }),
    );
    expect(mockNotificationInstance.show).toHaveBeenCalled();
  });

  it("on macOS registers click handler that shows and focuses window", async () => {
    setPlatform("darwin");
    const { showSessionFinishedNotification } = await import(
      "../pty-notifications"
    );

    const win = makeMockWindow(false);
    showSessionFinishedNotification(readyInfo, win);

    expect(mockNotificationInstance.on).toHaveBeenCalledWith(
      "click",
      expect.any(Function),
    );

    const clickHandler = mockNotificationInstance.on.mock.calls.find(
      (c: unknown[]) => c[0] === "click",
    )?.[1] as () => void;
    clickHandler();

    expect(win.show).toHaveBeenCalled();
    expect(win.focus).toHaveBeenCalled();
    expect(win.webContents.send).toHaveBeenCalledWith(
      "project:focus-requested",
      { projectPath: readyInfo.projectPath },
    );
  });

  it("does not throw when mainWindow is null", async () => {
    setPlatform("linux");
    const { showSessionFinishedNotification } = await import(
      "../pty-notifications"
    );

    expect(() => {
      showSessionFinishedNotification(readyInfo, null);
    }).not.toThrow();
  });
});
