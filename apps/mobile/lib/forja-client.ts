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
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (event) => {
        const data = JSON.parse(typeof event.data === "string" ? event.data : "{}");
        if (data.type === "pty-event") {
          this.emit("pty-event", data);
        }
      };
      this.ws.onclose = () => this.emit("close", null);
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
        this.ws?.removeEventListener("message", handler);
        resolve(JSON.parse(typeof event.data === "string" ? event.data : "{}"));
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

  getSessionOutput(tabId: string): Promise<ApiResponse<{ tabId: string; content: string }>> {
    return this.send({ type: "session-output", tabId });
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

  on(event: string, callback: (data: unknown) => void): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((cb) => cb(data));
  }
}
