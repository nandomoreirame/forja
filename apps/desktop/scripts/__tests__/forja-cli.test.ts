import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";
import { buildCommand, main } from "../forja-cli.js";

interface MockSocket extends EventEmitter {
  write: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
}

interface MockNet {
  createConnection: ReturnType<typeof vi.fn>;
}

// Helper to create a mock socket (EventEmitter + write/destroy)
function createMockSocket(): MockSocket {
  const socket = new EventEmitter() as MockSocket;
  socket.write = vi.fn();
  socket.destroy = vi.fn();
  return socket;
}

// Helper to build a mock net module for a given success response or connection error
function createMockNet(responseOrError: object | Error): MockNet {
  return {
    createConnection: vi.fn((_opts: unknown, connectCb?: () => void) => {
      const socket = createMockSocket();

      if (responseOrError instanceof Error) {
        // Connection-level error: emit error without calling connectCb
        setImmediate(() => {
          socket.emit("error", responseOrError);
        });
      } else {
        // Success: call connectCb first, then respond with data after write
        socket.write = vi.fn((data: string) => {
          (socket as MockSocket & { _lastWritten: string })._lastWritten = data;
          setImmediate(() => {
            socket.emit("data", JSON.stringify(responseOrError) + "\n");
          });
          return true;
        });

        setImmediate(() => {
          if (connectCb) connectCb();
        });
      }

      return socket;
    }),
  };
}

// Helper to build a socket-capturing mock net that records written data
function createCapturingMockNet(): { mockNet: MockNet; getWritten: () => string } {
  let writtenData = "";
  const mockNet: MockNet = {
    createConnection: vi.fn((_opts: unknown, connectCb?: () => void) => {
      const socket = createMockSocket();
      socket.write = vi.fn((data: string) => {
        writtenData += data;
        setImmediate(() => {
          socket.emit("data", JSON.stringify({ success: true }) + "\n");
        });
        return true;
      });
      setImmediate(() => {
        if (connectCb) connectCb();
      });
      return socket;
    }),
  };
  return { mockNet, getWritten: () => writtenData };
}

describe("forja-cli", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      // no-op: don't actually exit
    }) as () => never);
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("buildCommand", () => {
    it("ping returns correct command object", () => {
      expect(buildCommand("ping", [])).toEqual({ type: "ping" });
    });

    it("notify joins args into message", () => {
      expect(buildCommand("notify", ["hello", "world"])).toEqual({
        type: "notify",
        message: "hello world",
      });
    });

    it("open-project uses first arg as projectPath", () => {
      expect(buildCommand("open-project", ["/home/user/project"])).toEqual({
        type: "open-project",
        projectPath: "/home/user/project",
      });
    });

    it("list-projects returns correct command object", () => {
      expect(buildCommand("list-projects", [])).toEqual({
        type: "list-projects",
      });
    });

    it("screenshot returns correct command object", () => {
      expect(buildCommand("screenshot", [])).toEqual({ type: "screenshot" });
    });

    it("list-sessions returns correct command object", () => {
      expect(buildCommand("list-sessions", [])).toEqual({ type: "list-sessions" });
    });

    it("output returns command with tabId", () => {
      expect(buildCommand("output", ["tab-123"])).toEqual({
        type: "session-output",
        tabId: "tab-123",
      });
    });

    it("session-output alias works", () => {
      expect(buildCommand("session-output", ["tab-123"])).toEqual({
        type: "session-output",
        tabId: "tab-123",
      });
    });

    it("output returns null without tabId", () => {
      expect(buildCommand("output", [])).toBeNull();
    });

    it("send returns command with tabId and text", () => {
      expect(buildCommand("send", ["tab-123", "hello", "world"])).toEqual({
        type: "session-input",
        tabId: "tab-123",
        text: "hello world\r",
      });
    });

    it("input alias works", () => {
      expect(buildCommand("input", ["tab-123", "hi"])).toEqual({
        type: "session-input",
        tabId: "tab-123",
        text: "hi\r",
      });
    });

    it("session-input alias works", () => {
      expect(buildCommand("session-input", ["tab-123", "hi"])).toEqual({
        type: "session-input",
        tabId: "tab-123",
        text: "hi\r",
      });
    });

    it("send returns null without tabId or text", () => {
      expect(buildCommand("send", ["tab-123"])).toBeNull();
      expect(buildCommand("send", [])).toBeNull();
    });

    it("unknown command returns null", () => {
      expect(buildCommand("foobar", [])).toBeNull();
    });
  });

  describe("main — command parsing", () => {
    it("unknown command prints usage and exits with code 1", async () => {
      await main(["node", "forja-cli.js", "foobar"]);

      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining("Unknown command: foobar")
      );
      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it("no command prints usage and exits with code 1", async () => {
      await main(["node", "forja-cli.js"]);

      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it("ping sends correct JSON to socket", async () => {
      const { mockNet, getWritten } = createCapturingMockNet();

      await main(["node", "forja-cli.js", "ping"], mockNet);

      expect(JSON.parse(getWritten().trim())).toEqual({ type: "ping" });
    });

    it("notify joins args into message", async () => {
      const { mockNet, getWritten } = createCapturingMockNet();

      await main(["node", "forja-cli.js", "notify", "hello", "world"], mockNet);

      expect(JSON.parse(getWritten().trim())).toEqual({
        type: "notify",
        message: "hello world",
      });
    });

    it("open-project sends correct projectPath", async () => {
      const { mockNet, getWritten } = createCapturingMockNet();

      await main(
        ["node", "forja-cli.js", "open-project", "/home/user/project"],
        mockNet
      );

      expect(JSON.parse(getWritten().trim())).toEqual({
        type: "open-project",
        projectPath: "/home/user/project",
      });
    });

    it("list-projects sends correct command", async () => {
      const { mockNet, getWritten } = createCapturingMockNet();

      await main(["node", "forja-cli.js", "list-projects"], mockNet);

      expect(JSON.parse(getWritten().trim())).toEqual({ type: "list-projects" });
    });
  });

  describe("main — response handling", () => {
    it("successful response with data prints data and exits 0", async () => {
      const projectsData = [{ name: "forja", path: "/home/user/forja" }];
      const mockNet = createMockNet({ success: true, data: projectsData });

      await main(["node", "forja-cli.js", "list-projects"], mockNet);

      expect(stdoutSpy).toHaveBeenCalledWith(
        JSON.stringify(projectsData, null, 2) + "\n"
      );
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it("successful response without data exits 0 silently", async () => {
      const mockNet = createMockNet({ success: true });

      await main(["node", "forja-cli.js", "ping"], mockNet);

      expect(stdoutSpy).not.toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it("error response prints error to stderr and exits 1", async () => {
      const mockNet = createMockNet({ error: "Project not found" });

      await main(
        ["node", "forja-cli.js", "open-project", "/nonexistent"],
        mockNet
      );

      expect(stderrSpy).toHaveBeenCalledWith("Error: Project not found\n");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("main — connection errors", () => {
    it("ECONNREFUSED prints 'Forja is not running' and exits 1", async () => {
      const connError = Object.assign(new Error("Connection refused"), {
        code: "ECONNREFUSED",
      });
      const mockNet = createMockNet(connError);

      await main(["node", "forja-cli.js", "ping"], mockNet);

      expect(stderrSpy).toHaveBeenCalledWith("Forja is not running\n");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it("ENOENT prints 'Forja is not running' and exits 1", async () => {
      const connError = Object.assign(new Error("No such file or directory"), {
        code: "ENOENT",
      });
      const mockNet = createMockNet(connError);

      await main(["node", "forja-cli.js", "ping"], mockNet);

      expect(stderrSpy).toHaveBeenCalledWith("Forja is not running\n");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
