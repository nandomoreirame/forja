import { WebSocketServer, WebSocket } from "ws";
import {
  getActiveSessions,
  getSessionBuffer,
  writePty,
  hasPty,
  subscribePtyOutput,
} from "./pty.js";
import type { PtySubscriberEvent } from "./pty.js";
import { validateToken, getAuthToken } from "./auth-token.js";

export interface WsBridgeOptions {
  port?: number;
  host?: string;
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
  let wss: WebSocketServer | null = null;
  let unsubscribePty: (() => void) | null = null;
  let broadcastTimer: ReturnType<typeof setInterval> | null = null;

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

  function flushPendingEvents(): void {
    if (!wss || pendingEvents.size === 0) return;

    for (const [tabId, events] of pendingEvents) {
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

      const toSend: PtySubscriberEvent[] = [...nonDataEvents];
      if (lastEvent && mergedData) {
        toSend.push({ ...lastEvent, data: mergedData });
      }

      for (const payload of toSend) {
        const json = JSON.stringify({ type: "pty-event", ...payload });

        for (const client of wss.clients) {
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

    pendingEvents.clear();
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
        const content = getSessionBuffer(msg.tabId);
        if (content === null) {
          ws.send(JSON.stringify({ ok: false, error: `No session: ${msg.tabId}` }));
        } else {
          ws.send(JSON.stringify({ ok: true, data: { tabId: msg.tabId, content } }));
        }
        break;
      }

      case "session-input":
        if (!msg.tabId || typeof msg.text !== "string") {
          ws.send(JSON.stringify({ ok: false, error: "Missing tabId or text" }));
        } else if (!hasPty(msg.tabId)) {
          ws.send(JSON.stringify({ ok: false, error: `No session: ${msg.tabId}` }));
        } else {
          writePty(msg.tabId, msg.text);
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
        ws.send(JSON.stringify({ ok: true, data: { subscribed: msg.tabId } }));
        break;
      }

      case "unsubscribe": {
        const subs = clientSubscriptions.get(ws);
        if (subs) subs.delete(msg.tabId);
        ws.send(JSON.stringify({ ok: true }));
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
