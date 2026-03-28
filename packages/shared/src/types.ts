/** Active PTY session info exposed via External API and WebSocket */
export interface ActiveSession {
  tabId: string;
  projectPath: string;
  sessionType: string;
}

/** Project info returned by list-projects */
export interface ProjectInfo {
  path: string;
  name: string;
}

/** External API command types (Unix socket + WebSocket) */
export type ExternalCommand =
  | { type: "notify"; message: string; projectPath?: string }
  | { type: "open-project"; projectPath: string }
  | { type: "screenshot" }
  | { type: "list-projects" }
  | { type: "ping" }
  | { type: "list-sessions" }
  | { type: "session-output"; tabId: string }
  | { type: "session-input"; tabId: string; text: string }
  | { type: "subscribe"; tabId: string }
  | { type: "unsubscribe"; tabId: string }
  | { type: "new-session"; sessionType: string; projectPath?: string }
  | { type: "switch-project"; index: number };

/** Standard API response */
export type ApiResponse<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/** WebSocket bridge status */
export interface WsBridgeStatus {
  running: boolean;
  port: number;
  host: string;
  clients: number;
  token: string;
}

/** PTY subscriber event types */
export type PtySubscriberEvent =
  | { event: "data"; tabId: string; data: string }
  | { event: "session-start"; tabId: string; projectPath: string; sessionType: string }
  | { event: "session-exit"; tabId: string; projectPath: string; exitCode: number };
