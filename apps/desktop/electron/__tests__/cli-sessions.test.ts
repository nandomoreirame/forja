import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";
import * as os from "os";

vi.mock("fs");
vi.mock("os");

const mockFs = vi.mocked(fs);
const mockOs = vi.mocked(os);

describe("cli-sessions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockOs.homedir.mockReturnValue("/home/testuser");
  });

  describe("getGeminiSessions", () => {
    it("returns empty array when projects.json does not exist", async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error("ENOENT");
      });
      mockFs.readdirSync.mockReturnValue([]);

      const { getGeminiSessions } = await import("../cli-sessions");
      const result = getGeminiSessions("/home/user/myproject");
      expect(result).toEqual([]);
    });

    it("returns empty array when project is not in projects.json", async () => {
      mockFs.readFileSync.mockImplementation((p: unknown) => {
        if (String(p).endsWith("projects.json")) {
          return JSON.stringify({ projects: { "/other/project": "other" } });
        }
        throw new Error("ENOENT");
      });
      mockFs.readdirSync.mockReturnValue([]);

      const { getGeminiSessions } = await import("../cli-sessions");
      const result = getGeminiSessions("/home/user/myproject");
      expect(result).toEqual([]);
    });

    it("returns sessions sorted newest first", async () => {
      const session1 = {
        sessionId: "aaaabbbb-0000-0000-0000-000000000001",
        startTime: "2026-03-01T10:00:00.000Z",
        lastUpdated: "2026-03-01T10:05:00.000Z",
        messages: [{ type: "user", content: [{ text: "first prompt" }] }],
      };
      const session2 = {
        sessionId: "ccccdddd-0000-0000-0000-000000000002",
        startTime: "2026-03-02T10:00:00.000Z",
        lastUpdated: "2026-03-02T10:05:00.000Z",
        messages: [{ type: "user", content: [{ text: "second prompt" }] }],
      };

      mockFs.readFileSync.mockImplementation((p: unknown) => {
        const ps = String(p);
        if (ps.endsWith("projects.json")) {
          return JSON.stringify({ projects: { "/home/user/myproject": "myproject" } });
        }
        if (ps.includes("session-2026-03-01")) return JSON.stringify(session1);
        if (ps.includes("session-2026-03-02")) return JSON.stringify(session2);
        throw new Error("ENOENT");
      });
      mockFs.readdirSync.mockReturnValue([
        "session-2026-03-01T10-00-aaaabbbb.json",
        "session-2026-03-02T10-00-ccccdddd.json",
      ] as unknown as fs.Dirent[]);

      const { getGeminiSessions } = await import("../cli-sessions");
      const result = getGeminiSessions("/home/user/myproject");

      expect(result).toHaveLength(2);
      // Newest first
      expect(result[0].sessionId).toBe("ccccdddd-0000-0000-0000-000000000002");
      expect(result[1].sessionId).toBe("aaaabbbb-0000-0000-0000-000000000001");
    });

    it("extracts firstPrompt from first user message", async () => {
      const session = {
        sessionId: "aaaabbbb-0000-0000-0000-000000000001",
        startTime: "2026-03-01T10:00:00.000Z",
        lastUpdated: "2026-03-01T10:05:00.000Z",
        messages: [
          { type: "user", content: [{ text: "hello world" }] },
          { type: "gemini", content: "response" },
        ],
      };

      mockFs.readFileSync.mockImplementation((p: unknown) => {
        const ps = String(p);
        if (ps.endsWith("projects.json")) {
          return JSON.stringify({ projects: { "/home/user/myproject": "myproject" } });
        }
        return JSON.stringify(session);
      });
      mockFs.readdirSync.mockReturnValue([
        "session-2026-03-01T10-00-aaaabbbb.json",
      ] as unknown as fs.Dirent[]);

      const { getGeminiSessions } = await import("../cli-sessions");
      const result = getGeminiSessions("/home/user/myproject");

      expect(result[0].firstPrompt).toBe("hello world");
    });

    it("respects the limit parameter", async () => {
      const makeSession = (id: string, date: string) => ({
        sessionId: `${id}-0000-0000-0000-000000000000`,
        startTime: `${date}T10:00:00.000Z`,
        lastUpdated: `${date}T10:05:00.000Z`,
        messages: [],
      });

      const sessions = [
        ["aaaa1111", "2026-03-01"],
        ["bbbb2222", "2026-03-02"],
        ["cccc3333", "2026-03-03"],
      ];

      mockFs.readFileSync.mockImplementation((p: unknown) => {
        const ps = String(p);
        if (ps.endsWith("projects.json")) {
          return JSON.stringify({ projects: { "/home/user/myproject": "myproject" } });
        }
        const found = sessions.find(([id]) => ps.includes(id.slice(0, 8)));
        if (found) return JSON.stringify(makeSession(found[0], found[1]));
        throw new Error("ENOENT");
      });
      mockFs.readdirSync.mockReturnValue(
        sessions.map(([id, date]) => `session-${date}T10-00-${id.slice(0, 8)}.json`) as unknown as fs.Dirent[]
      );

      const { getGeminiSessions } = await import("../cli-sessions");
      const result = getGeminiSessions("/home/user/myproject", 2);
      expect(result).toHaveLength(2);
    });

    it("skips malformed session files gracefully", async () => {
      mockFs.readFileSync.mockImplementation((p: unknown) => {
        const ps = String(p);
        if (ps.endsWith("projects.json")) {
          return JSON.stringify({ projects: { "/home/user/myproject": "myproject" } });
        }
        if (ps.includes("good")) {
          return JSON.stringify({
            sessionId: "goodgood-0000-0000-0000-000000000001",
            startTime: "2026-03-01T10:00:00.000Z",
            lastUpdated: "2026-03-01T10:05:00.000Z",
            messages: [],
          });
        }
        return "not valid json {{{";
      });
      mockFs.readdirSync.mockReturnValue([
        "session-2026-03-01T10-00-goodgood.json",
        "session-2026-03-01T11-00-badbadba.json",
      ] as unknown as fs.Dirent[]);

      const { getGeminiSessions } = await import("../cli-sessions");
      const result = getGeminiSessions("/home/user/myproject");
      expect(result).toHaveLength(1);
      expect(result[0].sessionId).toBe("goodgood-0000-0000-0000-000000000001");
    });
  });

  describe("getCodexSessions", () => {
    it("returns empty array when sessions directory does not exist", async () => {
      mockFs.readdirSync.mockImplementation(() => {
        throw new Error("ENOENT");
      });

      const { getCodexSessions } = await import("../cli-sessions");
      const result = getCodexSessions("/home/user/myproject");
      expect(result).toEqual([]);
    });

    it("filters sessions by cwd matching projectPath", async () => {
      const sessionMeta = JSON.stringify({
        timestamp: "2026-03-01T10:00:00.000Z",
        type: "session_meta",
        payload: {
          id: "019cb48b-8579-7c50-bd3f-e19aeec78140",
          timestamp: "2026-03-01T10:00:00.000Z",
          cwd: "/home/user/myproject",
        },
      });
      const otherMeta = JSON.stringify({
        timestamp: "2026-03-01T09:00:00.000Z",
        type: "session_meta",
        payload: {
          id: "deadbeef-0000-0000-0000-000000000000",
          timestamp: "2026-03-01T09:00:00.000Z",
          cwd: "/home/user/otherproject",
        },
      });

      // Simulate directory tree: ~/.codex/sessions/2026/03/01/
      mockFs.readdirSync.mockImplementation((p: unknown) => {
        const ps = String(p);
        if (ps.endsWith("sessions")) return ["2026"] as unknown as fs.Dirent[];
        if (ps.endsWith("2026")) return ["03"] as unknown as fs.Dirent[];
        if (ps.endsWith("03")) return ["01"] as unknown as fs.Dirent[];
        if (ps.endsWith("01")) {
          return [
            "rollout-2026-03-01T10-00-00-019cb48b-8579-7c50-bd3f-e19aeec78140.jsonl",
            "rollout-2026-03-01T09-00-00-deadbeef-0000-0000-0000-000000000000.jsonl",
          ] as unknown as fs.Dirent[];
        }
        return [] as unknown as fs.Dirent[];
      });

      mockFs.statSync.mockImplementation((p: unknown) => {
        const ps = String(p);
        // Return isFile for .jsonl, isDirectory for directories
        if (ps.endsWith(".jsonl")) {
          return { isDirectory: () => false, isFile: () => true, mtime: new Date("2026-03-01T10:00:00Z") } as unknown as fs.Stats;
        }
        return { isDirectory: () => true, isFile: () => false, mtime: new Date() } as unknown as fs.Stats;
      });

      mockFs.readFileSync.mockImplementation((p: unknown) => {
        const ps = String(p);
        if (ps.includes("019cb48b")) return sessionMeta + "\n";
        if (ps.includes("deadbeef")) return otherMeta + "\n";
        throw new Error("ENOENT");
      });

      const { getCodexSessions } = await import("../cli-sessions");
      const result = getCodexSessions("/home/user/myproject");

      expect(result).toHaveLength(1);
      expect(result[0].sessionId).toBe("019cb48b-8579-7c50-bd3f-e19aeec78140");
    });

    it("returns sessions sorted newest first by timestamp", async () => {
      const makeMeta = (id: string, cwd: string, ts: string) =>
        JSON.stringify({ timestamp: ts, type: "session_meta", payload: { id, cwd, timestamp: ts } });

      mockFs.readdirSync.mockImplementation((p: unknown) => {
        const ps = String(p);
        if (ps.endsWith("sessions")) return ["2026"] as unknown as fs.Dirent[];
        if (ps.endsWith("2026")) return ["03"] as unknown as fs.Dirent[];
        if (ps.endsWith("03")) return ["01"] as unknown as fs.Dirent[];
        if (ps.endsWith("01")) {
          return [
            "rollout-2026-03-01T08-00-00-aaaaaaaa-0000-0000-0000-000000000001.jsonl",
            "rollout-2026-03-01T09-00-00-bbbbbbbb-0000-0000-0000-000000000002.jsonl",
          ] as unknown as fs.Dirent[];
        }
        return [] as unknown as fs.Dirent[];
      });

      mockFs.statSync.mockImplementation((p: unknown) => {
        const ps = String(p);
        if (ps.endsWith(".jsonl")) {
          return { isDirectory: () => false, isFile: () => true, mtime: new Date() } as unknown as fs.Stats;
        }
        return { isDirectory: () => true, isFile: () => false, mtime: new Date() } as unknown as fs.Stats;
      });

      mockFs.readFileSync.mockImplementation((p: unknown) => {
        const ps = String(p);
        if (ps.includes("aaaaaaaa")) {
          return makeMeta("aaaaaaaa-0000-0000-0000-000000000001", "/home/user/myproject", "2026-03-01T08:00:00.000Z") + "\n";
        }
        if (ps.includes("bbbbbbbb")) {
          return makeMeta("bbbbbbbb-0000-0000-0000-000000000002", "/home/user/myproject", "2026-03-01T09:00:00.000Z") + "\n";
        }
        throw new Error("ENOENT");
      });

      const { getCodexSessions } = await import("../cli-sessions");
      const result = getCodexSessions("/home/user/myproject");

      expect(result).toHaveLength(2);
      expect(result[0].sessionId).toBe("bbbbbbbb-0000-0000-0000-000000000002");
    });

    it("skips files with missing or malformed session_meta", async () => {
      mockFs.readdirSync.mockImplementation((p: unknown) => {
        const ps = String(p);
        if (ps.endsWith("sessions")) return ["2026"] as unknown as fs.Dirent[];
        if (ps.endsWith("2026")) return ["03"] as unknown as fs.Dirent[];
        if (ps.endsWith("03")) return ["01"] as unknown as fs.Dirent[];
        if (ps.endsWith("01")) return ["rollout-bad.jsonl"] as unknown as fs.Dirent[];
        return [] as unknown as fs.Dirent[];
      });
      mockFs.statSync.mockReturnValue({ isDirectory: () => false, isFile: () => true, mtime: new Date() } as unknown as fs.Stats);
      mockFs.readFileSync.mockReturnValue("not-json-at-all\n");

      const { getCodexSessions } = await import("../cli-sessions");
      const result = getCodexSessions("/home/user/myproject");
      expect(result).toEqual([]);
    });
  });

  describe("getCursorSessions", () => {
    it("returns empty array when project directory does not exist", async () => {
      mockFs.readdirSync.mockImplementation(() => {
        throw new Error("ENOENT");
      });

      const { getCursorSessions } = await import("../cli-sessions");
      const result = getCursorSessions("/home/user/myproject");
      expect(result).toEqual([]);
    });

    it("encodes project path by replacing slashes with dashes (no leading dash)", async () => {
      // "/home/testuser/myproject" -> "home-testuser-myproject"
      mockFs.readdirSync.mockReturnValue([] as unknown as fs.Dirent[]);

      const { getCursorSessions } = await import("../cli-sessions");
      getCursorSessions("/home/testuser/myproject");

      // Should have attempted to read "~/.cursor/projects/home-testuser-myproject/agent-transcripts"
      const calls = (mockFs.readdirSync as ReturnType<typeof vi.fn>).mock.calls;
      const attemptedPath = calls[0][0] as string;
      expect(attemptedPath).toContain("home-testuser-myproject");
      expect(attemptedPath).not.toMatch(/^-/); // no leading dash
      expect(attemptedPath).toContain("agent-transcripts");
    });

    it("detects flat .jsonl sessions (UUID.jsonl)", async () => {
      const uuid = "446f350e-3232-409a-b688-d49af7d93cb2";
      const filename = `${uuid}.jsonl`;

      mockFs.readdirSync.mockReturnValue([filename] as unknown as fs.Dirent[]);
      mockFs.statSync.mockReturnValue({
        isDirectory: () => false,
        isFile: () => true,
        mtime: new Date("2026-03-10T12:00:00Z"),
      } as unknown as fs.Stats);

      const { getCursorSessions } = await import("../cli-sessions");
      const result = getCursorSessions("/home/testuser/myproject");

      expect(result).toHaveLength(1);
      expect(result[0].sessionId).toBe(uuid);
    });

    it("detects subdirectory sessions (UUID/UUID.jsonl)", async () => {
      const uuid = "82503306-320f-4f37-be38-1633828d8ed8";

      mockFs.readdirSync.mockImplementation((p: unknown) => {
        const ps = String(p);
        if (ps.endsWith("agent-transcripts")) return [uuid] as unknown as fs.Dirent[];
        return [] as unknown as fs.Dirent[];
      });

      mockFs.statSync.mockImplementation((p: unknown) => {
        const ps = String(p);
        if (ps.endsWith(uuid)) {
          // The directory entry
          return { isDirectory: () => true, isFile: () => false, mtime: new Date() } as unknown as fs.Stats;
        }
        if (ps.endsWith(`${uuid}.jsonl`)) {
          // The inner file
          return { isDirectory: () => false, isFile: () => true, mtime: new Date("2026-03-11T12:00:00Z") } as unknown as fs.Stats;
        }
        return { isDirectory: () => false, isFile: () => false, mtime: new Date() } as unknown as fs.Stats;
      });

      const { getCursorSessions } = await import("../cli-sessions");
      const result = getCursorSessions("/home/testuser/myproject");

      expect(result).toHaveLength(1);
      expect(result[0].sessionId).toBe(uuid);
    });

    it("returns sessions sorted newest first by mtime", async () => {
      const uuid1 = "11111111-0000-0000-0000-000000000001";
      const uuid2 = "22222222-0000-0000-0000-000000000002";

      mockFs.readdirSync.mockImplementation(() => {
        return [
          `${uuid1}.jsonl`,
          `${uuid2}.jsonl`,
        ] as unknown as fs.Dirent[];
      });

      mockFs.statSync.mockImplementation((p: unknown) => {
        const ps = String(p);
        if (ps.includes("11111111")) {
          return { isDirectory: () => false, isFile: () => true, mtime: new Date("2026-03-01T10:00:00Z") } as unknown as fs.Stats;
        }
        if (ps.includes("22222222")) {
          return { isDirectory: () => false, isFile: () => true, mtime: new Date("2026-03-05T10:00:00Z") } as unknown as fs.Stats;
        }
        return { isDirectory: () => false, isFile: () => true, mtime: new Date() } as unknown as fs.Stats;
      });

      const { getCursorSessions } = await import("../cli-sessions");
      const result = getCursorSessions("/home/testuser/myproject");

      expect(result).toHaveLength(2);
      expect(result[0].sessionId).toBe(uuid2); // newer
    });

    it("skips non-UUID filenames", async () => {
      mockFs.readdirSync.mockReturnValue([
        "not-a-uuid.jsonl",
        "some-other-file.txt",
      ] as unknown as fs.Dirent[]);
      mockFs.statSync.mockReturnValue({ isDirectory: () => false, isFile: () => true, mtime: new Date() } as unknown as fs.Stats);

      const { getCursorSessions } = await import("../cli-sessions");
      const result = getCursorSessions("/home/testuser/myproject");

      expect(result).toEqual([]);
    });

    it("respects the limit parameter", async () => {
      const uuids = Array.from({ length: 5 }, (_, i) =>
        `${String(i + 1).padStart(8, "0")}-0000-0000-0000-000000000000`
      );
      mockFs.readdirSync.mockReturnValue(
        uuids.map((u) => `${u}.jsonl`) as unknown as fs.Dirent[]
      );
      mockFs.statSync.mockReturnValue({ isDirectory: () => false, isFile: () => true, mtime: new Date() } as unknown as fs.Stats);

      const { getCursorSessions } = await import("../cli-sessions");
      const result = getCursorSessions("/home/testuser/myproject", 3);
      expect(result).toHaveLength(3);
    });
  });

  describe("getCliSessions (unified dispatcher)", () => {
    it("dispatches to getClaudeSessions for cliId=claude", async () => {
      mockFs.readdirSync.mockReturnValue([] as unknown as fs.Dirent[]);

      const { getCliSessions } = await import("../cli-sessions");
      const result = getCliSessions("claude", "/some/project");
      expect(result).toEqual([]);
    });

    it("dispatches to getGeminiSessions for cliId=gemini", async () => {
      mockFs.readFileSync.mockImplementation(() => { throw new Error("ENOENT"); });
      mockFs.readdirSync.mockReturnValue([] as unknown as fs.Dirent[]);

      const { getCliSessions } = await import("../cli-sessions");
      const result = getCliSessions("gemini", "/some/project");
      expect(result).toEqual([]);
    });

    it("dispatches to getCodexSessions for cliId=codex", async () => {
      mockFs.readdirSync.mockImplementation(() => { throw new Error("ENOENT"); });

      const { getCliSessions } = await import("../cli-sessions");
      const result = getCliSessions("codex", "/some/project");
      expect(result).toEqual([]);
    });

    it("dispatches to getCursorSessions for cliId=cursor-agent", async () => {
      mockFs.readdirSync.mockImplementation(() => { throw new Error("ENOENT"); });

      const { getCliSessions } = await import("../cli-sessions");
      const result = getCliSessions("cursor-agent", "/some/project");
      expect(result).toEqual([]);
    });

    it("returns empty array for unknown cliId (gh-copilot)", async () => {
      const { getCliSessions } = await import("../cli-sessions");
      const result = getCliSessions("gh-copilot", "/some/project");
      expect(result).toEqual([]);
    });

    it("returns empty array for completely unknown cliId", async () => {
      const { getCliSessions } = await import("../cli-sessions");
      const result = getCliSessions("unknown-cli-xyz", "/some/project");
      expect(result).toEqual([]);
    });
  });

  describe("getSessionModel", () => {
    it("extracts model from first assistant message in JSONL", async () => {
      const jsonlContent = [
        JSON.stringify({ type: "user", message: { role: "user", content: "hello" } }),
        JSON.stringify({ type: "assistant", message: { model: "claude-opus-4-6", role: "assistant", content: [] } }),
        JSON.stringify({ type: "user", message: { role: "user", content: "more" } }),
      ].join("\n");

      mockFs.readFileSync.mockReturnValue(jsonlContent);

      const { getSessionModel } = await import("../cli-sessions");
      const result = getSessionModel("/home/testuser/.claude/projects/-test/abc123.jsonl");
      expect(result).toBe("claude-opus-4-6");
    });

    it("returns null when JSONL has no assistant messages", async () => {
      const jsonlContent = [
        JSON.stringify({ type: "user", message: { role: "user", content: "hello" } }),
        JSON.stringify({ type: "progress", data: { type: "hook_progress" } }),
      ].join("\n");

      mockFs.readFileSync.mockReturnValue(jsonlContent);

      const { getSessionModel } = await import("../cli-sessions");
      const result = getSessionModel("/home/testuser/.claude/projects/-test/abc123.jsonl");
      expect(result).toBeNull();
    });

    it("returns null when file does not exist", async () => {
      mockFs.readFileSync.mockImplementation(() => { throw new Error("ENOENT"); });

      const { getSessionModel } = await import("../cli-sessions");
      const result = getSessionModel("/nonexistent/path.jsonl");
      expect(result).toBeNull();
    });

    it("returns null when assistant message has no model field", async () => {
      const jsonlContent = JSON.stringify({ type: "assistant", message: { role: "assistant", content: [] } });

      mockFs.readFileSync.mockReturnValue(jsonlContent);

      const { getSessionModel } = await import("../cli-sessions");
      const result = getSessionModel("/some/file.jsonl");
      expect(result).toBeNull();
    });
  });

  describe("getActiveSessionModel", () => {
    it("resolves model for a Claude session via JSONL", async () => {
      // Mock the session listing (most recent session)
      mockFs.readdirSync.mockReturnValue(["abc123.jsonl"] as unknown as fs.Dirent[]);
      mockFs.statSync.mockReturnValue({ mtime: new Date("2026-03-26"), isFile: () => true, isDirectory: () => false } as fs.Stats);

      const jsonlContent = JSON.stringify({ type: "assistant", message: { model: "claude-sonnet-4-6", role: "assistant", content: [] } });
      mockFs.readFileSync.mockReturnValue(jsonlContent);

      const { getActiveSessionModel } = await import("../cli-sessions");
      const result = getActiveSessionModel("claude", "/home/user/project", "abc123");
      expect(result).toBe("claude-sonnet-4-6");
    });

    it("returns null for terminal sessions", async () => {
      const { getActiveSessionModel } = await import("../cli-sessions");
      const result = getActiveSessionModel("terminal", "/home/user/project");
      expect(result).toBeNull();
    });

    it("returns null for CLIs without JSONL support", async () => {
      const { getActiveSessionModel } = await import("../cli-sessions");
      const result = getActiveSessionModel("gh-copilot", "/home/user/project");
      expect(result).toBeNull();
    });
  });
});
