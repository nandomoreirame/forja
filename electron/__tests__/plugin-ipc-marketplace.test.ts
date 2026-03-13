import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RegistryData, RegistryPlugin } from "../plugins/types.js";

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
  getPinnedPlugin: vi.fn(() => null),
  setPinnedPlugin: vi.fn(),
}));

vi.mock("../plugins/plugin-registry.js", () => ({
  fetchRegistry: vi.fn(),
  clearRegistryCache: vi.fn(),
}));

vi.mock("../plugins/plugin-installer.js", () => ({
  installPlugin: vi.fn(() => Promise.resolve()),
  uninstallPlugin: vi.fn(() => Promise.resolve()),
  getInstalledVersions: vi.fn(() => Promise.resolve(new Map<string, string>())),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const REGISTRY_URL = "https://nandomoreirame.github.io/forja-plugins/registry.json";

function makeRegistryPlugin(overrides: Partial<RegistryPlugin> = {}): RegistryPlugin {
  return {
    name: "test-plugin",
    displayName: "Test Plugin",
    description: "A test plugin",
    author: "Test Author",
    icon: "icon.png",
    version: "1.0.0",
    downloadUrl: "https://github.com/test/test-plugin/releases/download/v1.0.0/test-plugin.tar.gz",
    sha256: "",
    tags: ["test"],
    downloads: 100,
    permissions: [],
    ...overrides,
  };
}

function makeRegistryData(plugins: RegistryPlugin[] = []): RegistryData {
  return {
    version: 1,
    plugins,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createPluginHandlers - marketplace channels", () => {
  beforeEach(() => vi.clearAllMocks());

  it("includes the 4 new marketplace channels", async () => {
    const { createPluginHandlers } = await import("../plugins/plugin-ipc.js");
    const handlers = createPluginHandlers();
    const channels = handlers.map(([ch]) => ch);
    expect(channels).toContain("plugin:fetch-registry");
    expect(channels).toContain("plugin:install");
    expect(channels).toContain("plugin:uninstall");
    expect(channels).toContain("plugin:check-updates");
  });

  // -------------------------------------------------------------------------
  // plugin:fetch-registry
  // -------------------------------------------------------------------------

  it("plugin:fetch-registry calls fetchRegistry with the hardcoded URL", async () => {
    const registry = await import("../plugins/plugin-registry.js");
    const mockData = makeRegistryData([makeRegistryPlugin()]);
    vi.mocked(registry.fetchRegistry).mockResolvedValue(mockData);

    const { createPluginHandlers } = await import("../plugins/plugin-ipc.js");
    const handlers = createPluginHandlers();
    const handler = handlers.find(([ch]) => ch === "plugin:fetch-registry")?.[1];

    const result = await handler!({}, undefined);

    expect(registry.fetchRegistry).toHaveBeenCalledOnce();
    expect(registry.fetchRegistry).toHaveBeenCalledWith(REGISTRY_URL);
    expect(result).toEqual(mockData);
  });

  it("plugin:fetch-registry returns registry data with plugins array", async () => {
    const registry = await import("../plugins/plugin-registry.js");
    const plugin1 = makeRegistryPlugin({ name: "plugin-one" });
    const plugin2 = makeRegistryPlugin({ name: "plugin-two" });
    const mockData = makeRegistryData([plugin1, plugin2]);
    vi.mocked(registry.fetchRegistry).mockResolvedValue(mockData);

    const { createPluginHandlers } = await import("../plugins/plugin-ipc.js");
    const handlers = createPluginHandlers();
    const handler = handlers.find(([ch]) => ch === "plugin:fetch-registry")?.[1];

    const result = await handler!({}, undefined) as RegistryData;

    expect(result.plugins).toHaveLength(2);
    expect(result.plugins[0].name).toBe("plugin-one");
    expect(result.plugins[1].name).toBe("plugin-two");
  });

  // -------------------------------------------------------------------------
  // plugin:install
  // -------------------------------------------------------------------------

  it("plugin:install fetches registry, finds plugin, calls installPlugin then scanPlugins", async () => {
    const registry = await import("../plugins/plugin-registry.js");
    const installer = await import("../plugins/plugin-installer.js");
    const loader = await import("../plugins/plugin-loader.js");

    const plugin = makeRegistryPlugin({ name: "my-plugin" });
    const mockData = makeRegistryData([plugin]);
    vi.mocked(registry.fetchRegistry).mockResolvedValue(mockData);
    vi.mocked(installer.installPlugin).mockResolvedValue(undefined);
    vi.mocked(loader.scanPlugins).mockResolvedValue([]);

    const { createPluginHandlers } = await import("../plugins/plugin-ipc.js");
    const handlers = createPluginHandlers();
    const handler = handlers.find(([ch]) => ch === "plugin:install")?.[1];

    await handler!({}, { name: "my-plugin" });

    expect(registry.fetchRegistry).toHaveBeenCalledWith(REGISTRY_URL);
    expect(installer.installPlugin).toHaveBeenCalledWith(plugin);
    expect(loader.scanPlugins).toHaveBeenCalled();
  });

  it("plugin:install throws if plugin not found in registry", async () => {
    const registry = await import("../plugins/plugin-registry.js");
    const mockData = makeRegistryData([makeRegistryPlugin({ name: "other-plugin" })]);
    vi.mocked(registry.fetchRegistry).mockResolvedValue(mockData);

    const { createPluginHandlers } = await import("../plugins/plugin-ipc.js");
    const handlers = createPluginHandlers();
    const handler = handlers.find(([ch]) => ch === "plugin:install")?.[1];

    await expect(handler!({}, { name: "non-existent-plugin" })).rejects.toThrow(
      "Plugin not found in registry: non-existent-plugin"
    );
  });

  it("plugin:install throws if name is missing", async () => {
    const { createPluginHandlers } = await import("../plugins/plugin-ipc.js");
    const handlers = createPluginHandlers();
    const handler = handlers.find(([ch]) => ch === "plugin:install")?.[1];

    await expect(handler!({}, {})).rejects.toThrow("name is required");
  });

  it("plugin:install scans plugins after successful install", async () => {
    const registry = await import("../plugins/plugin-registry.js");
    const installer = await import("../plugins/plugin-installer.js");
    const loader = await import("../plugins/plugin-loader.js");

    const plugin = makeRegistryPlugin({ name: "new-plugin" });
    vi.mocked(registry.fetchRegistry).mockResolvedValue(makeRegistryData([plugin]));
    vi.mocked(installer.installPlugin).mockResolvedValue(undefined);

    const scannedPlugin = {
      manifest: { name: "new-plugin", version: "1.0.0" } as any,
      path: "/plugins/new-plugin",
      entryUrl: "file:///plugins/new-plugin/index.js",
      enabled: true,
    };
    vi.mocked(loader.scanPlugins).mockResolvedValue([scannedPlugin]);

    const { createPluginHandlers } = await import("../plugins/plugin-ipc.js");
    const handlers = createPluginHandlers();
    const handler = handlers.find(([ch]) => ch === "plugin:install")?.[1];

    const result = await handler!({}, { name: "new-plugin" });

    expect(loader.scanPlugins).toHaveBeenCalled();
    expect(result).toEqual([scannedPlugin]);
  });

  // -------------------------------------------------------------------------
  // plugin:uninstall
  // -------------------------------------------------------------------------

  it("plugin:uninstall calls uninstallPlugin then scanPlugins", async () => {
    const installer = await import("../plugins/plugin-installer.js");
    const loader = await import("../plugins/plugin-loader.js");

    vi.mocked(installer.uninstallPlugin).mockResolvedValue(undefined);
    vi.mocked(loader.scanPlugins).mockResolvedValue([]);

    const { createPluginHandlers } = await import("../plugins/plugin-ipc.js");
    const handlers = createPluginHandlers();
    const handler = handlers.find(([ch]) => ch === "plugin:uninstall")?.[1];

    await handler!({}, { name: "old-plugin" });

    expect(installer.uninstallPlugin).toHaveBeenCalledWith("old-plugin");
    expect(loader.scanPlugins).toHaveBeenCalled();
  });

  it("plugin:uninstall throws if name is missing", async () => {
    const { createPluginHandlers } = await import("../plugins/plugin-ipc.js");
    const handlers = createPluginHandlers();
    const handler = handlers.find(([ch]) => ch === "plugin:uninstall")?.[1];

    await expect(handler!({}, {})).rejects.toThrow("name is required");
  });

  it("plugin:uninstall returns updated plugin list after removal", async () => {
    const installer = await import("../plugins/plugin-installer.js");
    const loader = await import("../plugins/plugin-loader.js");

    vi.mocked(installer.uninstallPlugin).mockResolvedValue(undefined);
    vi.mocked(loader.scanPlugins).mockResolvedValue([]);

    const { createPluginHandlers } = await import("../plugins/plugin-ipc.js");
    const handlers = createPluginHandlers();
    const handler = handlers.find(([ch]) => ch === "plugin:uninstall")?.[1];

    const result = await handler!({}, { name: "old-plugin" });

    expect(result).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // plugin:check-updates
  // -------------------------------------------------------------------------

  it("plugin:check-updates returns plugins with available updates", async () => {
    const registry = await import("../plugins/plugin-registry.js");
    const installer = await import("../plugins/plugin-installer.js");

    const registryPlugin = makeRegistryPlugin({ name: "my-plugin", version: "2.0.0" });
    vi.mocked(registry.fetchRegistry).mockResolvedValue(makeRegistryData([registryPlugin]));
    vi.mocked(installer.getInstalledVersions).mockResolvedValue(
      new Map([["my-plugin", "1.0.0"]])
    );

    const { createPluginHandlers } = await import("../plugins/plugin-ipc.js");
    const handlers = createPluginHandlers();
    const handler = handlers.find(([ch]) => ch === "plugin:check-updates")?.[1];

    const result = await handler!({}, undefined) as Array<{
      name: string;
      currentVersion: string;
      latestVersion: string;
    }>;

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: "my-plugin",
      currentVersion: "1.0.0",
      latestVersion: "2.0.0",
    });
  });

  it("plugin:check-updates returns empty array when all plugins are up to date", async () => {
    const registry = await import("../plugins/plugin-registry.js");
    const installer = await import("../plugins/plugin-installer.js");

    const registryPlugin = makeRegistryPlugin({ name: "my-plugin", version: "1.0.0" });
    vi.mocked(registry.fetchRegistry).mockResolvedValue(makeRegistryData([registryPlugin]));
    vi.mocked(installer.getInstalledVersions).mockResolvedValue(
      new Map([["my-plugin", "1.0.0"]])
    );

    const { createPluginHandlers } = await import("../plugins/plugin-ipc.js");
    const handlers = createPluginHandlers();
    const handler = handlers.find(([ch]) => ch === "plugin:check-updates")?.[1];

    const result = await handler!({}, undefined) as unknown[];

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it("plugin:check-updates ignores registry plugins that are not installed", async () => {
    const registry = await import("../plugins/plugin-registry.js");
    const installer = await import("../plugins/plugin-installer.js");

    const plugin1 = makeRegistryPlugin({ name: "installed-plugin", version: "2.0.0" });
    const plugin2 = makeRegistryPlugin({ name: "not-installed-plugin", version: "1.0.0" });
    vi.mocked(registry.fetchRegistry).mockResolvedValue(makeRegistryData([plugin1, plugin2]));
    // Only plugin1 is installed, with an older version
    vi.mocked(installer.getInstalledVersions).mockResolvedValue(
      new Map([["installed-plugin", "1.0.0"]])
    );

    const { createPluginHandlers } = await import("../plugins/plugin-ipc.js");
    const handlers = createPluginHandlers();
    const handler = handlers.find(([ch]) => ch === "plugin:check-updates")?.[1];

    const result = await handler!({}, undefined) as Array<{
      name: string;
      currentVersion: string;
      latestVersion: string;
    }>;

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("installed-plugin");
  });

  it("plugin:check-updates fetches registry with the hardcoded URL", async () => {
    const registry = await import("../plugins/plugin-registry.js");
    const installer = await import("../plugins/plugin-installer.js");

    vi.mocked(registry.fetchRegistry).mockResolvedValue(makeRegistryData([]));
    vi.mocked(installer.getInstalledVersions).mockResolvedValue(new Map());

    const { createPluginHandlers } = await import("../plugins/plugin-ipc.js");
    const handlers = createPluginHandlers();
    const handler = handlers.find(([ch]) => ch === "plugin:check-updates")?.[1];

    await handler!({}, undefined);

    expect(registry.fetchRegistry).toHaveBeenCalledWith(REGISTRY_URL);
  });
});
