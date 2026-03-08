import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../agent-chat.js", () => ({
  spawnChatSession: vi.fn(),
  sendChatMessage: vi.fn(),
  closeChatSession: vi.fn(),
}));

import * as agentChat from "../agent-chat.js";
import { createChatHandlers } from "../agent-chat-ipc.js";

const mockSpawn = vi.mocked(agentChat.spawnChatSession);
const mockSend = vi.mocked(agentChat.sendChatMessage);
const mockClose = vi.mocked(agentChat.closeChatSession);

describe("agent-chat-ipc", () => {
  let handlers: Record<string, (event: unknown, args: unknown) => Promise<unknown>>;

  beforeEach(() => {
    vi.clearAllMocks();
    const raw = createChatHandlers();
    handlers = Object.fromEntries(raw);
  });

  it("registers all expected handlers", () => {
    const keys = Object.keys(handlers);
    expect(keys).toContain("chat:spawn");
    expect(keys).toContain("chat:send");
    expect(keys).toContain("chat:close");
  });

  it("chat:spawn calls spawnChatSession", async () => {
    mockSpawn.mockReturnValue({
      id: "s1",
      process: {} as never,
      cliId: "claude",
      projectPath: "/p",
    });

    const result = await handlers["chat:spawn"](
      { sender: { send: vi.fn() } },
      { sessionId: "s1", cliId: "claude", projectPath: "/p" }
    );
    expect(result).toEqual({ sessionId: "s1" });
    expect(mockSpawn).toHaveBeenCalled();
  });

  it("chat:spawn throws on failure", async () => {
    mockSpawn.mockReturnValue(null);

    await expect(
      handlers["chat:spawn"](
        { sender: { send: vi.fn() } },
        { sessionId: "s1", cliId: "unknown", projectPath: "/p" }
      )
    ).rejects.toThrow("Failed to spawn");
  });

  it("chat:send calls sendChatMessage", async () => {
    mockSend.mockReturnValue(true);
    const result = await handlers["chat:send"](
      {},
      { sessionId: "s1", message: "hello" }
    );
    expect(result).toEqual({ sent: true });
  });

  it("chat:close calls closeChatSession", async () => {
    await handlers["chat:close"]({}, { sessionId: "s1" });
    expect(mockClose).toHaveBeenCalledWith("s1");
  });
});
