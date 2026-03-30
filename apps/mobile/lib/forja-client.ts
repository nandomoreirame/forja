import type { ApiResponse, ActiveSession } from "@forja/shared";

export class ForjaClient {
  private ws: WebSocket | null = null;
  private token: string;
  private url: string;
  private listeners = new Map<string, Set<(data: unknown) => void>>();

  constructor(host: string, port: number, token: string) {
    this.url = `ws://${host}:${port}`;
    this.token = token;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`[ForjaClient] Connecting to ${this.url}...`);
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => {
        console.log("[ForjaClient] WebSocket connected");
        resolve();
      };
      this.ws.onerror = (e) => {
        console.error("[ForjaClient] WebSocket error:", e);
        reject(new Error(`Connection failed to ${this.url}`));
      };
      this.ws.onmessage = (event) => {
        const data = JSON.parse(typeof event.data === "string" ? event.data : "{}");
        if (data.type === "pty-event") {
          this.emit("pty-event", data);
        }
      };
      this.ws.onclose = (event) => {
        console.log(`[ForjaClient] WebSocket closed: code=${event.code} reason=${event.reason}`);
        this.emit("close", null);
      };
    });
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }

  private send(msg: object): Promise<ApiResponse> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("Not connected"));
        return;
      }
      const handler = (event: MessageEvent) => {
        const data = JSON.parse(typeof event.data === "string" ? event.data : "{}");
        // Skip PTY broadcast events — wait for the actual API response
        if (data.type === "pty-event") return;
        this.ws?.removeEventListener("message", handler);
        resolve(data);
      };
      this.ws.addEventListener("message", handler);
      this.ws.send(JSON.stringify({ token: this.token, ...msg }));
    });
  }

  ping(): Promise<ApiResponse> {
    return this.send({ type: "ping" });
  }

  listSessions(): Promise<ApiResponse<ActiveSession[]>> {
    return this.send({ type: "list-sessions" });
  }

  getSessionOutput(
    tabId: string
  ): Promise<ApiResponse<{ tabId: string; content: string; cleanText?: string }>> {
    return this.send({ type: "session-output", tabId }) as Promise<
      ApiResponse<{ tabId: string; content: string; cleanText?: string }>
    >;
  }

  sendInput(tabId: string, text: string): Promise<ApiResponse> {
    return this.send({ type: "session-input", tabId, text });
  }

  subscribe(tabId: string): Promise<ApiResponse> {
    return this.send({ type: "subscribe", tabId });
  }

  unsubscribe(tabId: string): Promise<ApiResponse> {
    return this.send({ type: "unsubscribe", tabId });
  }

  closeSession(tabId: string): Promise<ApiResponse> {
    return this.send({ type: "close-session", tabId });
  }

  renameSession(tabId: string, name: string): Promise<ApiResponse> {
    return this.send({ type: "rename-session", tabId, name });
  }

  newSession(sessionType: string, projectPath?: string): Promise<ApiResponse<{ sessionType: string }>> {
    return this.send({ type: "new-session", sessionType, ...(projectPath ? { projectPath } : {}) });
  }

  on(event: string, callback: (data: unknown) => void): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((cb) => cb(data));
  }
}
