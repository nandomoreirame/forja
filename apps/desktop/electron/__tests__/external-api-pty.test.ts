import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as net from "net";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";

// Mock electron
vi.mock("electron", () => ({
  app: {
    getVersion: vi.fn().mockReturnValue("1.8.7"),
  },
}));

// Mock node-pty
vi.mock("node-pty", () => ({
  spawn: vi.fn(),
}));

// Mock pty sessions
const mockSessions: Map<string, { tabId: string; projectPath: string; sessionType: string; buffer: string }> = new Map();

vi.mock("../pty.js", () => ({
  resolveShellPath: vi.fn(),
  spawnPty: vi.fn(),
  writePty: vi.fn(),
  resizePty: vi.fn(),
  closePty: vi.fn(),
  closeAllPtysForWindow: vi.fn(),
  getSessionBuffer: vi.fn((tabId: string) => {
    const session = mockSessions.get(tabId);
    return session ? session.buffer : null;
  }),
  hasPty: vi.fn((tabId: string) => mockSessions.has(tabId)),
  getAllSessionBuffers: vi.fn(),
  getActiveSessions: vi.fn(() => {
    return Array.from(mockSessions.values()).map((s) => ({
      tabId: s.tabId,
      projectPath: s.projectPath,
      sessionType: s.sessionType,
    }));
  }),
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

describe("external-api PTY commands", () => {
  let server: net.Server | null = null;
  let socketPath: string;
  let onCommand: (cmd: unknown) => Promise<unknown>;

  beforeEach(async () => {
    socketPath = path.join(os.tmpdir(), `forja-pty-test-${process.pid}-${Date.now()}.sock`);
    mockSessions.clear();

    // Import the modules fresh to pick up mocks
    const { getActiveSessions, getSessionBuffer, hasPty, writePty } = await import("../pty.js");
    const { startExternalApiServer } = await import("../external-api.js");

    // Build the onCommand handler (mirrors main.ts logic)
    onCommand = async (cmd: unknown) => {
      const typedCmd = cmd as { type: string; tabId?: string; text?: string };

      switch (typedCmd.type) {
        case "list-sessions": {
          const activeSessions = getActiveSessions();
          return { ok: true, data: activeSessions };
        }

        case "session-output": {
          const content = getSessionBuffer(typedCmd.tabId!);
          if (content === null) {
            return { ok: false, error: `No active session for tabId: ${typedCmd.tabId}` };
          }
          return { ok: true, data: { tabId: typedCmd.tabId, content } };
        }

        case "session-input": {
          if (!hasPty(typedCmd.tabId!)) {
            return { ok: false, error: `No active session for tabId: ${typedCmd.tabId}` };
          }
          writePty(typedCmd.tabId!, typedCmd.text!);
          return { ok: true };
        }

        case "subscribe":
          return { ok: false, error: "subscribe is only available via WebSocket" };

        default:
          return { ok: false, error: "Unknown command" };
      }
    };

    server = startExternalApiServer(
      () => null,
      onCommand as (cmd: import("../external-api.js").ExternalCommand) => Promise<import("../external-api.js").ExternalResponse>,
      socketPath,
    );

    await new Promise<void>((resolve, reject) => {
      if (server!.listening) return resolve();
      server!.once("listening", resolve);
      server!.once("error", reject);
    });
  });

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server!.close(() => resolve());
        server = null;
      });
    }
    if (fs.existsSync(socketPath)) {
      fs.unlinkSync(socketPath);
    }
    vi.resetModules();
  });

  describe("list-sessions", () => {
    it("returns empty array when no sessions are active", async () => {
      const response = await sendCommand(socketPath, { type: "list-sessions" });
      expect(response).toEqual({ ok: true, data: [] });
    });

    it("returns active PTY sessions", async () => {
      mockSessions.set("tab-1", {
        tabId: "tab-1",
        projectPath: "/home/user/project",
        sessionType: "claude",
        buffer: "hello",
      });
      mockSessions.set("tab-2", {
        tabId: "tab-2",
        projectPath: "/home/user/other",
        sessionType: "terminal",
        buffer: "world",
      });

      const response = await sendCommand(socketPath, { type: "list-sessions" });
      expect(response).toMatchObject({
        ok: true,
        data: expect.arrayContaining([
          { tabId: "tab-1", projectPath: "/home/user/project", sessionType: "claude" },
          { tabId: "tab-2", projectPath: "/home/user/other", sessionType: "terminal" },
        ]),
      });
      expect((response as { ok: boolean; data: unknown[] }).data).toHaveLength(2);
    });
  });

  describe("session-output", () => {
    it("returns buffer content for a valid tabId", async () => {
      mockSessions.set("tab-abc", {
        tabId: "tab-abc",
        projectPath: "/home/user/proj",
        sessionType: "claude",
        buffer: "some terminal output here",
      });

      const response = await sendCommand(socketPath, { type: "session-output", tabId: "tab-abc" });
      expect(response).toEqual({
        ok: true,
        data: { tabId: "tab-abc", content: "some terminal output here" },
      });
    });

    it("returns error for unknown tabId", async () => {
      const response = await sendCommand(socketPath, { type: "session-output", tabId: "nonexistent" });
      expect(response).toEqual({
        ok: false,
        error: "No active session for tabId: nonexistent",
      });
    });
  });

  describe("session-input", () => {
    it("writes to PTY and returns ok when session exists", async () => {
      mockSessions.set("tab-xyz", {
        tabId: "tab-xyz",
        projectPath: "/home/user/proj",
        sessionType: "terminal",
        buffer: "",
      });

      const { writePty } = await import("../pty.js");
      const response = await sendCommand(socketPath, { type: "session-input", tabId: "tab-xyz", text: "ls -la\n" });

      expect(response).toEqual({ ok: true });
      expect(writePty).toHaveBeenCalledWith("tab-xyz", "ls -la\n");
    });

    it("returns error when session not found", async () => {
      const response = await sendCommand(socketPath, { type: "session-input", tabId: "missing-tab", text: "hello" });
      expect(response).toEqual({
        ok: false,
        error: "No active session for tabId: missing-tab",
      });
    });
  });

  describe("subscribe", () => {
    it("returns error saying subscribe is only available via WebSocket", async () => {
      const response = await sendCommand(socketPath, { type: "subscribe", tabId: "tab-1" });
      expect(response).toEqual({
        ok: false,
        error: "subscribe is only available via WebSocket",
      });
    });
  });
});
