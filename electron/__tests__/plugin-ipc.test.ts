import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all dependencies
vi.mock("../plugins/plugin-loader.js", () => ({
  scanPlugins: vi.fn(() => Promise.resolve([])),
  ensurePluginsDir: vi.fn(),
  startPluginWatcher: vi.fn(),
  PLUGINS_DIR: "/mock/plugins",
}));

vi.mock("../plugins/plugin-bridge.js", () => ({
  executeBridgeCall: vi.fn(() => Promise.resolve({ success: true, data: { ok: true } })),
}));

vi.mock("../plugins/plugin-permissions.js", () => ({
  grantPermissions: vi.fn(),
  denyPermissions: vi.fn(),
}));

vi.mock("../config.js", () => ({
  getPluginPermissions: vi.fn(() => []),
  setPluginPermission: vi.fn(),
  getEnabledPlugins: vi.fn(() => []),
  setPluginEnabled: vi.fn(),
  getPluginOrder: vi.fn(() => []),
  setPluginOrder: vi.fn(),
}));

describe("createPluginHandlers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns handler tuples for all plugin channels", async () => {
    const { createPluginHandlers } = await import("../plugins/plugin-ipc.js");
    const handlers = createPluginHandlers();
    const channels = handlers.map(([ch]) => ch);
    expect(channels).toContain("plugin:list");
    expect(channels).toContain("plugin:bridge");
    expect(channels).toContain("plugin:enable");
    expect(channels).toContain("plugin:disable");
    expect(channels).toContain("plugin:get-permissions");
    expect(channels).toContain("plugin:grant-permissions");
    expect(channels).toContain("plugin:deny-permissions");
    expect(channels).toContain("plugin:get-preload-path");
  });

  it("plugin:list handler returns scanned plugins", async () => {
    const loader = await import("../plugins/plugin-loader.js");
    vi.mocked(loader.scanPlugins).mockResolvedValue([
      { manifest: { name: "test" } as any, path: "/test", entryUrl: "file:///test", enabled: true },
    ]);
    const { createPluginHandlers } = await import("../plugins/plugin-ipc.js");
    const handlers = createPluginHandlers();
    const listHandler = handlers.find(([ch]) => ch === "plugin:list")?.[1];
    const result = await listHandler!({}, undefined);
    expect(result).toHaveLength(1);
  });

  it("plugin:bridge handler delegates to executeBridgeCall", async () => {
    const bridge = await import("../plugins/plugin-bridge.js");
    const { createPluginHandlers } = await import("../plugins/plugin-ipc.js");
    const handlers = createPluginHandlers();
    const bridgeHandler = handlers.find(([ch]) => ch === "plugin:bridge")?.[1];
    await bridgeHandler!({}, { pluginName: "test", method: "git.status", args: {}, projectPath: "/proj" });
    expect(bridge.executeBridgeCall).toHaveBeenCalledWith("test", "git.status", {}, "/proj");
  });

  it("plugin:enable handler enables a plugin", async () => {
    const config = await import("../config.js");
    const { createPluginHandlers } = await import("../plugins/plugin-ipc.js");
    const handlers = createPluginHandlers();
    const enableHandler = handlers.find(([ch]) => ch === "plugin:enable")?.[1];
    await enableHandler!({}, { name: "test-plugin" });
    expect(config.setPluginEnabled).toHaveBeenCalledWith("test-plugin", true);
  });

  it("plugin:get-preload-path returns a string path", async () => {
    const { createPluginHandlers } = await import("../plugins/plugin-ipc.js");
    const handlers = createPluginHandlers();
    const preloadHandler = handlers.find(([ch]) => ch === "plugin:get-preload-path")?.[1];
    const result = await preloadHandler!({}, undefined);
    expect(typeof result).toBe("string");
    expect(result).toContain("plugin-preload");
  });

  it("registers plugin:get-plugin-order and plugin:set-plugin-order channels", async () => {
    const { createPluginHandlers } = await import("../plugins/plugin-ipc.js");
    const handlers = createPluginHandlers();
    const channels = handlers.map(([ch]) => ch);
    expect(channels).toContain("plugin:get-plugin-order");
    expect(channels).toContain("plugin:set-plugin-order");
  });

  it("plugin:get-plugin-order handler returns persisted order", async () => {
    const config = await import("../config.js");
    vi.mocked(config.getPluginOrder).mockReturnValue(["b", "a", "c"]);
    const { createPluginHandlers } = await import("../plugins/plugin-ipc.js");
    const handlers = createPluginHandlers();
    const handler = handlers.find(([ch]) => ch === "plugin:get-plugin-order")?.[1];
    const result = await handler!({}, undefined);
    expect(result).toEqual(["b", "a", "c"]);
  });

  it("plugin:set-plugin-order handler persists order", async () => {
    const config = await import("../config.js");
    const { createPluginHandlers } = await import("../plugins/plugin-ipc.js");
    const handlers = createPluginHandlers();
    const handler = handlers.find(([ch]) => ch === "plugin:set-plugin-order")?.[1];
    await handler!({}, { names: ["c", "a", "b"] });
    expect(config.setPluginOrder).toHaveBeenCalledWith(["c", "a", "b"]);
  });
});
