import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "events";

vi.mock("child_process", () => ({
  spawn: vi.fn(),
}));

import { spawn } from "child_process";
import {
  buildCliArgs,
  parseStreamEvent,
  spawnChatSession,
  sendChatMessage,
  closeChatSession,
} from "../agent-chat.js";

const mockSpawn = vi.mocked(spawn);

function createMockProcess() {
  const proc = new EventEmitter() as ReturnType<typeof spawn>;
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const stdin = { writable: true, write: vi.fn() };
  Object.assign(proc, {
    stdout,
    stderr,
    stdin,
    pid: 123,
    kill: vi.fn(),
  });
  return proc;
}

describe("agent-chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildCliArgs", () => {
    it("builds claude args with persistent mode", () => {
      const args = buildCliArgs("claude", "/project");
      expect(args).not.toBeNull();
      expect(args!.binary).toBe("claude");
      expect(args!.args).toContain("--input-format");
      expect(args!.args).toContain("stream-json");
      expect(args!.args).toContain("--output-format");
      expect(args!.args).toContain("--verbose");
      expect(args!.mode).toBe("persistent");
    });

    it("builds gemini args with stream-json output format", () => {
      const args = buildCliArgs("gemini", "/project");
      expect(args).not.toBeNull();
      expect(args!.binary).toBe("gemini");
      expect(args!.args).toContain("--output-format");
      expect(args!.args).toContain("stream-json");
      expect(args!.mode).toBe("per-message");
      expect(args!.promptFlag).toBe("-p");
    });

    it("builds codex args for exec mode with JSONL output", () => {
      const args = buildCliArgs("codex", "/project");
      expect(args).not.toBeNull();
      expect(args!.binary).toBe("codex");
      expect(args!.args).toContain("exec");
      expect(args!.args).toContain("--json");
      expect(args!.mode).toBe("per-message");
    });

    it("builds cursor-agent args with print and stream-json", () => {
      const args = buildCliArgs("cursor-agent", "/project");
      expect(args).not.toBeNull();
      expect(args!.binary).toBe("cursor-agent");
      expect(args!.args).toContain("--print");
      expect(args!.args).toContain("--output-format");
      expect(args!.args).toContain("stream-json");
      expect(args!.mode).toBe("per-message");
    });

    it("returns null for unsupported CLI", () => {
      expect(buildCliArgs("opencode", "/project")).toBeNull();
      expect(buildCliArgs("gh-copilot", "/project")).toBeNull();
      expect(buildCliArgs("unknown" as never, "/project")).toBeNull();
    });
  });

  describe("parseStreamEvent", () => {
    it("parses assistant text delta", () => {
      const line = JSON.stringify({
        type: "assistant",
        message: { role: "assistant", content: [{ type: "text", text: "Hello" }] },
      });
      const event = parseStreamEvent(line);
      expect(event).toBeDefined();
      expect(event?.type).toBe("assistant");
    });

    it("parses result event", () => {
      const line = JSON.stringify({
        type: "result",
        result: "Done",
        duration_ms: 1500,
      });
      const event = parseStreamEvent(line);
      expect(event?.type).toBe("result");
    });

    it("returns null for invalid JSON", () => {
      expect(parseStreamEvent("not-json")).toBeNull();
    });

    it("returns null for empty line", () => {
      expect(parseStreamEvent("")).toBeNull();
      expect(parseStreamEvent("  ")).toBeNull();
    });
  });

  describe("spawnChatSession", () => {
    it("spawns process immediately for persistent mode (claude)", () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc);
      const onEvent = vi.fn();
      const onExit = vi.fn();

      const session = spawnChatSession("s1", "claude", "/project", onEvent, onExit);
      expect(session).not.toBeNull();
      expect(mockSpawn).toHaveBeenCalledTimes(1);
      expect(session!.process).toBe(proc);
    });

    it("does NOT spawn process immediately for per-message mode (gemini)", () => {
      const onEvent = vi.fn();
      const onExit = vi.fn();

      const session = spawnChatSession("s1", "gemini", "/project", onEvent, onExit);
      expect(session).not.toBeNull();
      expect(mockSpawn).not.toHaveBeenCalled();
      expect(session!.process).toBeNull();
    });

    it("returns null for unsupported CLI", () => {
      const session = spawnChatSession("s1", "opencode" as never, "/project", vi.fn(), vi.fn());
      expect(session).toBeNull();
    });
  });

  describe("sendChatMessage", () => {
    it("writes JSON to stdin for persistent mode (claude)", () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc);
      const onEvent = vi.fn();
      const onExit = vi.fn();

      spawnChatSession("s1", "claude", "/project", onEvent, onExit);
      const sent = sendChatMessage("s1", "hello");

      expect(sent).toBe(true);
      expect((proc as never as { stdin: { write: ReturnType<typeof vi.fn> } }).stdin.write).toHaveBeenCalledTimes(1);
      const written = (proc as never as { stdin: { write: ReturnType<typeof vi.fn> } }).stdin.write.mock.calls[0][0];
      expect(written).toContain('"hello"');
    });

    it("spawns new process for per-message mode (gemini)", () => {
      const onEvent = vi.fn();
      const onExit = vi.fn();

      spawnChatSession("s1", "gemini", "/project", onEvent, onExit);

      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc);

      const sent = sendChatMessage("s1", "hello");
      expect(sent).toBe(true);
      expect(mockSpawn).toHaveBeenCalledTimes(1);

      // Gemini uses -p flag for prompt
      const spawnArgs = mockSpawn.mock.calls[0];
      expect(spawnArgs[0]).toBe("gemini");
      expect(spawnArgs[1]).toContain("-p");
      expect(spawnArgs[1]).toContain("hello");
    });

    it("appends message as positional arg for codex per-message mode", () => {
      const onEvent = vi.fn();
      const onExit = vi.fn();

      spawnChatSession("s1", "codex", "/project", onEvent, onExit);

      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc);

      sendChatMessage("s1", "fix the bug");
      const spawnArgs = mockSpawn.mock.calls[0];
      expect(spawnArgs[0]).toBe("codex");
      expect(spawnArgs[1]).toContain("exec");
      expect(spawnArgs[1]).toContain("--json");
      expect(spawnArgs[1]![spawnArgs[1]!.length - 1]).toBe("fix the bug");
    });

    it("returns false for unknown session", () => {
      expect(sendChatMessage("nonexistent", "hello")).toBe(false);
    });
  });

  describe("error handling", () => {
    it("calls onEvent with error type when spawn fails", () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc);
      const onEvent = vi.fn();
      const onExit = vi.fn();

      spawnChatSession("s1", "claude", "/project", onEvent, onExit);

      // Simulate spawn error
      proc.emit("error", new Error("ENOENT: command not found"));

      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "error" })
      );
    });
  });

  describe("non-JSON output handling", () => {
    it("emits text event for non-JSON stdout lines", () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc);
      const onEvent = vi.fn();
      const onExit = vi.fn();

      spawnChatSession("s1", "claude", "/project", onEvent, onExit);

      proc.stdout.emit("data", Buffer.from("plain text output\n"));

      expect(onEvent).toHaveBeenCalledWith({ type: "text", text: "plain text output" });
    });

    it("ignores non-JSON stderr lines (warnings/diagnostics)", () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc);
      const onEvent = vi.fn();
      const onExit = vi.fn();

      spawnChatSession("s1", "claude", "/project", onEvent, onExit);

      proc.stderr.emit("data", Buffer.from("Loaded cached credentials.\n"));
      proc.stderr.emit("data", Buffer.from("Skill conflict detected: foo\n"));

      expect(onEvent).not.toHaveBeenCalled();
    });

    it("still processes valid JSON from stderr", () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc);
      const onEvent = vi.fn();
      const onExit = vi.fn();

      spawnChatSession("s1", "claude", "/project", onEvent, onExit);

      const jsonLine = JSON.stringify({ type: "error", message: "fatal error" });
      proc.stderr.emit("data", Buffer.from(jsonLine + "\n"));

      expect(onEvent).toHaveBeenCalledWith({ type: "error", message: "fatal error" });
    });

    it("still parses valid JSON lines as structured events", () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc);
      const onEvent = vi.fn();
      const onExit = vi.fn();

      spawnChatSession("s1", "claude", "/project", onEvent, onExit);

      const jsonLine = JSON.stringify({ type: "assistant", text: "hi" });
      proc.stdout.emit("data", Buffer.from(jsonLine + "\n"));

      expect(onEvent).toHaveBeenCalledWith({ type: "assistant", text: "hi" });
    });

    it("skips empty lines without emitting events", () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc);
      const onEvent = vi.fn();
      const onExit = vi.fn();

      spawnChatSession("s1", "claude", "/project", onEvent, onExit);

      proc.stdout.emit("data", Buffer.from("\n\n\n"));

      expect(onEvent).not.toHaveBeenCalled();
    });
  });

  describe("buffer flush on exit", () => {
    it("flushes remaining buffer content on process exit", () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc);
      const onEvent = vi.fn();
      const onExit = vi.fn();

      spawnChatSession("s1", "claude", "/project", onEvent, onExit);

      // Data without trailing newline (stays in buffer)
      proc.stdout.emit("data", Buffer.from("incomplete line"));

      expect(onEvent).not.toHaveBeenCalled();

      // Process exits - should flush buffer
      proc.emit("exit", 0);

      expect(onEvent).toHaveBeenCalledWith({ type: "text", text: "incomplete line" });
    });

    it("flushes remaining JSON buffer on process exit", () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc);
      const onEvent = vi.fn();
      const onExit = vi.fn();

      spawnChatSession("s1", "claude", "/project", onEvent, onExit);

      const json = JSON.stringify({ type: "done", result: "ok" });
      proc.stdout.emit("data", Buffer.from(json)); // No trailing newline

      expect(onEvent).not.toHaveBeenCalled();

      proc.emit("exit", 0);

      // Should have flushed the JSON as a parsed event
      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "done", result: "ok" })
      );
    });

    it("does not emit event for empty buffer on exit", () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc);
      const onEvent = vi.fn();
      const onExit = vi.fn();

      spawnChatSession("s1", "claude", "/project", onEvent, onExit);

      proc.stdout.emit("data", Buffer.from("full line\n"));
      onEvent.mockClear();

      proc.emit("exit", 0);

      // No extra event from empty buffer, only the exit-related ones
      const textEvents = onEvent.mock.calls.filter(
        (c) => c[0].type === "text" || c[0].type === "assistant"
      );
      expect(textEvents).toHaveLength(0);
    });
  });
});
