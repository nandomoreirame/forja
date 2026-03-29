import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WebSocket } from "ws";

// Mock pty module
vi.mock("../pty.js", () => ({
  getActiveSessions: vi.fn(() => []),
  getSessionBuffer: vi.fn(() => null),
  writePty: vi.fn(),
  hasPty: vi.fn(() => true),
  subscribePtyOutput: vi.fn(() => () => {}),
}));

// Mock auth-token module
vi.mock("../auth-token.js", () => ({
  getAuthToken: vi.fn(() => "test-token-12345"),
  validateToken: vi.fn((t: string) => t === "test-token-12345"),
}));

const TEST_PORT = 19401;

function wsConnect(port: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    ws.once("open", () => resolve(ws));
    ws.once("error", reject);
  });
}

function wsSend(ws: WebSocket, msg: object): void {
  ws.send(JSON.stringify(msg));
}

function wsReceive(ws: WebSocket): Promise<unknown> {
  return new Promise((resolve, reject) => {
    ws.once("message", (data) => {
      try {
        resolve(JSON.parse(data.toString()));
      } catch (e) {
        reject(e);
      }
    });
    ws.once("error", reject);
  });
}

function wsClose(ws: WebSocket): Promise<void> {
  return new Promise((resolve) => {
    if (ws.readyState === WebSocket.CLOSED) {
      resolve();
      return;
    }
    ws.once("close", () => resolve());
    ws.close();
  });
}

describe("ws-bridge", () => {
  let bridge: ReturnType<typeof import("../ws-bridge.js")["createWsBridge"]>;
  const openClients: WebSocket[] = [];

  beforeEach(async () => {
    vi.resetAllMocks();

    // Re-establish default mock return values after reset
    const { getActiveSessions, getSessionBuffer, hasPty, subscribePtyOutput } = await import("../pty.js");
    vi.mocked(getActiveSessions).mockReturnValue([]);
    vi.mocked(getSessionBuffer).mockReturnValue(null);
    vi.mocked(hasPty).mockReturnValue(true);
    vi.mocked(subscribePtyOutput).mockReturnValue(() => {});

    const { createWsBridge } = await import("../ws-bridge.js");
    bridge = createWsBridge({ port: TEST_PORT });
    await bridge.start();
  });

  afterEach(async () => {
    // Close all open client connections
    for (const ws of openClients) {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.terminate();
      }
    }
    openClients.length = 0;
    await bridge.stop();
    vi.resetModules();
  });

  async function connectClient(): Promise<WebSocket> {
    const ws = await wsConnect(TEST_PORT);
    openClients.push(ws);
    return ws;
  }

  // ─── Auth ────────────────────────────────────────────────────────────────

  it("rejects connection without auth token", async () => {
    const ws = await connectClient();
    const receivePromise = wsReceive(ws);

    wsSend(ws, { type: "ping" }); // no token

    const response = await receivePromise;
    expect(response).toMatchObject({ ok: false, error: "Unauthorized" });
  });

  it("rejects connection with invalid token", async () => {
    const ws = await connectClient();
    const receivePromise = wsReceive(ws);

    wsSend(ws, { type: "ping", token: "wrong-token" });

    const response = await receivePromise;
    expect(response).toMatchObject({ ok: false, error: "Unauthorized" });
  });

  // ─── ping ────────────────────────────────────────────────────────────────

  it("accepts ping with valid token", async () => {
    const ws = await connectClient();
    const receivePromise = wsReceive(ws);

    wsSend(ws, { type: "ping", token: "test-token-12345" });

    const response = await receivePromise;
    expect(response).toMatchObject({ ok: true, data: { version: "forja-ws" } });
  });

  // ─── list-sessions ────────────────────────────────────────────────────────

  it("responds to list-sessions command", async () => {
    const { getActiveSessions } = await import("../pty.js");
    vi.mocked(getActiveSessions).mockReturnValue([
      { tabId: "tab-1", projectPath: "/proj/a", sessionType: "claude" },
    ]);

    const ws = await connectClient();

    // Authenticate first
    const authReceive = wsReceive(ws);
    wsSend(ws, { type: "ping", token: "test-token-12345" });
    await authReceive;

    // Now send list-sessions (already authenticated)
    const receivePromise = wsReceive(ws);
    wsSend(ws, { type: "list-sessions", token: "test-token-12345" });

    const response = await receivePromise;
    expect(response).toMatchObject({
      ok: true,
      data: [{ tabId: "tab-1", projectPath: "/proj/a", sessionType: "claude" }],
    });
  });

  it("responds to list-sessions with empty array when no sessions", async () => {
    const ws = await connectClient();

    // Authenticate
    const authReceive = wsReceive(ws);
    wsSend(ws, { type: "ping", token: "test-token-12345" });
    await authReceive;

    const receivePromise = wsReceive(ws);
    wsSend(ws, { type: "list-sessions", token: "test-token-12345" });

    const response = await receivePromise;
    expect(response).toMatchObject({ ok: true, data: [] });
  });

  // ─── session-output ───────────────────────────────────────────────────────

  it("responds to session-output command with buffer content", async () => {
    const { getSessionBuffer } = await import("../pty.js");
    vi.mocked(getSessionBuffer).mockReturnValue("some terminal output");

    const ws = await connectClient();

    // Authenticate
    const authReceive = wsReceive(ws);
    wsSend(ws, { type: "ping", token: "test-token-12345" });
    await authReceive;

    const receivePromise = wsReceive(ws);
    wsSend(ws, { type: "session-output", token: "test-token-12345", tabId: "tab-1" });

    const response = await receivePromise;
    expect(response).toMatchObject({
      ok: true,
      data: { tabId: "tab-1", content: "some terminal output" },
    });
  });

  it("returns error for session-output when session not found", async () => {
    const { getSessionBuffer } = await import("../pty.js");
    vi.mocked(getSessionBuffer).mockReturnValue(null);

    const ws = await connectClient();

    // Authenticate
    const authReceive = wsReceive(ws);
    wsSend(ws, { type: "ping", token: "test-token-12345" });
    await authReceive;

    const receivePromise = wsReceive(ws);
    wsSend(ws, { type: "session-output", token: "test-token-12345", tabId: "unknown-tab" });

    const response = await receivePromise;
    expect(response).toMatchObject({ ok: false });
    expect((response as { error: string }).error).toContain("unknown-tab");
  });

  // ─── session-input ────────────────────────────────────────────────────────

  it("responds to session-input command", async () => {
    const { writePty, hasPty } = await import("../pty.js");
    vi.mocked(hasPty).mockReturnValue(true);

    const ws = await connectClient();

    // Authenticate
    const authReceive = wsReceive(ws);
    wsSend(ws, { type: "ping", token: "test-token-12345" });
    await authReceive;

    const receivePromise = wsReceive(ws);
    wsSend(ws, {
      type: "session-input",
      token: "test-token-12345",
      tabId: "tab-1",
      text: "echo hello\n",
    });

    const response = await receivePromise;
    expect(response).toMatchObject({ ok: true });
    expect(writePty).toHaveBeenCalledWith("tab-1", "echo hello\n");
  });

  it("returns error for session-input when session not found", async () => {
    const { hasPty } = await import("../pty.js");
    vi.mocked(hasPty).mockReturnValue(false);

    const ws = await connectClient();

    // Authenticate
    const authReceive = wsReceive(ws);
    wsSend(ws, { type: "ping", token: "test-token-12345" });
    await authReceive;

    const receivePromise = wsReceive(ws);
    wsSend(ws, {
      type: "session-input",
      token: "test-token-12345",
      tabId: "unknown-tab",
      text: "hello",
    });

    const response = await receivePromise;
    expect(response).toMatchObject({ ok: false });
  });

  it("returns error for session-input when missing tabId", async () => {
    const ws = await connectClient();

    // Authenticate
    const authReceive = wsReceive(ws);
    wsSend(ws, { type: "ping", token: "test-token-12345" });
    await authReceive;

    const receivePromise = wsReceive(ws);
    wsSend(ws, { type: "session-input", token: "test-token-12345", text: "hello" });

    const response = await receivePromise;
    expect(response).toMatchObject({ ok: false });
  });

  // ─── unknown command ──────────────────────────────────────────────────────

  it("returns error for unknown command", async () => {
    const ws = await connectClient();

    // Authenticate
    const authReceive = wsReceive(ws);
    wsSend(ws, { type: "ping", token: "test-token-12345" });
    await authReceive;

    const receivePromise = wsReceive(ws);
    wsSend(ws, { type: "unknown-xyz-command", token: "test-token-12345" });

    const response = await receivePromise;
    expect(response).toMatchObject({ ok: false, error: "Unknown command" });
  });

  // ─── getStatus ────────────────────────────────────────────────────────────

  it("getStatus() returns running state, port, and client count", async () => {
    const ws = await connectClient();

    // Give the server time to register the connection
    await new Promise((r) => setTimeout(r, 50));

    const status = bridge.getStatus();
    expect(status.running).toBe(true);
    expect(status.port).toBe(TEST_PORT);
    expect(status.clients).toBeGreaterThanOrEqual(1);
    expect(status.token).toBe("test-token-12345");
  });

  it("getStatus() returns running: false before start", async () => {
    // Stop current bridge
    await bridge.stop();

    const { createWsBridge } = await import("../ws-bridge.js");
    const freshBridge = createWsBridge({ port: TEST_PORT + 1 });

    const status = freshBridge.getStatus();
    expect(status.running).toBe(false);
  });

  // ─── stop ─────────────────────────────────────────────────────────────────

  it("stop() disconnects all clients and stops server", async () => {
    const ws = await connectClient();

    // Wait for connection to be established
    await new Promise((r) => setTimeout(r, 50));

    const closedPromise = wsClose(ws);
    await bridge.stop();

    // Client should be closed
    await closedPromise;

    const status = bridge.getStatus();
    expect(status.running).toBe(false);
    expect(status.clients).toBe(0);
  });

  // ─── Invalid JSON ─────────────────────────────────────────────────────────

  it("returns error for invalid JSON", async () => {
    const ws = await connectClient();
    const receivePromise = wsReceive(ws);

    ws.send("not-valid-json");

    const response = await receivePromise;
    expect(response).toMatchObject({ ok: false, error: "Invalid JSON" });
  });

  // ─── Rate limiting ────────────────────────────────────────────────────────

  it("rate limiting: rejects messages exceeding 10 msg/second", async () => {
    const ws = await connectClient();

    // Authenticate first
    const authReceive = wsReceive(ws);
    wsSend(ws, { type: "ping", token: "test-token-12345" });
    await authReceive;

    // Send 11 messages rapidly (already sent 1 ping above)
    // We need to exceed 10 msg/second in a single second window
    // The rate limit resets when a new second starts
    const responses: unknown[] = [];

    // Collect all responses
    const collectResponses = new Promise<void>((resolve) => {
      ws.on("message", (data) => {
        responses.push(JSON.parse(data.toString()));
        if (responses.length >= 11) resolve();
      });
    });

    // Send 11 more messages quickly
    for (let i = 0; i < 11; i++) {
      wsSend(ws, { type: "ping", token: "test-token-12345" });
    }

    await collectResponses;

    // At least one response should be rate limited
    const rateLimited = responses.some(
      (r) => (r as { ok: boolean; error?: string }).ok === false &&
              (r as { error?: string }).error === "Rate limited"
    );
    expect(rateLimited).toBe(true);
  });

  // ─── Connection limit ─────────────────────────────────────────────────────

  it("connection limit: rejects connection when max reached (max 5)", async () => {
    // Open 5 connections (the maximum allowed)
    const connections: WebSocket[] = [];
    for (let i = 0; i < 5; i++) {
      const ws = await connectClient();
      connections.push(ws);
    }

    // Wait for all to be established
    await new Promise((r) => setTimeout(r, 50));

    // The next connection should be rejected (>= MAX_CLIENTS)
    const sixthWs = new WebSocket(`ws://localhost:${TEST_PORT}`);
    openClients.push(sixthWs);

    const rejectionResponse = await new Promise<unknown>((resolve) => {
      sixthWs.once("message", (data) => {
        resolve(JSON.parse(data.toString()));
      });
      // Also handle close event in case server closes without message
      sixthWs.once("close", () => {
        resolve({ ok: false, error: "Connection limit reached" });
      });
    });

    expect((rejectionResponse as { ok: boolean }).ok).toBe(false);
  });

  // ─── Backpressure & batching ─────────────────────────────────────────────

  it("batches PTY events and delivers them on interval", async () => {
    // Capture the PTY subscriber callback registered by the bridge
    const { subscribePtyOutput } = await import("../pty.js");
    let ptyCallback: ((event: import("../pty.js").PtySubscriberEvent) => void) | null = null;
    vi.mocked(subscribePtyOutput).mockImplementation((fn) => {
      ptyCallback = fn;
      return () => {};
    });

    // Restart bridge to pick up our mock
    await bridge.stop();
    const { createWsBridge } = await import("../ws-bridge.js");
    bridge = createWsBridge({ port: TEST_PORT });
    await bridge.start();

    const ws = await connectClient();

    // Authenticate
    const authReceive = wsReceive(ws);
    wsSend(ws, { type: "ping", token: "test-token-12345" });
    await authReceive;

    // Subscribe to a tab
    const subReceive = wsReceive(ws);
    wsSend(ws, { type: "subscribe", token: "test-token-12345", tabId: "tab-1" });
    await subReceive;

    // Emit multiple PTY data events rapidly (simulating heavy CLI output)
    expect(ptyCallback).not.toBeNull();
    ptyCallback!({ event: "data", tabId: "tab-1", data: "chunk-1-" });
    ptyCallback!({ event: "data", tabId: "tab-1", data: "chunk-2-" });
    ptyCallback!({ event: "data", tabId: "tab-1", data: "chunk-3-" });

    // Events should NOT arrive immediately (they are batched)
    const immediateCheck = new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => resolve(false), 20);
      ws.once("message", () => {
        clearTimeout(timeout);
        resolve(true);
      });
    });
    const receivedImmediately = await immediateCheck;
    expect(receivedImmediately).toBe(false);

    // Wait for the broadcast interval to flush (100ms + margin)
    const batchedMsg = await new Promise<unknown>((resolve) => {
      ws.once("message", (data) => resolve(JSON.parse(data.toString())));
    });

    // Should receive merged data in a single message
    const msg = batchedMsg as { type: string; event: string; tabId: string; data: string };
    expect(msg.type).toBe("pty-event");
    expect(msg.tabId).toBe("tab-1");
    expect(msg.data).toBe("chunk-1-chunk-2-chunk-3-");
  });

  it("drops events for backpressured clients instead of buffering", async () => {
    const { subscribePtyOutput } = await import("../pty.js");
    let ptyCallback: ((event: import("../pty.js").PtySubscriberEvent) => void) | null = null;
    vi.mocked(subscribePtyOutput).mockImplementation((fn) => {
      ptyCallback = fn;
      return () => {};
    });

    await bridge.stop();
    const { createWsBridge } = await import("../ws-bridge.js");
    bridge = createWsBridge({ port: TEST_PORT });
    await bridge.start();

    const ws = await connectClient();

    // Authenticate and subscribe
    const authReceive = wsReceive(ws);
    wsSend(ws, { type: "ping", token: "test-token-12345" });
    await authReceive;

    const subReceive = wsReceive(ws);
    wsSend(ws, { type: "subscribe", token: "test-token-12345", tabId: "tab-1" });
    await subReceive;

    // Wait for server to register the connection
    await new Promise((r) => setTimeout(r, 50));

    // Get the server-side WebSocket and simulate backpressure on it
    const serverWss = bridge._getWss()!;
    for (const serverWs of serverWss.clients) {
      Object.defineProperty(serverWs, "bufferedAmount", { get: () => 512 * 1024, configurable: true });
    }

    // Emit PTY event
    ptyCallback!({ event: "data", tabId: "tab-1", data: "should-be-dropped" });

    // Wait for broadcast interval
    const received = await new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => resolve(false), 200);
      ws.once("message", () => {
        clearTimeout(timeout);
        resolve(true);
      });
    });

    // Message should be dropped due to backpressure
    expect(received).toBe(false);
  });

  it("circuit breaker disconnects clients after too many consecutive drops", { timeout: 15000 }, async () => {
    const { subscribePtyOutput } = await import("../pty.js");
    let ptyCallback: ((event: import("../pty.js").PtySubscriberEvent) => void) | null = null;
    vi.mocked(subscribePtyOutput).mockImplementation((fn) => {
      ptyCallback = fn;
      return () => {};
    });

    await bridge.stop();
    const { createWsBridge } = await import("../ws-bridge.js");
    bridge = createWsBridge({ port: TEST_PORT });
    await bridge.start();

    const ws = await connectClient();

    // Authenticate and subscribe
    const authReceive = wsReceive(ws);
    wsSend(ws, { type: "ping", token: "test-token-12345" });
    await authReceive;

    const subReceive = wsReceive(ws);
    wsSend(ws, { type: "subscribe", token: "test-token-12345", tabId: "tab-1" });
    await subReceive;

    // Wait for server to register the connection
    await new Promise((r) => setTimeout(r, 50));

    // Simulate permanently backpressured server-side socket
    const serverWss = bridge._getWss()!;
    for (const serverWs of serverWss.clients) {
      Object.defineProperty(serverWs, "bufferedAmount", { get: () => 512 * 1024, configurable: true });
    }

    const closePromise = new Promise<number>((resolve) => {
      ws.on("close", (code) => resolve(code));
    });

    // Emit events across multiple broadcast intervals to accumulate drops
    // Each interval flushes pending events, and each flush with backpressure increments drops.
    // We need 50 consecutive drops (MAX_CONSECUTIVE_DROPS).
    for (let i = 0; i < 50; i++) {
      ptyCallback!({ event: "data", tabId: "tab-1", data: `chunk-${i}` });
      // Wait for broadcast interval to flush and count the drop
      await new Promise((r) => setTimeout(r, 110));
    }

    const closeCode = await Promise.race([
      closePromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 500)),
    ]);

    // Client should have been disconnected by circuit breaker with code 4003
    expect(closeCode).toBe(4003);
  });

  it("non-data events (session-start, session-exit) are not merged with data", async () => {
    const { subscribePtyOutput } = await import("../pty.js");
    let ptyCallback: ((event: import("../pty.js").PtySubscriberEvent) => void) | null = null;
    vi.mocked(subscribePtyOutput).mockImplementation((fn) => {
      ptyCallback = fn;
      return () => {};
    });

    await bridge.stop();
    const { createWsBridge } = await import("../ws-bridge.js");
    bridge = createWsBridge({ port: TEST_PORT });
    await bridge.start();

    const ws = await connectClient();

    // Authenticate and subscribe
    const authReceive = wsReceive(ws);
    wsSend(ws, { type: "ping", token: "test-token-12345" });
    await authReceive;

    const subReceive = wsReceive(ws);
    wsSend(ws, { type: "subscribe", token: "test-token-12345", tabId: "tab-1" });
    await subReceive;

    // Emit a session-exit event
    ptyCallback!({ event: "session-exit", tabId: "tab-1", exitCode: 0 });

    // Collect messages from the next broadcast
    const messages: unknown[] = [];
    const collectDone = new Promise<void>((resolve) => {
      ws.on("message", (data) => {
        messages.push(JSON.parse(data.toString()));
        resolve();
      });
    });

    await collectDone;

    const exitMsg = messages[0] as { type: string; event: string; exitCode: number };
    expect(exitMsg.type).toBe("pty-event");
    expect(exitMsg.event).toBe("session-exit");
    expect(exitMsg.exitCode).toBe(0);
  });
});
