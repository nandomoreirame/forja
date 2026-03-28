import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as net from "net";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";

// Mock electron (not directly used in external-api but may be imported transitively)
vi.mock("electron", () => ({
  app: {
    getVersion: vi.fn().mockReturnValue("1.8.7"),
  },
}));

// Helper: connect and send a JSON-line command, returns parsed response
function sendCommand(
  socketPath: string,
  cmd: unknown,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(socketPath, () => {
      client.write(JSON.stringify(cmd) + "\n");
    });

    let buffer = "";
    client.on("data", (chunk) => {
      buffer += chunk.toString();
      const newline = buffer.indexOf("\n");
      if (newline !== -1) {
        const line = buffer.slice(0, newline);
        client.destroy();
        try {
          resolve(JSON.parse(line));
        } catch (e) {
          reject(e);
        }
      }
    });

    client.on("error", reject);
  });
}

describe("external-api", () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      configurable: true,
    });
    vi.resetModules();
  });

  // ─── getSocketPath ─────────────────────────────────────────────────────────

  describe("getSocketPath()", () => {
    it("returns a Windows named pipe path on win32", async () => {
      Object.defineProperty(process, "platform", {
        value: "win32",
        configurable: true,
      });
      const { getSocketPath } = await import("../external-api.js");
      expect(getSocketPath()).toBe("\\\\.\\pipe\\forja");
    });

    it("returns tmpdir/forja.sock on Linux", async () => {
      Object.defineProperty(process, "platform", {
        value: "linux",
        configurable: true,
      });
      const { getSocketPath } = await import("../external-api.js");
      expect(getSocketPath()).toBe(path.join(os.tmpdir(), "forja.sock"));
    });

    it("returns tmpdir/forja.sock on macOS", async () => {
      Object.defineProperty(process, "platform", {
        value: "darwin",
        configurable: true,
      });
      const { getSocketPath } = await import("../external-api.js");
      expect(getSocketPath()).toBe(path.join(os.tmpdir(), "forja.sock"));
    });
  });

  // ─── Server lifecycle ──────────────────────────────────────────────────────

  describe("startExternalApiServer()", () => {
    let server: net.Server | null = null;
    let socketPath: string;

    beforeEach(() => {
      // Use a unique temp socket path per test to avoid conflicts
      socketPath = path.join(os.tmpdir(), `forja-test-${process.pid}-${Date.now()}.sock`);
    });

    afterEach(async () => {
      if (server) {
        await new Promise<void>((resolve) => {
          server!.close(() => resolve());
          server = null;
        });
      }
      // Cleanup socket file if it exists
      if (fs.existsSync(socketPath)) {
        fs.unlinkSync(socketPath);
      }
    });

    it("starts and listens on the given socket path", async () => {
      const { startExternalApiServer } = await import("../external-api.js");

      server = startExternalApiServer(
        () => null,
        async () => ({ ok: true }),
        socketPath,
      );

      // Wait for server to be listening
      await new Promise<void>((resolve, reject) => {
        if (server!.listening) return resolve();
        server!.once("listening", resolve);
        server!.once("error", reject);
      });

      expect(server.listening).toBe(true);
    });

    it("responds to ping command with ok: true and version data", async () => {
      const { startExternalApiServer } = await import("../external-api.js");

      server = startExternalApiServer(
        () => null,
        async (cmd) => {
          if (cmd.type === "ping") {
            return { ok: true, data: { version: "1.8.7" } };
          }
          return { ok: false, error: "Unknown command" };
        },
        socketPath,
      );

      await new Promise<void>((resolve, reject) => {
        if (server!.listening) return resolve();
        server!.once("listening", resolve);
        server!.once("error", reject);
      });

      const response = await sendCommand(socketPath, { type: "ping" });
      expect(response).toEqual({ ok: true, data: { version: "1.8.7" } });
    });

    it("returns error for unknown command type", async () => {
      const { startExternalApiServer } = await import("../external-api.js");

      server = startExternalApiServer(
        () => null,
        async () => ({ ok: false, error: "Unknown command" }),
        socketPath,
      );

      await new Promise<void>((resolve, reject) => {
        if (server!.listening) return resolve();
        server!.once("listening", resolve);
        server!.once("error", reject);
      });

      const response = await sendCommand(socketPath, { type: "unknown-command-xyz" });
      expect(response).toEqual({ ok: false, error: "Unknown command" });
    });

    it("returns error for invalid JSON", async () => {
      const { startExternalApiServer } = await import("../external-api.js");

      server = startExternalApiServer(
        () => null,
        async () => ({ ok: true }),
        socketPath,
      );

      await new Promise<void>((resolve, reject) => {
        if (server!.listening) return resolve();
        server!.once("listening", resolve);
        server!.once("error", reject);
      });

      // Send invalid JSON
      const response = await new Promise<unknown>((resolve, reject) => {
        const client = net.createConnection(socketPath, () => {
          client.write("not valid json\n");
        });

        let buffer = "";
        client.on("data", (chunk) => {
          buffer += chunk.toString();
          const newline = buffer.indexOf("\n");
          if (newline !== -1) {
            const line = buffer.slice(0, newline);
            client.destroy();
            try {
              resolve(JSON.parse(line));
            } catch (e) {
              reject(e);
            }
          }
        });

        client.on("error", reject);
      });

      expect(response).toEqual({ ok: false, error: "Invalid JSON command" });
    });

    it("handles multiple commands on a single connection", async () => {
      const { startExternalApiServer } = await import("../external-api.js");
      const received: unknown[] = [];

      server = startExternalApiServer(
        () => null,
        async (cmd) => {
          received.push(cmd);
          return { ok: true, data: { type: cmd.type } };
        },
        socketPath,
      );

      await new Promise<void>((resolve, reject) => {
        if (server!.listening) return resolve();
        server!.once("listening", resolve);
        server!.once("error", reject);
      });

      const responses = await new Promise<unknown[]>((resolve, reject) => {
        const client = net.createConnection(socketPath, () => {
          client.write(JSON.stringify({ type: "ping" }) + "\n");
          client.write(JSON.stringify({ type: "list-projects" }) + "\n");
        });

        const results: unknown[] = [];
        let buffer = "";

        client.on("data", (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.trim()) {
              try {
                results.push(JSON.parse(line));
              } catch (e) {
                reject(e);
                return;
              }
            }
          }

          if (results.length >= 2) {
            client.destroy();
            resolve(results);
          }
        });

        client.on("error", reject);
      });

      expect(responses).toHaveLength(2);
      expect(responses[0]).toEqual({ ok: true, data: { type: "ping" } });
      expect(responses[1]).toEqual({ ok: true, data: { type: "list-projects" } });
    });

    it("removes stale socket file before listening on Unix", async () => {
      // Only relevant on non-Windows
      if (process.platform === "win32") return;

      // Create a fake stale socket file
      fs.writeFileSync(socketPath, "stale");
      expect(fs.existsSync(socketPath)).toBe(true);

      const { startExternalApiServer } = await import("../external-api.js");

      server = startExternalApiServer(
        () => null,
        async () => ({ ok: true }),
        socketPath,
      );

      await new Promise<void>((resolve, reject) => {
        if (server!.listening) return resolve();
        server!.once("listening", resolve);
        server!.once("error", reject);
      });

      // Server started successfully (stale file was removed)
      expect(server.listening).toBe(true);
    });

    it("closes cleanly when close() is called", async () => {
      const { startExternalApiServer } = await import("../external-api.js");

      server = startExternalApiServer(
        () => null,
        async () => ({ ok: true }),
        socketPath,
      );

      await new Promise<void>((resolve, reject) => {
        if (server!.listening) return resolve();
        server!.once("listening", resolve);
        server!.once("error", reject);
      });

      expect(server.listening).toBe(true);

      await new Promise<void>((resolve) => {
        server!.close(() => {
          server = null;
          resolve();
        });
      });
    });
  });
});
