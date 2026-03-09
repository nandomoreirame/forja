import * as path from "path";
import * as os from "os";
import {
  spawnChatSession,
  sendChatMessage,
  closeChatSession,
  type StreamEvent,
} from "./agent-chat.js";

type IpcHandler = (event: unknown, args: unknown) => Promise<unknown>;

interface SpawnArgs {
  sessionId: string;
  cliId: "claude" | "codex" | "gemini" | "cursor-agent";
  projectPath?: string;
}

interface SendArgs {
  sessionId: string;
  message: string;
}

interface CloseArgs {
  sessionId: string;
}

export function createChatHandlers(): Array<[string, IpcHandler]> {
  return [
    ["chat:spawn", handleSpawn],
    ["chat:send", handleSend],
    ["chat:close", handleClose],
  ];
}

async function handleSpawn(event: unknown, args: unknown): Promise<unknown> {
  const { sessionId, cliId, projectPath } = args as SpawnArgs;
  const sender = (event as { sender?: { send: (ch: string, data: unknown) => void } })?.sender;

  const effectiveCwd = projectPath || path.join(os.homedir(), ".config", "forja");

  const onEvent = (streamEvent: StreamEvent) => {
    sender?.send("chat:event", { sessionId, event: streamEvent });
  };

  const onExit = (code: number | null) => {
    sender?.send("chat:exit", { sessionId, code });
  };

  const session = spawnChatSession(sessionId, cliId, effectiveCwd, onEvent, onExit);
  if (!session) throw new Error(`Failed to spawn ${cliId} chat session`);

  return { sessionId };
}

async function handleSend(_event: unknown, args: unknown): Promise<unknown> {
  const { sessionId, message } = args as SendArgs;
  const sent = sendChatMessage(sessionId, message);
  return { sent };
}

async function handleClose(_event: unknown, args: unknown): Promise<void> {
  const { sessionId } = args as CloseArgs;
  closeChatSession(sessionId);
}
