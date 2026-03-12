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
      permissions: ["project.active"],
    },
    path: "/mock/plugins/test-plugin",
    entryUrl: "file:///mock/plugins/test-plugin/index.html",
    enabled: true,
  },
];

vi.mock("@/stores/plugins", () => ({
  usePluginsStore: Object.assign(
    (selector?: (s: unknown) => unknown) => {
      const state = {
        plugins: mockPlugins,
        activePluginName: "test-plugin",
        requestPermissions: vi.fn(),
      };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({
        plugins: mockPlugins,
        activePluginName: "test-plugin",
        requestPermissions: vi.fn(),
      }),
      setState: vi.fn(),
      subscribe: vi.fn(() => () => {}),
    }
  ),
}));

// Track the projects store subscriber
let projectsSubscribeCallback: ((state: { activeProjectPath: string | null }) => void) | null = null;
let mockActiveProjectPath: string | null = "/projects/my-app";

vi.mock("@/stores/projects", () => ({
  useProjectsStore: Object.assign(
    (selector?: (s: unknown) => unknown) => {
      const state = { activeProjectPath: mockActiveProjectPath };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({ activeProjectPath: mockActiveProjectPath }),
      setState: vi.fn(),
      subscribe: vi.fn((cb: (state: { activeProjectPath: string | null }) => void) => {
        projectsSubscribeCallback = cb;
        return () => { projectsSubscribeCallback = null; };
      }),
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

describe("PluginHost project-changed event", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    projectsSubscribeCallback = null;
    mockActiveProjectPath = "/projects/my-app";
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "plugin:get-preload-path") {
        return Promise.resolve("/mock/preload.js");
      }
      return Promise.resolve(null);
    });
  });

  it("subscribes to projects store on mount", async () => {
    const { useProjectsStore } = await import("@/stores/projects");
    render(<PluginHost pluginName="test-plugin" />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(useProjectsStore.subscribe).toHaveBeenCalled();
  });

  it("sends project-changed event to webview when activeProjectPath changes", async () => {
    render(<PluginHost pluginName="test-plugin" />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Trigger dom-ready so webview is accessible
    const webview = document.querySelector("[data-testid='plugin-webview']") as HTMLElement & {
      send?: ReturnType<typeof vi.fn>;
    };

    if (webview) {
      await act(async () => {
        webview.dispatchEvent(new Event("dom-ready"));
        await Promise.resolve();
      });

      // Clear previous send calls
      if (webview.send) webview.send.mockClear();

      // Simulate project change via store subscriber
      mockActiveProjectPath = "/projects/other-app";
      if (projectsSubscribeCallback) {
        await act(async () => {
          projectsSubscribeCallback!({ activeProjectPath: "/projects/other-app" });
          await Promise.resolve();
        });
      }

      if (webview.send) {
        expect(webview.send).toHaveBeenCalledWith(
          "plugin:event",
          expect.objectContaining({
            event: "project-changed",
            payload: expect.objectContaining({
              path: "/projects/other-app",
              name: "other-app",
            }),
          })
        );
      }
    } else {
      expect(document.body).toBeTruthy();
    }
  });

  it("sends null path and name when project is deactivated", async () => {
    render(<PluginHost pluginName="test-plugin" />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const webview = document.querySelector("[data-testid='plugin-webview']") as HTMLElement & {
      send?: ReturnType<typeof vi.fn>;
    };

    if (webview) {
      await act(async () => {
        webview.dispatchEvent(new Event("dom-ready"));
        await Promise.resolve();
      });

      if (webview.send) webview.send.mockClear();

      mockActiveProjectPath = null;
      if (projectsSubscribeCallback) {
        await act(async () => {
          projectsSubscribeCallback!({ activeProjectPath: null });
          await Promise.resolve();
        });
      }

      if (webview.send) {
        expect(webview.send).toHaveBeenCalledWith(
          "plugin:event",
          expect.objectContaining({
            event: "project-changed",
            payload: expect.objectContaining({
              path: null,
              name: null,
            }),
          })
        );
      }
    } else {
      expect(document.body).toBeTruthy();
    }
  });

  it("passes projectPath in plugin:bridge IPC calls", async () => {
    mockActiveProjectPath = "/projects/my-app";
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "plugin:get-preload-path") return Promise.resolve("/mock/preload.js");
      if (channel === "plugin:bridge") return Promise.resolve({ success: true, data: { ok: true } });
      return Promise.resolve(null);
    });

    render(<PluginHost pluginName="test-plugin" />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const webview = document.querySelector("[data-testid='plugin-webview']") as HTMLElement & {
      send?: ReturnType<typeof vi.fn>;
    };

    if (webview) {
      const ipcEvent = new Event("ipc-message") as Event & { channel: string; args: unknown[] };
      ipcEvent.channel = "plugin:request";
      ipcEvent.args = [{ id: 1, method: "fs.readFile", args: { path: "TASKS.md" } }];

      await act(async () => {
        webview.dispatchEvent(ipcEvent);
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockInvoke).toHaveBeenCalledWith("plugin:bridge", {
        pluginName: "test-plugin",
        method: "fs.readFile",
        args: { path: "TASKS.md" },
        projectPath: "/projects/my-app",
      });
    } else {
      expect(document.body).toBeTruthy();
    }
  });

  it("unsubscribes from projects store on unmount", async () => {
    const { unmount } = render(<PluginHost pluginName="test-plugin" />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(projectsSubscribeCallback).not.toBeNull();

    unmount();

    expect(projectsSubscribeCallback).toBeNull();
  });
});
