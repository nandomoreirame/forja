/**
 * Plugin preload implementation — contains all testable logic.
 *
 * This module is imported by plugin-preload.cts (the actual Electron preload
 * script for plugin webviews) and is split out so that Vitest can test the
 * logic directly without needing to process .cts files.
 */

import { contextBridge, ipcRenderer } from "electron";

let requestId = 0;

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

const pendingRequests = new Map<number, PendingRequest>();

// Listen for responses from the host process
ipcRenderer.on(
  "plugin:response",
  (
    _event,
    data: { id: number; success: boolean; result?: unknown; error?: string }
  ) => {
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

function request(
  method: string,
  args?: Record<string, unknown>
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = ++requestId;
    pendingRequests.set(id, { resolve, reject });
    ipcRenderer.sendToHost("plugin:request", { id, method, args: args ?? {} });
  });
}

const eventListeners = new Map<string, Set<(data: unknown) => void>>();

// Listen for events from the host process
ipcRenderer.on(
  "plugin:event",
  (_event, data: { event: string; payload: unknown }) => {
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
