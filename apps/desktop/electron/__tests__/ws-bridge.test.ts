import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WebSocket } from "ws";

// Mock pty module
vi.mock("../pty.js", () => ({
  getActiveSessions: vi.fn(() => []),
  getSessionBuffer: vi.fn(() => null),
  writePty: vi.fn(),
  closePty: vi.fn(),
  hasPty: vi.fn(() => true),
  subscribePtyOutput: vi.fn(() => () => {}),
}));

// Mock auth-token module
vi.mock("../auth-token.js", () => ({
  getAuthToken: vi.fn(() => "test-token-12345"),
  validateToken: vi.fn((t: string) => t === "test-token-12345"),
}));

// Mock PtyOutputSanitizer to avoid @xterm/headless in test environment
const mockSanitizer = {
  addSession: vi.fn(),
  removeSession: vi.fn(),
  write: vi.fn(),
  writeAsync: vi.fn(() => Promise.resolve()),
  getScreenText: vi.fn(() => ""),
  hasSession: vi.fn(() => false),
  dispose: vi.fn(),
};

vi.mock("../pty-output-sanitizer.js", () => {
  return {
    PtyOutputSanitizer: function PtyOutputSanitizer() {
      return mockSanitizer;
    },
  };
});

// Mock ai-output-parser to return predictable values
vi.mock("../ai-output-parser.js", () => ({
  parseAiOutput: vi.fn((screenText: string) => ({ content: screenText, hadChrome: false })),
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

    // Re-establish sanitizer mock defaults after reset
    mockSanitizer.addSession.mockReset();
    mockSanitizer.removeSession.mockReset();
    mockSanitizer.write.mockReset();
    mockSanitizer.writeAsync.mockReset().mockResolvedValue(undefined);
    mockSanitizer.getScreenText.mockReset().mockReturnValue("");
    mockSanitizer.hasSession.mockReset().mockReturnValue(false);
    mockSanitizer.dispose.mockReset();

    // Re-establish ai-output-parser mock default
    const { parseAiOutput } = await import("../ai-output-parser.js");
    vi.mocked(parseAiOutput).mockImplementation((screenText: string) => ({
      content: screenText,
      hadChrome: false,
    }));

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

  it("responds to list-sessions command with displayName", async () => {
    const { getActiveSessions } = await import("../pty.js");
    vi.mocked(getActiveSessions).mockReturnValue([
      { tabId: "tab-1", projectPath: "/proj/a", sessionType: "claude", displayName: "Claude" },
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
      data: [{ tabId: "tab-1", projectPath: "/proj/a", sessionType: "claude", displayName: "Claude" }],
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
    // Text ending with \n is split: body first, then \r
    expect(writePty).toHaveBeenCalledTimes(2);
    expect(writePty).toHaveBeenNthCalledWith(1, "tab-1", "echo hello");
    expect(writePty).toHaveBeenNthCalledWith(2, "tab-1", "\r");
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

  it("splits text and CR for session-input ending with carriage return", async () => {
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
      text: "hello world\r",
    });

    const response = await receivePromise;
    expect(response).toMatchObject({ ok: true });

    // Should split: first write the body, then write CR separately
    expect(writePty).toHaveBeenCalledTimes(2);
    expect(writePty).toHaveBeenNthCalledWith(1, "tab-1", "hello world");
    expect(writePty).toHaveBeenNthCalledWith(2, "tab-1", "\r");
  });

  it("splits text and CR for session-input ending with newline", async () => {
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
      text: "hello world\n",
    });

    const response = await receivePromise;
    expect(response).toMatchObject({ ok: true });

    // Should split: first write the body, then write CR separately (convert \n to \r for PTY)
    expect(writePty).toHaveBeenCalledTimes(2);
    expect(writePty).toHaveBeenNthCalledWith(1, "tab-1", "hello world");
    expect(writePty).toHaveBeenNthCalledWith(2, "tab-1", "\r");
  });

  it("writes text without split when no trailing newline/CR", async () => {
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
      text: "partial input",
    });

    const response = await receivePromise;
    expect(response).toMatchObject({ ok: true });

    // No split needed — single write
    expect(writePty).toHaveBeenCalledTimes(1);
    expect(writePty).toHaveBeenCalledWith("tab-1", "partial input");
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

  // ─── new-session ──────────────────────────────────────────────────────────

  it("new-session: calls onNewSession callback and returns ok", async () => {
    // Stop default bridge (no onNewSession) and create one with callback
    await bridge.stop();
    const { createWsBridge } = await import("../ws-bridge.js");
    const onNewSession = vi.fn(() => true);
    bridge = createWsBridge({ port: TEST_PORT, onNewSession });
    await bridge.start();

    const ws = await connectClient();

    // Authenticate
    const authReceive = wsReceive(ws);
    wsSend(ws, { type: "ping", token: "test-token-12345" });
    await authReceive;

    const receivePromise = wsReceive(ws);
    wsSend(ws, { type: "new-session", token: "test-token-12345", sessionType: "claude" });

    const response = await receivePromise;
    expect(response).toMatchObject({ ok: true, data: { sessionType: "claude" } });
    expect(onNewSession).toHaveBeenCalledWith("claude", undefined);
  });

  it("new-session: passes projectPath to callback", async () => {
    await bridge.stop();
    const { createWsBridge } = await import("../ws-bridge.js");
    const onNewSession = vi.fn(() => true);
    bridge = createWsBridge({ port: TEST_PORT, onNewSession });
    await bridge.start();

    const ws = await connectClient();

    const authReceive = wsReceive(ws);
    wsSend(ws, { type: "ping", token: "test-token-12345" });
    await authReceive;

    const receivePromise = wsReceive(ws);
    wsSend(ws, {
      type: "new-session",
      token: "test-token-12345",
      sessionType: "terminal",
      projectPath: "/home/user/projects/my-app",
    });

    const response = await receivePromise;
    expect(response).toMatchObject({ ok: true, data: { sessionType: "terminal" } });
    expect(onNewSession).toHaveBeenCalledWith("terminal", "/home/user/projects/my-app");
  });

  it("new-session: returns error when onNewSession callback returns false", async () => {
    await bridge.stop();
    const { createWsBridge } = await import("../ws-bridge.js");
    const onNewSession = vi.fn(() => false);
    bridge = createWsBridge({ port: TEST_PORT, onNewSession });
    await bridge.start();

    const ws = await connectClient();

    const authReceive = wsReceive(ws);
    wsSend(ws, { type: "ping", token: "test-token-12345" });
    await authReceive;

    const receivePromise = wsReceive(ws);
    wsSend(ws, { type: "new-session", token: "test-token-12345", sessionType: "gemini" });

    const response = await receivePromise;
    expect(response).toMatchObject({ ok: false });
  });

  it("new-session: returns error when no onNewSession callback is configured", async () => {
    // Default bridge has no onNewSession
    const ws = await connectClient();

    const authReceive = wsReceive(ws);
    wsSend(ws, { type: "ping", token: "test-token-12345" });
    await authReceive;

    const receivePromise = wsReceive(ws);
    wsSend(ws, { type: "new-session", token: "test-token-12345", sessionType: "claude" });

    const response = await receivePromise;
    expect(response).toMatchObject({ ok: false, error: "Session creation not available" });
  });

  it("new-session: returns error for invalid session type", async () => {
    await bridge.stop();
    const { createWsBridge } = await import("../ws-bridge.js");
    const onNewSession = vi.fn(() => true);
    bridge = createWsBridge({ port: TEST_PORT, onNewSession });
    await bridge.start();

    const ws = await connectClient();

    const authReceive = wsReceive(ws);
    wsSend(ws, { type: "ping", token: "test-token-12345" });
    await authReceive;

    const receivePromise = wsReceive(ws);
    wsSend(ws, { type: "new-session", token: "test-token-12345", sessionType: "unknown-cli" });

    const response = await receivePromise;
    expect(response).toMatchObject({ ok: false });
    expect((response as { error: string }).error).toContain("Invalid session type");
    expect(onNewSession).not.toHaveBeenCalled();
  });

  // ─── close-session ─────────────────────────────────────────────────────

  it("close-session: calls closePty and returns ok", async () => {
    const { closePty, hasPty } = await import("../pty.js");
    vi.mocked(hasPty).mockReturnValue(true);

    const ws = await connectClient();

    const authReceive = wsReceive(ws);
    wsSend(ws, { type: "ping", token: "test-token-12345" });
    await authReceive;

    const receivePromise = wsReceive(ws);
    wsSend(ws, { type: "close-session", token: "test-token-12345", tabId: "tab-1" });

    const response = await receivePromise;
    expect(response).toMatchObject({ ok: true });
    expect(closePty).toHaveBeenCalledWith("tab-1");
  });

  it("close-session: returns error when session not found", async () => {
    const { hasPty } = await import("../pty.js");
    vi.mocked(hasPty).mockReturnValue(false);

    const ws = await connectClient();

    const authReceive = wsReceive(ws);
    wsSend(ws, { type: "ping", token: "test-token-12345" });
    await authReceive;

    const receivePromise = wsReceive(ws);
    wsSend(ws, { type: "close-session", token: "test-token-12345", tabId: "unknown-tab" });

    const response = await receivePromise;
    expect(response).toMatchObject({ ok: false });
  });

  it("close-session: returns error when missing tabId", async () => {
    const ws = await connectClient();

    const authReceive = wsReceive(ws);
    wsSend(ws, { type: "ping", token: "test-token-12345" });
    await authReceive;

    const receivePromise = wsReceive(ws);
    wsSend(ws, { type: "close-session", token: "test-token-12345" });

    const response = await receivePromise;
    expect(response).toMatchObject({ ok: false });
  });

  // ─── rename-session ────────────────────────────────────────────────────

  it("rename-session: calls onRenameSession callback and returns ok", async () => {
    await bridge.stop();
    const { createWsBridge } = await import("../ws-bridge.js");
    const onRenameSession = vi.fn();
    bridge = createWsBridge({ port: TEST_PORT, onRenameSession });
    await bridge.start();

    const ws = await connectClient();

    const authReceive = wsReceive(ws);
    wsSend(ws, { type: "ping", token: "test-token-12345" });
    await authReceive;

    const receivePromise = wsReceive(ws);
    wsSend(ws, { type: "rename-session", token: "test-token-12345", tabId: "tab-1", name: "CLAUDINHO" });

    const response = await receivePromise;
    expect(response).toMatchObject({ ok: true });
    expect(onRenameSession).toHaveBeenCalledWith("tab-1", "CLAUDINHO");
  });

  it("rename-session: returns error when missing tabId or name", async () => {
    const ws = await connectClient();

    const authReceive = wsReceive(ws);
    wsSend(ws, { type: "ping", token: "test-token-12345" });
    await authReceive;

    const receivePromise = wsReceive(ws);
    wsSend(ws, { type: "rename-session", token: "test-token-12345", tabId: "tab-1" });

    const response = await receivePromise;
    expect(response).toMatchObject({ ok: false });
  });

  // ─── PtyOutputSanitizer integration ──────────────────────────────────────

  it("session-output: response includes cleanText only when OSC 9 messages exist", async () => {
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
    // Without OSC 9 messages, no cleanText is sent
    expect(response).toMatchObject({
      ok: true,
      data: { tabId: "tab-1", content: "some terminal output" },
    });
    expect((response as { ok: true; data: { cleanText?: string } }).data.cleanText).toBeUndefined();
  });

  it("session-output: returns content without cleanText when no OSC 9 messages", async () => {
    const { getSessionBuffer } = await import("../pty.js");
    vi.mocked(getSessionBuffer).mockReturnValue("raw buffer data");

    const ws = await connectClient();

    const authReceive = wsReceive(ws);
    wsSend(ws, { type: "ping", token: "test-token-12345" });
    await authReceive;

    const receivePromise = wsReceive(ws);
    wsSend(ws, { type: "session-output", token: "test-token-12345", tabId: "tab-2" });

    const response = await receivePromise;
    expect(response).toMatchObject({ ok: true, data: { tabId: "tab-2", content: "raw buffer data" } });
  });

  it("session-output: does not re-create sanitizer session if already tracked", async () => {
    const { getSessionBuffer } = await import("../pty.js");
    vi.mocked(getSessionBuffer).mockReturnValue("existing output");
    // Pretend session already exists in the sanitizer
    mockSanitizer.hasSession.mockReturnValue(true);
    mockSanitizer.getScreenText.mockReturnValue("existing output");

    const ws = await connectClient();

    // Authenticate
    const authReceive = wsReceive(ws);
    wsSend(ws, { type: "ping", token: "test-token-12345" });
    await authReceive;

    const receivePromise = wsReceive(ws);
    wsSend(ws, { type: "session-output", token: "test-token-12345", tabId: "tab-3" });

    await receivePromise;

    // addSession should NOT be called because hasSession returned true
    expect(mockSanitizer.addSession).not.toHaveBeenCalled();
  });

  it("subscribe: creates sanitizer session and replays buffer for already-running session", async () => {
    const { getSessionBuffer } = await import("../pty.js");
    vi.mocked(getSessionBuffer).mockReturnValue("previously buffered output");
    mockSanitizer.hasSession.mockReturnValue(false);

    const ws = await connectClient();

    // Authenticate
    const authReceive = wsReceive(ws);
    wsSend(ws, { type: "ping", token: "test-token-12345" });
    await authReceive;

    const subReceive = wsReceive(ws);
    wsSend(ws, { type: "subscribe", token: "test-token-12345", tabId: "tab-1" });
    await subReceive;

    expect(mockSanitizer.addSession).toHaveBeenCalledWith("tab-1");
    expect(mockSanitizer.write).toHaveBeenCalledWith("tab-1", "previously buffered output");
  });

  it("subscribe: skips sanitizer session creation when already tracked", async () => {
    mockSanitizer.hasSession.mockReturnValue(true);

    const ws = await connectClient();

    // Authenticate
    const authReceive = wsReceive(ws);
    wsSend(ws, { type: "ping", token: "test-token-12345" });
    await authReceive;

    const subReceive = wsReceive(ws);
    wsSend(ws, { type: "subscribe", token: "test-token-12345", tabId: "tab-1" });
    await subReceive;

    expect(mockSanitizer.addSession).not.toHaveBeenCalled();
    expect(mockSanitizer.write).not.toHaveBeenCalled();
  });

  it("pty-event broadcast: data events omit cleanText when no OSC 9 messages", async () => {
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

    const authReceive = wsReceive(ws);
    wsSend(ws, { type: "ping", token: "test-token-12345" });
    await authReceive;

    const subReceive = wsReceive(ws);
    wsSend(ws, { type: "subscribe", token: "test-token-12345", tabId: "tab-1" });
    await subReceive;

    // Emit data without any OSC 9 messages
    expect(ptyCallback).not.toBeNull();
    ptyCallback!({ event: "data", tabId: "tab-1", data: "raw terminal output" });

    const batchedMsg = await new Promise<unknown>((resolve) => {
      ws.once("message", (data) => resolve(JSON.parse(data.toString())));
    });

    const msg = batchedMsg as { type: string; event: string; tabId: string; data: string; cleanText?: string };
    expect(msg.type).toBe("pty-event");
    expect(msg.event).toBe("data");
    expect(msg.data).toBe("raw terminal output");
    // No OSC 9 messages → no cleanText
    expect(msg.cleanText).toBeUndefined();
  });

  it("pty-event broadcast: feeds data into sanitizer via writeAsync() during flush", async () => {
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

    expect(ptyCallback).not.toBeNull();
    mockSanitizer.hasSession.mockReturnValue(true);
    ptyCallback!({ event: "data", tabId: "tab-1", data: "output chunk" });

    // writeAsync is called during the flush interval, not immediately
    expect(mockSanitizer.writeAsync).not.toHaveBeenCalled();
    // Wait for the flush interval to fire (100ms + processing)
    await new Promise((r) => setTimeout(r, 200));
    expect(mockSanitizer.writeAsync).toHaveBeenCalledWith("tab-1", "output chunk");
  });

  it("pty-event: session-start creates sanitizer session", async () => {
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

    expect(ptyCallback).not.toBeNull();
    ptyCallback!({ event: "session-start", tabId: "tab-new", projectPath: "/proj", sessionType: "claude" });

    expect(mockSanitizer.addSession).toHaveBeenCalledWith("tab-new");
  });

  it("pty-event: session-exit removes sanitizer session", async () => {
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

    expect(ptyCallback).not.toBeNull();
    ptyCallback!({ event: "session-exit", tabId: "tab-old", projectPath: "/proj", exitCode: 0 });

    expect(mockSanitizer.removeSession).toHaveBeenCalledWith("tab-old");
  });

  it("stop(): disposes sanitizer", async () => {
    await bridge.stop();
    expect(mockSanitizer.dispose).toHaveBeenCalled();
  });
});
