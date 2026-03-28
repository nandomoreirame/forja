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

interface RateLimit {
  count: number;
  resetTime: number;
}

export function createWsBridge(opts?: WsBridgeOptions) {
  const port = opts?.port ?? 9400;
  const host = opts?.host ?? "0.0.0.0";
  let wss: WebSocketServer | null = null;
  let unsubscribePty: (() => void) | null = null;

  const authenticatedClients = new WeakSet<WebSocket>();
  const clientSubscriptions = new Map<WebSocket, Set<string>>();
  const rateLimits = new Map<WebSocket, RateLimit>();

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
      return new Promise((resolve, reject) => {
        wss = new WebSocketServer({ port, host });

        wss.on("connection", (ws) => {
          // Connection limit check (count includes current connecting client)
          if (wss!.clients.size > MAX_CLIENTS) {
            ws.send(JSON.stringify({ ok: false, error: "Connection limit reached" }));
            ws.close(4002, "Connection limit");
            return;
          }

          ws.on("message", (data) => handleMessage(ws, data.toString()));
          ws.on("close", () => {
            clientSubscriptions.delete(ws);
            rateLimits.delete(ws);
          });
          ws.on("error", () => {
            // Suppress unhandled error events
          });
        });

        // Subscribe to PTY output and broadcast to subscribed clients
        unsubscribePty = subscribePtyOutput((event: PtySubscriberEvent) => {
          if (!wss) return;
          for (const client of wss.clients) {
            if (client.readyState !== WebSocket.OPEN) continue;
            if (!authenticatedClients.has(client)) continue;

            const subs = clientSubscriptions.get(client);
            if (!subs || !subs.has(event.tabId)) continue;

            client.send(JSON.stringify({ type: "pty-event", ...event }));
          }
        });

        wss.on("listening", () => resolve());
        wss.on("error", reject);
      });
    },

    stop(): Promise<void> {
      return new Promise((resolve) => {
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
  };
}
