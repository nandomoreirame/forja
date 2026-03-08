import { spawn, type ChildProcess } from "child_process";

type ChatCliId = "claude" | "codex" | "gemini" | "cursor-agent";

export interface CliArgs {
  binary: string;
  args: string[];
  env?: Record<string, string>;
  mode: "persistent" | "per-message";
  promptFlag?: string;
}

export interface StreamEvent {
  type: string;
  [key: string]: unknown;
}

export interface ChatSession {
  id: string;
  process: ChildProcess | null;
  cliId: ChatCliId;
  projectPath: string;
  cliArgs: CliArgs;
  onEvent: (event: StreamEvent) => void;
  onExit: (code: number | null) => void;
}

const sessions = new Map<string, ChatSession>();

export function buildCliArgs(
  cliId: string,
  _projectPath: string
): CliArgs | null {
  switch (cliId) {
    case "claude":
      return {
        binary: "claude",
        args: [
          "--input-format", "stream-json",
          "--output-format", "stream-json",
          "--verbose",
          "--max-turns", "1",
        ],
        mode: "persistent",
      };
    case "gemini":
      return {
        binary: "gemini",
        args: ["--output-format", "stream-json"],
        mode: "per-message",
        promptFlag: "-p",
      };
    case "codex":
      return {
        binary: "codex",
        args: ["exec", "--json"],
        mode: "per-message",
      };
    case "cursor-agent":
      return {
        binary: "cursor-agent",
        args: ["--print", "--output-format", "stream-json"],
        mode: "per-message",
      };
    default:
      return null;
  }
}

export function parseStreamEvent(line: string): StreamEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as StreamEvent;
  } catch {
    return null;
  }
}

function processLine(line: string, session: ChatSession): void {
  const trimmed = line.trim();
  if (!trimmed) return;

  const event = parseStreamEvent(line);
  if (event) {
    session.onEvent(event);
  } else {
    session.onEvent({ type: "text", text: trimmed });
  }
}

function createLineHandler(
  session: ChatSession,
  jsonOnly: boolean,
): { handleData: (data: Buffer) => void; flush: () => void } {
  let buffer = "";

  return {
    handleData(data: Buffer) {
      buffer += data.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (jsonOnly) {
          // stderr: only forward valid JSON (errors, structured events)
          const event = parseStreamEvent(line);
          if (event) session.onEvent(event);
        } else {
          processLine(line, session);
        }
      }
    },
    flush() {
      if (!buffer.trim()) return;
      if (jsonOnly) {
        const event = parseStreamEvent(buffer);
        if (event) session.onEvent(event);
      } else {
        processLine(buffer, session);
      }
      buffer = "";
    },
  };
}

function attachProcessHandlers(
  proc: ChildProcess,
  session: ChatSession
): void {
  const stdout = createLineHandler(session, false);
  const stderr = createLineHandler(session, true);

  proc.stdout?.on("data", stdout.handleData);
  proc.stderr?.on("data", stderr.handleData);

  proc.on("error", (err) => {
    session.onEvent({ type: "error", message: err.message });
  });

  proc.on("exit", (code) => {
    // Flush remaining buffers before signaling exit
    stdout.flush();
    stderr.flush();

    if (session.cliArgs.mode === "persistent") {
      sessions.delete(session.id);
      session.onExit(code);
    } else {
      session.process = null;
      session.onEvent({ type: "result", exitCode: code });
    }
  });
}

export function spawnChatSession(
  sessionId: string,
  cliId: ChatCliId,
  projectPath: string,
  onEvent: (event: StreamEvent) => void,
  onExit: (code: number | null) => void
): ChatSession | null {
  const cliArgs = buildCliArgs(cliId, projectPath);
  if (!cliArgs) return null;

  const session: ChatSession = {
    id: sessionId,
    process: null,
    cliId,
    projectPath,
    cliArgs,
    onEvent,
    onExit,
  };

  if (cliArgs.mode === "persistent") {
    const proc = spawn(cliArgs.binary, cliArgs.args, {
      cwd: projectPath,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...(cliArgs.env ?? {}) },
    });

    session.process = proc;
    attachProcessHandlers(proc, session);
  }

  sessions.set(sessionId, session);
  return session;
}

export function sendChatMessage(
  sessionId: string,
  message: string
): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;

  if (session.cliArgs.mode === "persistent") {
    if (!session.process?.stdin?.writable) return false;

    const payload = JSON.stringify({
      type: "user",
      message: { role: "user", content: [{ type: "text", text: message }] },
    });

    session.process.stdin.write(payload + "\n");
    return true;
  }

  // Per-message mode: spawn a new process with the message
  const args = session.cliArgs.promptFlag
    ? [...session.cliArgs.args, session.cliArgs.promptFlag, message]
    : [...session.cliArgs.args, message];

  const proc = spawn(session.cliArgs.binary, args, {
    cwd: session.projectPath,
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, ...(session.cliArgs.env ?? {}) },
  });

  session.process = proc;
  attachProcessHandlers(proc, session);
  return true;
}

export function closeChatSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  try {
    session.process?.kill();
  } catch {
    // already dead
  }
  sessions.delete(sessionId);
}
