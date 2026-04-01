import { WebSocketServer, WebSocket } from "ws";
import {
  getActiveSessions,
  getSessionBuffer,
  writePty,
  closePty,
  hasPty,
  subscribePtyOutput,
} from "./pty.js";
import type { PtySubscriberEvent } from "./pty.js";
import { validateToken, getAuthToken } from "./auth-token.js";
import { PtyOutputSanitizer } from "./pty-output-sanitizer.js";
import { parseAiOutput } from "./ai-output-parser.js";
import { OscParser } from "./osc-parser.js";

export interface WsBridgeOptions {
  port?: number;
  host?: string;
  /** Called when a client requests a new session via WebSocket. Return true if handled. */
  onNewSession?: (sessionType: string, projectPath?: string) => boolean;
  /** Called when a client closes a session via WebSocket. Used to notify the renderer. */
  onCloseSession?: (tabId: string) => void;
  /** Called when a client renames a session via WebSocket. Used to notify the renderer. */
  onRenameSession?: (tabId: string, name: string) => void;
}

export interface WsBridgeStatus {
  running: boolean;
  port: number;
  host: string;
  clients: number;
  token: string;
}

const MAX_MESSAGES_PER_SECOND = 10;
const MAX_CLIENTS = 5;

// Backpressure: max bytes buffered per client before dropping events
const MAX_BUFFERED_AMOUNT = 256 * 1024; // 256KB

// Throttle: batch PTY events per tab into intervals
const BROADCAST_INTERVAL_MS = 100;

// Circuit breaker: consecutive drops before disconnecting a slow client
const MAX_CONSECUTIVE_DROPS = 50;

interface RateLimit {
  count: number;
  resetTime: number;
}

export function createWsBridge(opts?: WsBridgeOptions) {
  const port = opts?.port ?? 9400;
  const host = opts?.host ?? "0.0.0.0";
  const onNewSession = opts?.onNewSession;
  const onCloseSession = opts?.onCloseSession;
  const onRenameSession = opts?.onRenameSession;
  let wss: WebSocketServer | null = null;
  let unsubscribePty: (() => void) | null = null;
  let broadcastTimer: ReturnType<typeof setInterval> | null = null;
  const sanitizer = new PtyOutputSanitizer();

  // Per-session OSC 9 parsers and accumulated clean messages.
  // OSC 9 sequences carry the AI's `last_assistant_message` in markdown format,
  // emitted by notify.sh when FORJA_TERMINAL=1.
  const oscParsers = new Map<string, OscParser>();
  const sessionMessages = new Map<string, string[]>();

  const authenticatedClients = new WeakSet<WebSocket>();
  const clientSubscriptions = new Map<WebSocket, Set<string>>();
  const rateLimits = new Map<WebSocket, RateLimit>();
  const consecutiveDrops = new Map<WebSocket, number>();

  // Pending PTY events batched by tabId (accumulated between broadcast ticks)
  const pendingEvents = new Map<string, PtySubscriberEvent[]>();

  function isRateLimited(ws: WebSocket): boolean {
    const now = Date.now();
    let limit = rateLimits.get(ws);
    if (!limit || now > limit.resetTime) {
      limit = { count: 0, resetTime: now + 1000 };
      rateLimits.set(ws, limit);
    }
    limit.count++;
    return limit.count > MAX_MESSAGES_PER_SECOND;
  }

  function isBackpressured(ws: WebSocket): boolean {
    return ws.bufferedAmount > MAX_BUFFERED_AMOUNT;
  }

  function trackDrop(ws: WebSocket): void {
    const drops = (consecutiveDrops.get(ws) ?? 0) + 1;
    consecutiveDrops.set(ws, drops);

    // Circuit breaker: disconnect clients that are consistently too slow
    if (drops >= MAX_CONSECUTIVE_DROPS) {
      console.warn("[WS Bridge] Circuit breaker: disconnecting slow client");
      ws.close(4003, "Client too slow");
      consecutiveDrops.delete(ws);
    }
  }

  function resetDrops(ws: WebSocket): void {
    consecutiveDrops.delete(ws);
  }

  let flushInProgress = false;

  async function flushPendingEvents(): Promise<void> {
    if (!wss || pendingEvents.size === 0 || flushInProgress) return;
    flushInProgress = true;

    // Snapshot and clear to avoid holding events while we process
    const snapshot = new Map(pendingEvents);
    pendingEvents.clear();

    try {
      for (const [tabId, events] of snapshot) {
        // Merge data events: concatenate data strings into a single broadcast
        let mergedData = "";
        let lastEvent: PtySubscriberEvent | null = null;
        const nonDataEvents: PtySubscriberEvent[] = [];

        for (const event of events) {
          if (event.event === "data" && event.data) {
            mergedData += event.data;
            lastEvent = event;
          } else {
            nonDataEvents.push(event);
          }
        }

        // Write merged data to sanitizer and AWAIT so xterm finishes parsing
        // before we read the screen buffer
        if (mergedData && sanitizer.hasSession(tabId)) {
          await sanitizer.writeAsync(tabId, mergedData);
        }

        const toSend: PtySubscriberEvent[] = [...nonDataEvents];
        if (lastEvent && mergedData) {
          toSend.push({ ...lastEvent, data: mergedData });
        }

        for (const payload of toSend) {
          let extraFields: { cleanText?: string } = {};
          if (payload.event === "data") {
            // Only include cleanText when we have real OSC 9 messages (clean
            // markdown from the AI's last_assistant_message via notify.sh hook).
            // During streaming (before Stop), no cleanText is sent — the mobile
            // falls back to its stripAnsi(data) append mode for live feedback.
            const history = sessionMessages.get(tabId);
            if (history && history.length > 0) {
              extraFields = { cleanText: history.join("\n\n---\n\n") };
            }
          }
          const json = JSON.stringify({ type: "pty-event", ...payload, ...extraFields });

          for (const client of wss!.clients) {
            if (client.readyState !== WebSocket.OPEN) continue;
            if (!authenticatedClients.has(client)) continue;

            const subs = clientSubscriptions.get(client);
            if (!subs || !subs.has(tabId)) continue;

            if (isBackpressured(client)) {
              trackDrop(client);
              continue;
            }

            resetDrops(client);
            client.send(json);
          }
        }
      }
    } finally {
      flushInProgress = false;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleMessage(ws: WebSocket, raw: string): void {
    let msg: any;
    try {
      msg = JSON.parse(raw);
    } catch {
      ws.send(JSON.stringify({ ok: false, error: "Invalid JSON" }));
      return;
    }

    // Rate limit check (applied before auth check)
    if (isRateLimited(ws)) {
      ws.send(JSON.stringify({ ok: false, error: "Rate limited" }));
      return;
    }

    // Auth check: first message or every message must include valid token
    if (!authenticatedClients.has(ws)) {
      if (!msg.token || !validateToken(msg.token)) {
        ws.send(JSON.stringify({ ok: false, error: "Unauthorized" }));
        ws.close(4001, "Unauthorized");
        return;
      }
      authenticatedClients.add(ws);
    }

    const { type } = msg;

    switch (type) {
      case "ping":
        ws.send(JSON.stringify({ ok: true, data: { version: "forja-ws" } }));
        break;

      case "list-sessions":
        ws.send(JSON.stringify({ ok: true, data: getActiveSessions() }));
        break;

      case "session-output": {
        const rawContent = getSessionBuffer(msg.tabId);
        if (rawContent === null) {
          ws.send(JSON.stringify({ ok: false, error: `No session: ${msg.tabId}` }));
        } else {
          // Include cleanText only when OSC 9 messages are available
          const history = sessionMessages.get(msg.tabId);
          const cleanText = history && history.length > 0
            ? history.join("\n\n---\n\n")
            : undefined;
          ws.send(
            JSON.stringify({
              ok: true,
              data: { tabId: msg.tabId, content: rawContent, ...(cleanText != null ? { cleanText } : {}) },
            }),
          );
        }
        break;
      }

      case "session-input":
        if (!msg.tabId || typeof msg.text !== "string") {
          ws.send(JSON.stringify({ ok: false, error: "Missing tabId or text" }));
        } else if (!hasPty(msg.tabId)) {
          ws.send(JSON.stringify({ ok: false, error: `No session: ${msg.tabId}` }));
        } else {
          // Split text and submit char so CLIs that distinguish typed vs pasted
          // input (e.g. bracketed-paste) handle the submit correctly.
          const text = msg.text as string;
          const hasSubmit = text.endsWith("\r") || text.endsWith("\n");
          const body = hasSubmit ? text.slice(0, -1) : text;
          if (body) writePty(msg.tabId, body);
          if (hasSubmit) writePty(msg.tabId, "\r");
          ws.send(JSON.stringify({ ok: true }));
        }
        break;

      case "subscribe": {
        if (!msg.tabId) {
          ws.send(JSON.stringify({ ok: false, error: "Missing tabId" }));
          break;
        }
        let subs = clientSubscriptions.get(ws);
        if (!subs) {
          subs = new Set();
          clientSubscriptions.set(ws, subs);
        }
        subs.add(msg.tabId);

        // Ensure sanitizer has a session for this tabId (may be subscribing to
        // an already-running session that produced output before subscription)
        if (!sanitizer.hasSession(msg.tabId)) {
          sanitizer.addSession(msg.tabId);
          const existingBuffer = getSessionBuffer(msg.tabId);
          if (existingBuffer) {
            sanitizer.write(msg.tabId, existingBuffer);
          }
        }

        ws.send(JSON.stringify({ ok: true, data: { subscribed: msg.tabId } }));
        break;
      }

      case "unsubscribe": {
        const subs = clientSubscriptions.get(ws);
        if (subs) subs.delete(msg.tabId);
        ws.send(JSON.stringify({ ok: true }));
        break;
      }

      case "rename-session":
        if (!msg.tabId || typeof msg.name !== "string") {
          ws.send(JSON.stringify({ ok: false, error: "Missing tabId or name" }));
        } else {
          onRenameSession?.(msg.tabId, msg.name);
          ws.send(JSON.stringify({ ok: true }));
        }
        break;

      case "close-session":
        if (!msg.tabId) {
          ws.send(JSON.stringify({ ok: false, error: "Missing tabId" }));
        } else if (!hasPty(msg.tabId)) {
          ws.send(JSON.stringify({ ok: false, error: `No session: ${msg.tabId}` }));
        } else {
          closePty(msg.tabId);
          onCloseSession?.(msg.tabId);
          ws.send(JSON.stringify({ ok: true }));
        }
        break;

      case "new-session": {
        const validTypes = ["claude", "gemini", "codex", "gh-copilot", "cursor-agent", "terminal"];
        if (!msg.sessionType || !validTypes.includes(msg.sessionType)) {
          ws.send(JSON.stringify({ ok: false, error: `Invalid session type. Valid: ${validTypes.join(", ")}` }));
          break;
        }
        if (!onNewSession) {
          ws.send(JSON.stringify({ ok: false, error: "Session creation not available" }));
          break;
        }
        const handled = onNewSession(msg.sessionType, msg.projectPath as string | undefined);
        if (handled) {
          ws.send(JSON.stringify({ ok: true, data: { sessionType: msg.sessionType } }));
        } else {
          ws.send(JSON.stringify({ ok: false, error: "Failed to create session" }));
        }
        break;
      }

      default:
        ws.send(JSON.stringify({ ok: false, error: "Unknown command" }));
    }
  }

  return {
    start(): Promise<void> {
      if (wss) return Promise.resolve(); // guard: already running
      return new Promise((resolve, reject) => {
        wss = new WebSocketServer({ port, host });

        wss.on("connection", (ws) => {
          // Connection limit check (count includes current connecting client)
          if (wss!.clients.size >= MAX_CLIENTS) {
            ws.send(JSON.stringify({ ok: false, error: "Connection limit reached" }));
            ws.close(4002, "Connection limit");
            return;
          }

          ws.on("message", (data) => handleMessage(ws, data.toString()));
          ws.on("close", () => {
            clientSubscriptions.delete(ws);
            rateLimits.delete(ws);
            consecutiveDrops.delete(ws);
          });
          ws.on("error", () => {
            // Suppress unhandled error events
          });
        });

        // Subscribe to PTY output — buffer events for batched broadcast
        unsubscribePty = subscribePtyOutput((event: PtySubscriberEvent) => {
          if (!wss) return;
          const existing = pendingEvents.get(event.tabId);
          if (existing) {
            existing.push(event);
          } else {
            pendingEvents.set(event.tabId, [event]);
          }

          // Manage sanitizer + OSC parser lifecycle
          if (event.event === "session-start") {
            sanitizer.addSession(event.tabId);
            oscParsers.set(event.tabId, new OscParser());
            sessionMessages.set(event.tabId, []);
          } else if (event.event === "session-exit") {
            sanitizer.removeSession(event.tabId);
            oscParsers.delete(event.tabId);
            // Keep sessionMessages so reconnecting clients can still read history
          } else if (event.event === "resize" && event.cols && event.rows) {
            sanitizer.resize(event.tabId, event.cols, event.rows);
          }

          // Feed raw data to OSC parser to intercept clean markdown messages
          if (event.event === "data" && event.data) {
            const parser = oscParsers.get(event.tabId);
            if (parser) {
              const msgs = parser.feed(event.data);
              if (msgs.length > 0) {
                let history = sessionMessages.get(event.tabId);
                if (!history) {
                  history = [];
                  sessionMessages.set(event.tabId, history);
                }
                history.push(...msgs);
              }
            }
          }
        });

        // Start the broadcast interval timer
        broadcastTimer = setInterval(flushPendingEvents, BROADCAST_INTERVAL_MS);

        wss.on("listening", () => resolve());
        wss.on("error", reject);
      });
    },

    stop(): Promise<void> {
      return new Promise((resolve) => {
        if (broadcastTimer) {
          clearInterval(broadcastTimer);
          broadcastTimer = null;
        }
        pendingEvents.clear();
        sanitizer.dispose();
        oscParsers.clear();
        sessionMessages.clear();

        if (unsubscribePty) {
          unsubscribePty();
          unsubscribePty = null;
        }
        if (!wss) {
          resolve();
          return;
        }
        // Close all client connections
        for (const client of wss.clients) {
          client.close(1001, "Server shutting down");
        }
        clientSubscriptions.clear();
        rateLimits.clear();
        consecutiveDrops.clear();
        wss.close(() => {
          wss = null;
          resolve();
        });
      });
    },

    getStatus(): WsBridgeStatus {
      return {
        running: wss !== null,
        port,
        host,
        clients: wss?.clients.size ?? 0,
        token: getAuthToken(),
      };
    },

    /** Exposed for testing only — returns the underlying WebSocketServer */
    _getWss(): WebSocketServer | null {
      return wss;
    },
  };
}
