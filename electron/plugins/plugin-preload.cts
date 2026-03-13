/**
 * Plugin preload script for Electron webviews.
 *
 * This CJS module is loaded by Electron as the preload for plugin <webview>
 * elements. It is self-contained (no external requires beyond electron) because
 * plugin-preload-impl.ts compiles to ESM (.js) which cannot be require()-d
 * from CJS. The testable version of this logic lives in plugin-preload-impl.ts
 * which is imported directly by Vitest tests.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge, ipcRenderer } = require("electron");

let requestId = 0;
const pendingRequests = new Map();

ipcRenderer.on(
  "plugin:response",
  (_event: unknown, data: { id: number; success: boolean; result?: unknown; error?: string }) => {
    const pending = pendingRequests.get(data.id);
    if (!pending) return;
    pendingRequests.delete(data.id);
    if (data.success) {
      pending.resolve(data.result);
    } else {
      pending.reject(new Error(data.error ?? "Unknown error"));
    }
  }
);

function request(method: string, args?: Record<string, unknown>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = ++requestId;
    pendingRequests.set(id, { resolve, reject });
    ipcRenderer.sendToHost("plugin:request", { id, method, args: args ?? {} });
  });
}

const eventListeners = new Map<string, Set<(data: unknown) => void>>();

ipcRenderer.on(
  "plugin:event",
  (_event: unknown, data: { event: string; payload: unknown }) => {
    const listeners = eventListeners.get(data.event);
    if (listeners) {
      for (const cb of listeners) {
        try {
          cb(data.payload);
        } catch {
          /* ignore listener errors */
        }
      }
    }
  }
);

contextBridge.exposeInMainWorld("forja", {
  project: {
    getActive: () => request("project.getActive"),
  },
  git: {
    status: () => request("git.status"),
    log: (opts?: { limit?: number }) => request("git.log", opts),
    diff: () => request("git.diff"),
  },
  fs: {
    readFile: (path: string) => request("fs.readFile", { path }),
    writeFile: (path: string, content: string) =>
      request("fs.writeFile", { path, content }),
  },
  terminal: {
    getOutput: () => request("terminal.getOutput"),
    execute: (command: string) => request("terminal.execute", { command }),
  },
  theme: {
    getCurrent: () => request("theme.getCurrent"),
  },
  notifications: {
    show: (opts: { title?: string; body?: string }) =>
      request("notifications.show", opts),
  },
  sidebar: {
    setBadge: (text: string) => request("sidebar.setBadge", { text }),
  },
  on: (event: string, callback: (data: unknown) => void) => {
    if (!eventListeners.has(event)) {
      eventListeners.set(event, new Set());
    }
    eventListeners.get(event)!.add(callback);
    return () => {
      eventListeners.get(event)?.delete(callback);
    };
  },
});
