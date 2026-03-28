import * as net from "net";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import type { WebContents } from "electron";

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
  | { type: "new-session"; sessionType: string; projectPath?: string }
  | { type: "switch-project"; index: number };

export type ExternalResponse =
  | { ok: true; data?: unknown }
  | { ok: false; error: string };

export function getSocketPath(): string {
  if (process.platform === "win32") {
    return "\\\\.\\pipe\\forja";
  }
  return path.join(os.tmpdir(), "forja.sock");
}

export function startExternalApiServer(
  getWebContents: () => WebContents | null,
  onCommand: (cmd: ExternalCommand) => Promise<ExternalResponse>,
  socketPath?: string,
): net.Server {
  const resolvedSocketPath = socketPath ?? getSocketPath();

  // Remove stale socket file on Unix before binding
  if (process.platform !== "win32" && fs.existsSync(resolvedSocketPath)) {
    fs.unlinkSync(resolvedSocketPath);
  }

  const server = net.createServer((socket) => {
    let buffer = "";

    socket.on("data", (chunk) => {
      buffer += chunk.toString();

      const lines = buffer.split("\n");
      // Keep the last (potentially incomplete) line in the buffer
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        let cmd: ExternalCommand;
        try {
          cmd = JSON.parse(trimmed) as ExternalCommand;
        } catch {
          const errorResponse: ExternalResponse = {
            ok: false,
            error: "Invalid JSON command",
          };
          socket.write(JSON.stringify(errorResponse) + "\n");
          continue;
        }

        onCommand(cmd)
          .then((response) => {
            if (!socket.destroyed) {
              socket.write(JSON.stringify(response) + "\n");
            }
          })
          .catch(() => {
            if (!socket.destroyed) {
              const errorResponse: ExternalResponse = {
                ok: false,
                error: "Internal error",
              };
              socket.write(JSON.stringify(errorResponse) + "\n");
            }
          });
      }
    });

    // Silently ignore socket errors (disconnects, broken pipes)
    socket.on("error", () => {});
  });

  server.listen(resolvedSocketPath);

  return server;
}
