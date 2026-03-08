import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs/promises", () => ({
  mkdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  access: vi.fn(),
}));

import * as fs from "fs/promises";

const mockMkdir = vi.mocked(fs.mkdir);
const mockReadFile = vi.mocked(fs.readFile);
const mockWriteFile = vi.mocked(fs.writeFile);
const mockAccess = vi.mocked(fs.access);

describe("ContextHub", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe("ensureContextHub", () => {
    it("creates .forja/context/ directory structure (docs, agents, skills, plans)", async () => {
      mockMkdir.mockResolvedValue(undefined);
      // Index does not exist yet
      mockAccess.mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));
      mockWriteFile.mockResolvedValue(undefined);

      const { ensureContextHub } = await import("../context/context-hub.js");
      await ensureContextHub("/home/user/project");

      const mkdirCalls = mockMkdir.mock.calls.map((c) => c[0] as string);

      expect(mkdirCalls.some((p) => p.endsWith(".forja/context/docs"))).toBe(true);
      expect(mkdirCalls.some((p) => p.endsWith(".forja/context/agents"))).toBe(true);
      expect(mkdirCalls.some((p) => p.endsWith(".forja/context/skills"))).toBe(true);
      expect(mkdirCalls.some((p) => p.endsWith(".forja/context/plans"))).toBe(true);
    });

    it("creates .index.json if not present", async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockAccess.mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));
      mockWriteFile.mockResolvedValue(undefined);

      const { ensureContextHub } = await import("../context/context-hub.js");
      await ensureContextHub("/home/user/project");

      const writeFileCalls = mockWriteFile.mock.calls;
      const indexWriteCall = writeFileCalls.find((c) =>
        (c[0] as string).endsWith(".index.json")
      );
      expect(indexWriteCall).toBeDefined();

      const writtenContent = JSON.parse(indexWriteCall![1] as string);
      expect(writtenContent).toMatchObject({ version: 1, items: [] });
    });

    it("does NOT overwrite existing .index.json", async () => {
      mockMkdir.mockResolvedValue(undefined);
      // Index already exists
      mockAccess.mockResolvedValue(undefined);

      const { ensureContextHub } = await import("../context/context-hub.js");
      await ensureContextHub("/home/user/project");

      const writeFileCalls = mockWriteFile.mock.calls;
      const indexWriteCall = writeFileCalls.find((c) =>
        (c[0] as string).endsWith(".index.json")
      );
      expect(indexWriteCall).toBeUndefined();
    });
  });

  describe("createSkill", () => {
    it("creates skills/<slug>/SKILL.md with frontmatter template", async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);
      // readFile for index returns empty index
      mockReadFile.mockResolvedValue(
        JSON.stringify({ version: 1, items: [], updatedAt: new Date().toISOString() })
      );

      const { createSkill } = await import("../context/context-hub.js");
      const filePath = await createSkill("/home/user/project", "my-skill");

      expect(filePath).toContain("skills/my-skill/SKILL.md");

      const writeFileCalls = mockWriteFile.mock.calls;
      const skillWrite = writeFileCalls.find((c) =>
        (c[0] as string).endsWith("SKILL.md")
      );
      expect(skillWrite).toBeDefined();
      const content = skillWrite![1] as string;
      expect(content).toContain("name: my-skill");
      expect(content).toContain("---");
    });

    it("adds item to index", async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(
        JSON.stringify({ version: 1, items: [], updatedAt: new Date().toISOString() })
      );

      const { createSkill } = await import("../context/context-hub.js");
      await createSkill("/home/user/project", "my-skill");

      const indexWriteCall = mockWriteFile.mock.calls.find((c) =>
        (c[0] as string).endsWith(".index.json")
      );
      expect(indexWriteCall).toBeDefined();
      const indexContent = JSON.parse(indexWriteCall![1] as string);
      const item = indexContent.items.find(
        (i: { type: string; slug: string }) => i.type === "skill" && i.slug === "my-skill"
      );
      expect(item).toBeDefined();
    });

    it("throws if skill already exists and force=false", async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          version: 1,
          items: [{ type: "skill", slug: "my-skill", path: "skills/my-skill/SKILL.md", fingerprint: "sha256:abc", updatedAt: "2026-01-01T00:00:00Z" }],
          updatedAt: "2026-01-01T00:00:00Z",
        })
      );

      const { createSkill } = await import("../context/context-hub.js");
      await expect(createSkill("/home/user/project", "my-skill")).rejects.toThrow(
        /already exists/
      );
    });
  });

  describe("createAgent", () => {
    it("creates agents/<slug>.md with frontmatter template", async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(
        JSON.stringify({ version: 1, items: [], updatedAt: new Date().toISOString() })
      );

      const { createAgent } = await import("../context/context-hub.js");
      const filePath = await createAgent("/home/user/project", "my-agent");

      expect(filePath).toContain("agents/my-agent.md");

      const agentWrite = mockWriteFile.mock.calls.find((c) =>
        (c[0] as string).endsWith("my-agent.md")
      );
      expect(agentWrite).toBeDefined();
      const content = agentWrite![1] as string;
      expect(content).toContain("name: my-agent");
      expect(content).toContain("model: inherit");
      expect(content).toContain("---");
    });

    it("adds item to index", async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(
        JSON.stringify({ version: 1, items: [], updatedAt: new Date().toISOString() })
      );

      const { createAgent } = await import("../context/context-hub.js");
      await createAgent("/home/user/project", "my-agent");

      const indexWriteCall = mockWriteFile.mock.calls.find((c) =>
        (c[0] as string).endsWith(".index.json")
      );
      expect(indexWriteCall).toBeDefined();
      const indexContent = JSON.parse(indexWriteCall![1] as string);
      const item = indexContent.items.find(
        (i: { type: string; slug: string }) => i.type === "agent" && i.slug === "my-agent"
      );
      expect(item).toBeDefined();
    });

    it("throws if agent already exists and force=false", async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          version: 1,
          items: [{ type: "agent", slug: "my-agent", path: "agents/my-agent.md", fingerprint: "sha256:abc", updatedAt: "2026-01-01T00:00:00Z" }],
          updatedAt: "2026-01-01T00:00:00Z",
        })
      );

      const { createAgent } = await import("../context/context-hub.js");
      await expect(createAgent("/home/user/project", "my-agent")).rejects.toThrow(
        /already exists/
      );
    });
  });

  describe("readIndex", () => {
    it("reads and parses .index.json", async () => {
      const mockIndex = {
        version: 1,
        items: [{ type: "skill", slug: "test-skill", path: "skills/test-skill/SKILL.md", fingerprint: "sha256:abc", updatedAt: "2026-01-01T00:00:00Z" }],
        updatedAt: "2026-01-01T00:00:00Z",
      };
      mockReadFile.mockResolvedValue(JSON.stringify(mockIndex));

      const { readIndex } = await import("../context/context-hub.js");
      const result = await readIndex("/home/user/project");

      expect(result.version).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].slug).toBe("test-skill");
    });

    it("returns default empty index if file doesn't exist", async () => {
      mockReadFile.mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));

      const { readIndex } = await import("../context/context-hub.js");
      const result = await readIndex("/home/user/project");

      expect(result.version).toBe(1);
      expect(result.items).toEqual([]);
    });
  });

  describe("updateIndex", () => {
    it("adds new item to index", async () => {
      const existingIndex = {
        version: 1,
        items: [],
        updatedAt: "2026-01-01T00:00:00Z",
      };
      mockReadFile.mockResolvedValue(JSON.stringify(existingIndex));
      mockWriteFile.mockResolvedValue(undefined);

      const { updateIndex } = await import("../context/context-hub.js");
      await updateIndex("/home/user/project", {
        type: "skill",
        slug: "new-skill",
        path: "skills/new-skill/SKILL.md",
        content: "skill content",
        updatedAt: "2026-03-01T00:00:00Z",
      });

      const writeCall = mockWriteFile.mock.calls[0];
      const written = JSON.parse(writeCall[1] as string);
      expect(written.items).toHaveLength(1);
      expect(written.items[0].slug).toBe("new-skill");
      expect(written.items[0].fingerprint).toMatch(/^sha256:/);
    });

    it("updates existing item by slug+type", async () => {
      const existingIndex = {
        version: 1,
        items: [
          {
            type: "skill",
            slug: "my-skill",
            path: "skills/my-skill/SKILL.md",
            fingerprint: "sha256:old",
            updatedAt: "2026-01-01T00:00:00Z",
          },
        ],
        updatedAt: "2026-01-01T00:00:00Z",
      };
      mockReadFile.mockResolvedValue(JSON.stringify(existingIndex));
      mockWriteFile.mockResolvedValue(undefined);

      const { updateIndex } = await import("../context/context-hub.js");
      await updateIndex("/home/user/project", {
        type: "skill",
        slug: "my-skill",
        path: "skills/my-skill/SKILL.md",
        content: "new content",
        updatedAt: "2026-03-01T00:00:00Z",
      });

      const writeCall = mockWriteFile.mock.calls[0];
      const written = JSON.parse(writeCall[1] as string);
      expect(written.items).toHaveLength(1);
      expect(written.items[0].fingerprint).not.toBe("sha256:old");
    });

    it("writes .index.json with updated timestamp", async () => {
      const existingIndex = {
        version: 1,
        items: [],
        updatedAt: "2026-01-01T00:00:00Z",
      };
      mockReadFile.mockResolvedValue(JSON.stringify(existingIndex));
      mockWriteFile.mockResolvedValue(undefined);

      const { updateIndex } = await import("../context/context-hub.js");
      await updateIndex("/home/user/project", {
        type: "doc",
        slug: "readme",
        path: "docs/readme.md",
        content: "readme content",
        updatedAt: new Date().toISOString(),
      });

      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toContain(".index.json");
      const written = JSON.parse(writeCall[1] as string);
      expect(written.updatedAt).toBeDefined();
      expect(written.updatedAt).not.toBe("2026-01-01T00:00:00Z");
    });
  });

  describe("computeFingerprint", () => {
    it("returns sha256 hash of content", async () => {
      const { computeFingerprint } = await import("../context/context-hub.js");
      const fp = computeFingerprint("hello world");
      expect(fp).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    it("different content produces different hash", async () => {
      const { computeFingerprint } = await import("../context/context-hub.js");
      const fp1 = computeFingerprint("content A");
      const fp2 = computeFingerprint("content B");
      expect(fp1).not.toBe(fp2);
    });
  });

  describe("getContextStatus", () => {
    it("returns item counts by type", async () => {
      const mockIndex = {
        version: 1,
        items: [
          { type: "skill", slug: "skill-1", path: "skills/skill-1/SKILL.md", fingerprint: "sha256:a", updatedAt: "2026-01-01T00:00:00Z" },
          { type: "skill", slug: "skill-2", path: "skills/skill-2/SKILL.md", fingerprint: "sha256:b", updatedAt: "2026-01-01T00:00:00Z" },
          { type: "agent", slug: "agent-1", path: "agents/agent-1.md", fingerprint: "sha256:c", updatedAt: "2026-01-01T00:00:00Z" },
          { type: "doc", slug: "readme", path: "docs/readme.md", fingerprint: "sha256:d", updatedAt: "2026-01-01T00:00:00Z" },
        ],
        updatedAt: "2026-01-15T00:00:00Z",
      };
      mockReadFile.mockResolvedValue(JSON.stringify(mockIndex));

      const { getContextStatus } = await import("../context/context-hub.js");
      const status = await getContextStatus("/home/user/project");

      expect(status.initialized).toBe(true);
      expect(status.counts.skill).toBe(2);
      expect(status.counts.agent).toBe(1);
      expect(status.counts.doc).toBe(1);
      expect(status.counts.plan).toBe(0);
    });

    it("returns lastUpdated from index", async () => {
      const mockIndex = {
        version: 1,
        items: [],
        updatedAt: "2026-01-15T10:30:00Z",
      };
      mockReadFile.mockResolvedValue(JSON.stringify(mockIndex));

      const { getContextStatus } = await import("../context/context-hub.js");
      const status = await getContextStatus("/home/user/project");

      expect(status.lastUpdated).toBe("2026-01-15T10:30:00Z");
    });
  });
});
