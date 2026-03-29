import { render, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInvoke = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ipc", () => ({
  invoke: mockInvoke,
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

const MOCK_THEME = {
  id: "catppuccin-mocha",
  name: "Catppuccin Mocha",
  type: "dark" as const,
  colors: {
    base: "#1e1e2e", mantle: "#181825", surface: "#313244",
    overlay: "#45475a", highlight: "#585b70", text: "#cdd6f4",
    subtext: "#a6adc8", muted: "#6c7086", accent: "#cba6f7",
    accentHover: "#b48bf0", accentSubtle: "#9370db",
    success: "#a6e3a1", warning: "#f9e2af", error: "#f38ba8", info: "#89b4fa",
  },
  terminal: {
    black: "#45475a", red: "#f38ba8", green: "#a6e3a1", yellow: "#f9e2af",
    blue: "#89b4fa", magenta: "#f5c2e7", cyan: "#94e2d5", white: "#bac2de",
    brightBlack: "#585b70", brightRed: "#f38ba8", brightGreen: "#a6e3a1",
    brightYellow: "#f9e2af", brightBlue: "#89b4fa", brightMagenta: "#f5c2e7",
    brightCyan: "#94e2d5", brightWhite: "#a6adc8",
  },
};

const mockGetActiveTheme = vi.fn(() => MOCK_THEME);

vi.mock("@/stores/theme", () => ({
  useThemeStore: Object.assign(
    (selector?: (s: unknown) => unknown) => {
      const state = {
        activeThemeId: "catppuccin-mocha",
        getActiveTheme: mockGetActiveTheme,
      };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({
        activeThemeId: "catppuccin-mocha",
        getActiveTheme: mockGetActiveTheme,
      }),
      setState: vi.fn(),
      subscribe: vi.fn(() => () => {}),
    }
  ),
}));

const mockRequestPermissions = vi.fn();

const mockPlugins = [
  {
    manifest: {
      name: "test-plugin",
      version: "1.0.0",
      displayName: "Test Plugin",
      description: "A test plugin",
      author: "test",
      icon: "Sparkles",
      entry: "index.html",
      permissions: ["project.active", "fs.read", "fs.write"],
    },
    path: "/mock/plugins/test-plugin",
    entryUrl: "file:///mock/plugins/test-plugin/index.html",
    enabled: true,
  },
];

let pluginsSubscribeCallback: ((state: { permissionPrompt: unknown }) => void) | null = null;

vi.mock("@/stores/plugins", () => ({
  usePluginsStore: Object.assign(
    (selector?: (s: unknown) => unknown) => {
      const state = {
        plugins: mockPlugins,
        activePluginName: "test-plugin",
        requestPermissions: mockRequestPermissions,
        permissionPrompt: null,
      };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({
        plugins: mockPlugins,
        activePluginName: "test-plugin",
        requestPermissions: mockRequestPermissions,
        permissionPrompt: null,
      }),
      setState: vi.fn(),
      subscribe: vi.fn((cb: (state: { permissionPrompt: unknown }) => void) => {
        pluginsSubscribeCallback = cb;
        return () => { pluginsSubscribeCallback = null; };
      }),
    }
  ),
}));

vi.mock("@/stores/projects", () => ({
  useProjectsStore: Object.assign(
    (selector?: (s: unknown) => unknown) => {
      const state = { activeProjectPath: "/projects/my-app" };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({ activeProjectPath: "/projects/my-app" }),
      setState: vi.fn(),
      subscribe: vi.fn(() => () => {}),
    }
  ),
}));

// Patch document.createElement for webview support in tests
const originalCreateElement = document.createElement.bind(document);
document.createElement = ((tagName: string, options?: ElementCreationOptions) => {
  if (tagName === "webview") {
    const div = originalCreateElement("div", options);
    const el = div as HTMLElement & {
      reload: ReturnType<typeof vi.fn>;
      send: ReturnType<typeof vi.fn>;
      executeJavaScript: ReturnType<typeof vi.fn>;
    };
    el.reload = vi.fn();
    el.send = vi.fn();
    el.executeJavaScript = vi.fn().mockResolvedValue(undefined);
    return div;
  }
  return originalCreateElement(tagName, options);
}) as typeof document.createElement;

import { PluginHost } from "../plugin-host";

describe("PluginHost permission auto-prompting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pluginsSubscribeCallback = null;
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "plugin:get-preload-path") return Promise.resolve("/mock/preload.js");
      if (channel === "plugin:get-permissions") return Promise.resolve(null);
      if (channel === "plugin:bridge") return Promise.resolve({ success: true, data: {} });
      return Promise.resolve(null);
    });
  });

  it("prompts for permissions on mount when plugin has no grants", async () => {
    render(<PluginHost pluginName="test-plugin" />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockInvoke).toHaveBeenCalledWith("plugin:get-permissions", { name: "test-plugin" });
    expect(mockRequestPermissions).toHaveBeenCalledWith(
      "test-plugin",
      ["project.active", "fs.read", "fs.write"]
    );
  });

  it("does not prompt when all permissions are already granted", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "plugin:get-preload-path") return Promise.resolve("/mock/preload.js");
      if (channel === "plugin:get-permissions") {
        return Promise.resolve({
          pluginName: "test-plugin",
          grantedPermissions: ["project.active", "fs.read", "fs.write"],
          deniedPermissions: [],
          grantedAt: new Date().toISOString(),
        });
      }
      return Promise.resolve(null);
    });

    render(<PluginHost pluginName="test-plugin" />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockRequestPermissions).not.toHaveBeenCalled();
  });

  it("prompts when some permissions are missing", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "plugin:get-preload-path") return Promise.resolve("/mock/preload.js");
      if (channel === "plugin:get-permissions") {
        return Promise.resolve({
          pluginName: "test-plugin",
          grantedPermissions: ["project.active"],
          deniedPermissions: [],
          grantedAt: new Date().toISOString(),
        });
      }
      return Promise.resolve(null);
    });

    render(<PluginHost pluginName="test-plugin" />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockRequestPermissions).toHaveBeenCalledWith(
      "test-plugin",
      ["project.active", "fs.read", "fs.write"]
    );
  });

  it("triggers permission dialog when bridge returns lacks permission error", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "plugin:get-preload-path") return Promise.resolve("/mock/preload.js");
      if (channel === "plugin:get-permissions") {
        return Promise.resolve({
          pluginName: "test-plugin",
          grantedPermissions: ["project.active", "fs.read", "fs.write"],
          deniedPermissions: [],
          grantedAt: new Date().toISOString(),
        });
      }
      if (channel === "plugin:bridge") {
        return Promise.resolve({
          success: false,
          error: 'Plugin "test-plugin" lacks permission "fs.write" for method "fs.writeFile"',
        });
      }
      return Promise.resolve(null);
    });

    render(<PluginHost pluginName="test-plugin" />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const webview = document.querySelector("[data-testid='plugin-webview']") as HTMLElement;
    if (webview) {
      // Clear from the mount permission check (which passed since all perms granted)
      mockRequestPermissions.mockClear();

      const ipcEvent = new Event("ipc-message") as Event & { channel: string; args: unknown[] };
      ipcEvent.channel = "plugin:request";
      ipcEvent.args = [{ id: 1, method: "fs.writeFile", args: { path: "test.md", content: "hello" } }];

      await act(async () => {
        webview.dispatchEvent(ipcEvent);
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockRequestPermissions).toHaveBeenCalledWith(
        "test-plugin",
        ["project.active", "fs.read", "fs.write"]
      );
    }
  });

  it("reloads webview when permission dialog is dismissed", async () => {
    render(<PluginHost pluginName="test-plugin" />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const webview = document.querySelector("[data-testid='plugin-webview']") as HTMLElement & {
      reload?: ReturnType<typeof vi.fn>;
    };

    if (webview && pluginsSubscribeCallback) {
      // Simulate permission prompt appearing
      await act(async () => {
        pluginsSubscribeCallback!({
          permissionPrompt: { pluginName: "test-plugin", permissions: ["project.active"] },
        });
        await Promise.resolve();
      });

      // Simulate permission dialog dismissed (prompt goes to null)
      await act(async () => {
        pluginsSubscribeCallback!({ permissionPrompt: null });
        await Promise.resolve();
      });

      expect(webview.reload).toHaveBeenCalled();
    }
  });
});
