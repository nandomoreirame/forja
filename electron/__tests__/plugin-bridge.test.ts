import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../plugins/plugin-permissions.js", () => ({
  hasPermission: vi.fn(() => false),
  getRequiredPermission: vi.fn((method: string) => {
    const map: Record<string, string> = {
      "git.status": "git.status",
      "git.log": "git.log",
      "git.diff": "git.diff",
      "project.getActive": "project.active",
      "fs.readFile": "fs.read",
      "fs.writeFile": "fs.write",
      "theme.getCurrent": "theme.current",
      "notifications.show": "notifications",
      "terminal.getOutput": "terminal.output",
      "terminal.execute": "terminal.execute",
    };
    return map[method] ?? null;
  }),
}));

vi.mock("../git-info.js", () => ({
  getGitInfo: vi.fn(() => ({ branch: "main", files: [] })),
  getGitLog: vi.fn(() => [{ hash: "abc123", message: "test", author: "user", date: "2024-01-01" }]),
  getGitChangedFiles: vi.fn(() => []),
}));

vi.mock("../path-validation.js", () => ({
  assertPathWithinScope: vi.fn(),
}));

vi.mock("../file-reader.js", () => ({
  readFile: vi.fn(() => ({ path: "/project/src/index.ts", content: "file content", size: 12 })),
}));

vi.mock("../user-settings.js", () => ({
  getCachedSettings: vi.fn(() => ({ theme: { active: "catppuccin-mocha", custom: [] } })),
}));

vi.mock("electron", () => ({
  Notification: vi.fn(function NotificationMock() {
    return { show: vi.fn() };
  }),
}));

const mockSuppressPath = vi.fn();
vi.mock("../file-watcher.js", () => ({
  suppressPath: mockSuppressPath,
}));

vi.mock("fs/promises", () => ({
  writeFile: vi.fn(),
}));

describe("executeBridgeCall", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error for unknown method", async () => {
    const { executeBridgeCall } = await import("../plugins/plugin-bridge.js");
    const result = await executeBridgeCall("test-plugin", "hack.system", {}, "/project");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unknown method");
  });

  it("returns error when plugin lacks permission", async () => {
    const { executeBridgeCall } = await import("../plugins/plugin-bridge.js");
    const result = await executeBridgeCall("test-plugin", "git.status", {}, "/project");
    expect(result.success).toBe(false);
    expect(result.error).toContain("permission");
  });

  it("executes git.status when permission is granted", async () => {
    const perms = await import("../plugins/plugin-permissions.js");
    vi.mocked(perms.hasPermission).mockReturnValue(true);
    const { executeBridgeCall } = await import("../plugins/plugin-bridge.js");
    const result = await executeBridgeCall("test-plugin", "git.status", {}, "/project");
    expect(result.success).toBe(true);
    expect(result.data).toEqual(expect.objectContaining({ branch: "main" }));
  });

  it("executes project.getActive with project info", async () => {
    const perms = await import("../plugins/plugin-permissions.js");
    vi.mocked(perms.hasPermission).mockReturnValue(true);
    const { executeBridgeCall } = await import("../plugins/plugin-bridge.js");
    const result = await executeBridgeCall("test-plugin", "project.getActive", {}, "/home/user/my-project");
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ path: "/home/user/my-project", name: "my-project" });
  });

  it("returns null for project.getActive when no project", async () => {
    const perms = await import("../plugins/plugin-permissions.js");
    vi.mocked(perms.hasPermission).mockReturnValue(true);
    const { executeBridgeCall } = await import("../plugins/plugin-bridge.js");
    const result = await executeBridgeCall("test-plugin", "project.getActive", {}, null);
    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });

  it("executes git.log with limit", async () => {
    const perms = await import("../plugins/plugin-permissions.js");
    vi.mocked(perms.hasPermission).mockReturnValue(true);
    const gitInfo = await import("../git-info.js");
    const { executeBridgeCall } = await import("../plugins/plugin-bridge.js");
    await executeBridgeCall("test-plugin", "git.log", { limit: 10 }, "/project");
    expect(gitInfo.getGitLog).toHaveBeenCalledWith("/project", { limit: 10 });
  });

  it("executes theme.getCurrent", async () => {
    const perms = await import("../plugins/plugin-permissions.js");
    vi.mocked(perms.hasPermission).mockReturnValue(true);
    const { executeBridgeCall } = await import("../plugins/plugin-bridge.js");
    const result = await executeBridgeCall("test-plugin", "theme.getCurrent", {}, null);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ theme: "catppuccin-mocha" });
  });

  it("executes fs.readFile with path validation", async () => {
    const perms = await import("../plugins/plugin-permissions.js");
    vi.mocked(perms.hasPermission).mockReturnValue(true);
    const pathVal = await import("../path-validation.js");
    const { executeBridgeCall } = await import("../plugins/plugin-bridge.js");
    const result = await executeBridgeCall("test-plugin", "fs.readFile", { path: "src/index.ts" }, "/project");
    expect(result.success).toBe(true);
    expect(pathVal.assertPathWithinScope).toHaveBeenCalled();
  });

  it("rejects fs.readFile with no project", async () => {
    const perms = await import("../plugins/plugin-permissions.js");
    vi.mocked(perms.hasPermission).mockReturnValue(true);
    const { executeBridgeCall } = await import("../plugins/plugin-bridge.js");
    const result = await executeBridgeCall("test-plugin", "fs.readFile", { path: "test.txt" }, null);
    expect(result.success).toBe(false);
    expect(result.error).toContain("No active project");
  });

  it("executes notifications.show", async () => {
    const perms = await import("../plugins/plugin-permissions.js");
    vi.mocked(perms.hasPermission).mockReturnValue(true);
    const { executeBridgeCall } = await import("../plugins/plugin-bridge.js");
    const result = await executeBridgeCall("test-plugin", "notifications.show", { title: "Test", body: "Hello" }, null);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ shown: true });
  });

  it("calls suppressPath before writing file via fs.writeFile", async () => {
    const perms = await import("../plugins/plugin-permissions.js");
    vi.mocked(perms.hasPermission).mockReturnValue(true);
    const { executeBridgeCall } = await import("../plugins/plugin-bridge.js");
    const result = await executeBridgeCall(
      "test-plugin",
      "fs.writeFile",
      { path: "TASKS.md", content: "# Tasks" },
      "/project",
    );
    expect(result.success).toBe(true);
    expect(mockSuppressPath).toHaveBeenCalledWith("/project/TASKS.md");
  });
});
