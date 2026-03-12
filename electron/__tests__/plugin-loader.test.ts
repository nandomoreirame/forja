import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs/promises";
import chokidar from "chokidar";

vi.mock("fs/promises");
vi.mock("chokidar", () => {
  const mockClose = vi.fn();
  const mockOn = vi.fn().mockReturnThis();
  const mockWatcher = { on: mockOn, close: mockClose };
  return {
    default: {
      watch: vi.fn(() => mockWatcher),
    },
  };
});

const VALID_MANIFEST = {
  name: "test-plugin",
  version: "1.0.0",
  displayName: "Test Plugin",
  description: "A test plugin",
  author: "test",
  icon: "Sparkles",
  entry: "index.html",
  permissions: ["project.active"],
};

describe("plugin-loader", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns empty array when plugins dir is empty", async () => {
    vi.mocked(fs.readdir).mockResolvedValue([]);
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    const { scanPlugins } = await import("../plugins/plugin-loader.js");
    const plugins = await scanPlugins();
    expect(plugins).toEqual([]);
  });

  it("loads a valid plugin", async () => {
    const dirEntry = { name: "test-plugin", isDirectory: () => true } as any;
    vi.mocked(fs.readdir).mockResolvedValue([dirEntry]);
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(VALID_MANIFEST));
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);

    const { scanPlugins } = await import("../plugins/plugin-loader.js");
    const plugins = await scanPlugins();
    expect(plugins).toHaveLength(1);
    expect(plugins[0].manifest.name).toBe("test-plugin");
    expect(plugins[0].enabled).toBe(true);
  });

  it("skips directories with invalid manifest", async () => {
    const dirEntry = { name: "bad-plugin", isDirectory: () => true } as any;
    vi.mocked(fs.readdir).mockResolvedValue([dirEntry]);
    vi.mocked(fs.readFile).mockResolvedValue("not json");
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);

    const { scanPlugins } = await import("../plugins/plugin-loader.js");
    const plugins = await scanPlugins();
    expect(plugins).toEqual([]);
  });

  it("skips non-directory entries", async () => {
    const fileEntry = { name: "readme.txt", isDirectory: () => false } as any;
    vi.mocked(fs.readdir).mockResolvedValue([fileEntry]);
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);

    const { scanPlugins } = await import("../plugins/plugin-loader.js");
    const plugins = await scanPlugins();
    expect(plugins).toEqual([]);
  });
});

describe("startPluginWatcher", () => {
  it("creates a chokidar watcher on the plugins directory", async () => {
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    const { startPluginWatcher, PLUGINS_DIR } = await import("../plugins/plugin-loader.js");
    const onChange = vi.fn();
    startPluginWatcher(onChange);
    expect(chokidar.watch).toHaveBeenCalledWith(PLUGINS_DIR, expect.objectContaining({ depth: 1 }));
  });

  it("does not create duplicate watchers", async () => {
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    const { startPluginWatcher } = await import("../plugins/plugin-loader.js");
    const onChange = vi.fn();
    startPluginWatcher(onChange);
    startPluginWatcher(onChange);
    expect(chokidar.watch).toHaveBeenCalledTimes(1);
  });
});

describe("stopPluginWatcher", () => {
  it("closes the watcher when active", async () => {
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    const { startPluginWatcher, stopPluginWatcher } = await import("../plugins/plugin-loader.js");
    startPluginWatcher(vi.fn());
    stopPluginWatcher();
    // After stopping, starting again should create a new watcher
    const onChange = vi.fn();
    startPluginWatcher(onChange);
    expect(chokidar.watch).toHaveBeenCalledTimes(2);
  });
});
