import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock electron module before any imports
const mockSendToHost = vi.fn();
const mockOn = vi.fn();

vi.mock("electron", () => ({
  contextBridge: {
    exposeInMainWorld: vi.fn(),
  },
  ipcRenderer: {
    sendToHost: mockSendToHost,
    on: mockOn,
  },
}));

describe("plugin-preload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("exposes forja API via contextBridge", async () => {
    const { contextBridge } = await import("electron");
    // Import the preload implementation to trigger the contextBridge call
    await import("../plugins/plugin-preload-impl.js");
    expect(contextBridge.exposeInMainWorld).toHaveBeenCalledWith(
      "forja",
      expect.objectContaining({
        project: expect.objectContaining({
          getActive: expect.any(Function),
        }),
        git: expect.objectContaining({
          status: expect.any(Function),
          log: expect.any(Function),
          diff: expect.any(Function),
        }),
        fs: expect.objectContaining({
          readFile: expect.any(Function),
          writeFile: expect.any(Function),
        }),
        terminal: expect.objectContaining({
          getOutput: expect.any(Function),
          execute: expect.any(Function),
        }),
        theme: expect.objectContaining({
          getCurrent: expect.any(Function),
        }),
        notifications: expect.objectContaining({
          show: expect.any(Function),
        }),
        sidebar: expect.objectContaining({
          setBadge: expect.any(Function),
        }),
        on: expect.any(Function),
      })
    );
  });

  it("registers plugin:response and plugin:event listeners", async () => {
    await import("../plugins/plugin-preload-impl.js");
    const registeredEvents = mockOn.mock.calls.map(
      ([event]: [string]) => event
    );
    expect(registeredEvents).toContain("plugin:response");
    expect(registeredEvents).toContain("plugin:event");
  });

  it("sends plugin:request via sendToHost when an API method is called", async () => {
    const { contextBridge } = await import("electron");
    await import("../plugins/plugin-preload-impl.js");

    const exposedApi = vi.mocked(contextBridge.exposeInMainWorld).mock
      .calls[0][1] as {
      project: { getActive: () => Promise<unknown> };
    };

    // Calling a method should send a plugin:request to the host
    void exposedApi.project.getActive();

    expect(mockSendToHost).toHaveBeenCalledWith(
      "plugin:request",
      expect.objectContaining({
        id: expect.any(Number),
        method: "project.getActive",
        args: {},
      })
    );
  });

  it("resolves request promise when matching plugin:response is received", async () => {
    const { contextBridge } = await import("electron");
    await import("../plugins/plugin-preload-impl.js");

    const exposedApi = vi.mocked(contextBridge.exposeInMainWorld).mock
      .calls[0][1] as {
      git: { status: () => Promise<unknown> };
    };

    // Capture the plugin:response handler registered with ipcRenderer.on
    const responseHandler = mockOn.mock.calls.find(
      ([event]: [string]) => event === "plugin:response"
    )?.[1] as
      | ((_event: unknown, data: unknown) => void)
      | undefined;

    expect(responseHandler).toBeDefined();

    // Start a request and capture the id
    const promise = exposedApi.git.status();
    const sentCall = mockSendToHost.mock.calls[0];
    const requestData = sentCall[1] as { id: number };

    // Simulate the host responding to this request
    responseHandler!(null, {
      id: requestData.id,
      success: true,
      result: { branch: "main", files: [] },
    });

    const result = await promise;
    expect(result).toEqual({ branch: "main", files: [] });
  });

  it("rejects request promise when plugin:response indicates failure", async () => {
    const { contextBridge } = await import("electron");
    await import("../plugins/plugin-preload-impl.js");

    const exposedApi = vi.mocked(contextBridge.exposeInMainWorld).mock
      .calls[0][1] as {
      fs: { readFile: (path: string) => Promise<unknown> };
    };

    const responseHandler = mockOn.mock.calls.find(
      ([event]: [string]) => event === "plugin:response"
    )?.[1] as
      | ((_event: unknown, data: unknown) => void)
      | undefined;

    const promise = exposedApi.fs.readFile("secret.txt");
    const sentCall = mockSendToHost.mock.calls[0];
    const requestData = sentCall[1] as { id: number };

    // Simulate failure response
    responseHandler!(null, {
      id: requestData.id,
      success: false,
      error: "Permission denied",
    });

    await expect(promise).rejects.toThrow("Permission denied");
  });

  it("calls event listeners when plugin:event is received", async () => {
    const { contextBridge } = await import("electron");
    await import("../plugins/plugin-preload-impl.js");

    const exposedApi = vi.mocked(contextBridge.exposeInMainWorld).mock
      .calls[0][1] as {
      on: (event: string, cb: (data: unknown) => void) => () => void;
    };

    const callback = vi.fn();
    exposedApi.on("theme:changed", callback);

    const eventHandler = mockOn.mock.calls.find(
      ([event]: [string]) => event === "plugin:event"
    )?.[1] as
      | ((_event: unknown, data: unknown) => void)
      | undefined;

    eventHandler!(null, {
      event: "theme:changed",
      payload: { theme: "dracula" },
    });

    expect(callback).toHaveBeenCalledWith({ theme: "dracula" });
  });

  it("returns an unsubscribe function from on()", async () => {
    const { contextBridge } = await import("electron");
    await import("../plugins/plugin-preload-impl.js");

    const exposedApi = vi.mocked(contextBridge.exposeInMainWorld).mock
      .calls[0][1] as {
      on: (event: string, cb: (data: unknown) => void) => () => void;
    };

    const callback = vi.fn();
    const unsubscribe = exposedApi.on("project:changed", callback);

    const eventHandler = mockOn.mock.calls.find(
      ([event]: [string]) => event === "plugin:event"
    )?.[1] as
      | ((_event: unknown, data: unknown) => void)
      | undefined;

    // Unsubscribe before event fires
    unsubscribe();

    eventHandler!(null, {
      event: "project:changed",
      payload: { path: "/new/project" },
    });

    // Callback should NOT have been called after unsubscription
    expect(callback).not.toHaveBeenCalled();
  });

  it("CTS preload exposes the same API namespaces as the impl", () => {
    // Both files must expose identical top-level API keys in the forja object.
    // This catches drift where sidebar (or any other API) is added to the
    // impl but forgotten in the actual .cts preload loaded by Electron.
    const implPath = resolve(__dirname, "../plugins/plugin-preload-impl.ts");
    const ctsPath = resolve(__dirname, "../plugins/plugin-preload.cts");

    const implSource = readFileSync(implPath, "utf-8");
    const ctsSource = readFileSync(ctsPath, "utf-8");

    // Extract top-level keys from exposeInMainWorld("forja", { ... })
    // Pattern: word followed by colon and opening brace or arrow/function
    const extractApiKeys = (source: string): string[] => {
      // Find the exposeInMainWorld block
      const match = source.match(/exposeInMainWorld\("forja",\s*\{([\s\S]*)\}\s*\)/);
      if (!match) return [];
      const body = match[1];
      // Extract top-level property names (key: { or key: () =>)
      const keys: string[] = [];
      const re = /^\s{2,4}(\w+)\s*:/gm;
      let m;
      while ((m = re.exec(body)) !== null) {
        keys.push(m[1]);
      }
      return [...new Set(keys)];
    };

    const implKeys = extractApiKeys(implSource);
    const ctsKeys = extractApiKeys(ctsSource);

    expect(implKeys.length).toBeGreaterThan(0);
    expect(ctsKeys).toEqual(expect.arrayContaining(implKeys));
    expect(implKeys).toEqual(expect.arrayContaining(ctsKeys));
  });

  it("sends sidebar.setBadge request via sendToHost", async () => {
    const { contextBridge } = await import("electron");
    await import("../plugins/plugin-preload-impl.js");

    const exposedApi = vi.mocked(contextBridge.exposeInMainWorld).mock
      .calls[0][1] as {
      sidebar: { setBadge: (text: string) => Promise<unknown> };
    };

    void exposedApi.sidebar.setBadge("12:30");

    expect(mockSendToHost).toHaveBeenCalledWith(
      "plugin:request",
      expect.objectContaining({
        id: expect.any(Number),
        method: "sidebar.setBadge",
        args: { text: "12:30" },
      })
    );
  });

  it("ignores plugin:response with unknown request id", async () => {
    await import("../plugins/plugin-preload-impl.js");

    const responseHandler = mockOn.mock.calls.find(
      ([event]: [string]) => event === "plugin:response"
    )?.[1] as
      | ((_event: unknown, data: unknown) => void)
      | undefined;

    // Should not throw for unknown id
    expect(() => {
      responseHandler!(null, { id: 99999, success: true, result: null });
    }).not.toThrow();
  });
});
