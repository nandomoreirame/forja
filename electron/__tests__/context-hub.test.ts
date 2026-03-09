import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs/promises", () => ({
  mkdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  access: vi.fn(),
  unlink: vi.fn(),
  rm: vi.fn(),
}));

vi.mock("os", () => ({
  default: { homedir: vi.fn(() => "/home/testuser") },
  homedir: vi.fn(() => "/home/testuser"),
}));

import * as fs from "fs/promises";

const mockMkdir = vi.mocked(fs.mkdir);
const mockReadFile = vi.mocked(fs.readFile);
const mockWriteFile = vi.mocked(fs.writeFile);
const mockAccess = vi.mocked(fs.access);
const mockUnlink = vi.mocked(fs.unlink);
const mockRm = vi.mocked(fs.rm);

const HUB_ROOT = "/home/testuser/.config/forja/context";

describe("ContextHub", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe("getContextHubRoot", () => {
    it("returns ~/.config/forja/context", async () => {
      const { getContextHubRoot } = await import("../context/context-hub.js");
      expect(getContextHubRoot()).toBe(HUB_ROOT);
    });
  });

  describe("ensureContextHub", () => {
    it("creates global context directory structure (docs, agents, skills, plans)", async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockAccess.mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));
      mockWriteFile.mockResolvedValue(undefined);

      const { ensureContextHub } = await import("../context/context-hub.js");
      await ensureContextHub();

      const mkdirCalls = mockMkdir.mock.calls.map((c) => c[0] as string);

      expect(mkdirCalls.some((p) => p === `${HUB_ROOT}/docs`)).toBe(true);
      expect(mkdirCalls.some((p) => p === `${HUB_ROOT}/agents`)).toBe(true);
      expect(mkdirCalls.some((p) => p === `${HUB_ROOT}/skills`)).toBe(true);
      expect(mkdirCalls.some((p) => p === `${HUB_ROOT}/plans`)).toBe(true);
    });

    it("creates .index.json if not present", async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockAccess.mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));
      mockWriteFile.mockResolvedValue(undefined);

      const { ensureContextHub } = await import("../context/context-hub.js");
      await ensureContextHub();

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
      mockAccess.mockResolvedValue(undefined);

      const { ensureContextHub } = await import("../context/context-hub.js");
      await ensureContextHub();

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
      mockReadFile.mockResolvedValue(
        JSON.stringify({ version: 1, items: [], updatedAt: new Date().toISOString() })
      );

      const { createSkill } = await import("../context/context-hub.js");
      const filePath = await createSkill("my-skill");

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
      await createSkill("my-skill");

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
      await expect(createSkill("my-skill")).rejects.toThrow(
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
      const filePath = await createAgent("my-agent");

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
      await createAgent("my-agent");

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
      await expect(createAgent("my-agent")).rejects.toThrow(
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
      const result = await readIndex();

      expect(result.version).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].slug).toBe("test-skill");
    });

    it("returns default empty index if file doesn't exist", async () => {
      mockReadFile.mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));

      const { readIndex } = await import("../context/context-hub.js");
      const result = await readIndex();

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
      await updateIndex({
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
      await updateIndex({
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
      await updateIndex({
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
      const status = await getContextStatus();

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
      const status = await getContextStatus();

      expect(status.lastUpdated).toBe("2026-01-15T10:30:00Z");
    });
  });

  describe("listItems", () => {
    it("returns all items from index", async () => {
      const mockIndex = {
        version: 1,
        items: [
          { type: "skill", slug: "tdd", path: "skills/tdd/SKILL.md", fingerprint: "sha256:a", updatedAt: "2026-01-01T00:00:00Z" },
          { type: "agent", slug: "reviewer", path: "agents/reviewer.md", fingerprint: "sha256:b", updatedAt: "2026-01-01T00:00:00Z" },
        ],
        updatedAt: "2026-01-01T00:00:00Z",
      };
      mockReadFile.mockResolvedValue(JSON.stringify(mockIndex));

      const { listItems } = await import("../context/context-hub.js");
      const items = await listItems();
      expect(items).toHaveLength(2);
    });

    it("filters by type when provided", async () => {
      const mockIndex = {
        version: 1,
        items: [
          { type: "skill", slug: "tdd", path: "skills/tdd/SKILL.md", fingerprint: "sha256:a", updatedAt: "2026-01-01T00:00:00Z" },
          { type: "agent", slug: "reviewer", path: "agents/reviewer.md", fingerprint: "sha256:b", updatedAt: "2026-01-01T00:00:00Z" },
          { type: "skill", slug: "debug", path: "skills/debug/SKILL.md", fingerprint: "sha256:c", updatedAt: "2026-01-01T00:00:00Z" },
        ],
        updatedAt: "2026-01-01T00:00:00Z",
      };
      mockReadFile.mockResolvedValue(JSON.stringify(mockIndex));

      const { listItems } = await import("../context/context-hub.js");
      const items = await listItems("skill");
      expect(items).toHaveLength(2);
      expect(items.every((i: { type: string }) => i.type === "skill")).toBe(true);
    });

    it("returns empty array when index has no items", async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({ version: 1, items: [], updatedAt: "2026-01-01T00:00:00Z" }));

      const { listItems } = await import("../context/context-hub.js");
      const items = await listItems();
      expect(items).toEqual([]);
    });
  });

  describe("readItem", () => {
    it("reads file content by type and slug", async () => {
      const mockIndex = {
        version: 1,
        items: [{ type: "skill", slug: "tdd", path: "skills/tdd/SKILL.md", fingerprint: "sha256:a", updatedAt: "2026-01-01T00:00:00Z" }],
        updatedAt: "2026-01-01T00:00:00Z",
      };
      mockReadFile.mockImplementation(async (p) => {
        const s = String(p);
        if (s.includes(".index.json")) return JSON.stringify(mockIndex) as unknown as Buffer;
        return "# TDD Skill\nContent here" as unknown as Buffer;
      });

      const { readItem } = await import("../context/context-hub.js");
      const content = await readItem("skill", "tdd");
      expect(content).toBe("# TDD Skill\nContent here");
    });

    it("throws when item not found in index", async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({ version: 1, items: [], updatedAt: "2026-01-01T00:00:00Z" }));

      const { readItem } = await import("../context/context-hub.js");
      await expect(readItem("skill", "nonexistent")).rejects.toThrow(/not found/);
    });
  });

  describe("writeItem", () => {
    it("writes skill file to skills/<slug>/SKILL.md", async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(JSON.stringify({ version: 1, items: [], updatedAt: "2026-01-01T00:00:00Z" }));

      const { writeItem } = await import("../context/context-hub.js");
      const filePath = await writeItem("skill", "tdd", "# TDD\nContent");
      expect(filePath).toContain("skills/tdd/SKILL.md");

      const skillWrite = mockWriteFile.mock.calls.find((c) => (c[0] as string).includes("SKILL.md"));
      expect(skillWrite).toBeDefined();
      expect(skillWrite![1]).toBe("# TDD\nContent");
    });

    it("writes agent file to agents/<slug>.md", async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(JSON.stringify({ version: 1, items: [], updatedAt: "2026-01-01T00:00:00Z" }));

      const { writeItem } = await import("../context/context-hub.js");
      const filePath = await writeItem("agent", "reviewer", "# Reviewer");
      expect(filePath).toContain("agents/reviewer.md");
    });

    it("writes doc file to docs/<slug>.md", async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(JSON.stringify({ version: 1, items: [], updatedAt: "2026-01-01T00:00:00Z" }));

      const { writeItem } = await import("../context/context-hub.js");
      const filePath = await writeItem("doc", "readme", "# README");
      expect(filePath).toContain("docs/readme.md");
    });

    it("updates index after writing", async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(JSON.stringify({ version: 1, items: [], updatedAt: "2026-01-01T00:00:00Z" }));

      const { writeItem } = await import("../context/context-hub.js");
      await writeItem("skill", "tdd", "# TDD");

      const indexWrite = mockWriteFile.mock.calls.find((c) => (c[0] as string).includes(".index.json"));
      expect(indexWrite).toBeDefined();
      const indexContent = JSON.parse(indexWrite![1] as string);
      expect(indexContent.items.some((i: { slug: string }) => i.slug === "tdd")).toBe(true);
    });
  });

  describe("deleteItem", () => {
    it("removes file from disk", async () => {
      const mockIndex = {
        version: 1,
        items: [{ type: "agent", slug: "reviewer", path: "agents/reviewer.md", fingerprint: "sha256:a", updatedAt: "2026-01-01T00:00:00Z" }],
        updatedAt: "2026-01-01T00:00:00Z",
      };
      mockReadFile.mockResolvedValue(JSON.stringify(mockIndex));
      mockUnlink.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const { deleteItem } = await import("../context/context-hub.js");
      await deleteItem("agent", "reviewer");

      expect(mockUnlink).toHaveBeenCalledWith(expect.stringContaining("agents/reviewer.md"));
    });

    it("removes entry from index", async () => {
      const mockIndex = {
        version: 1,
        items: [
          { type: "agent", slug: "reviewer", path: "agents/reviewer.md", fingerprint: "sha256:a", updatedAt: "2026-01-01T00:00:00Z" },
          { type: "skill", slug: "tdd", path: "skills/tdd/SKILL.md", fingerprint: "sha256:b", updatedAt: "2026-01-01T00:00:00Z" },
        ],
        updatedAt: "2026-01-01T00:00:00Z",
      };
      mockReadFile.mockResolvedValue(JSON.stringify(mockIndex));
      mockUnlink.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const { deleteItem } = await import("../context/context-hub.js");
      await deleteItem("agent", "reviewer");

      const indexWrite = mockWriteFile.mock.calls.find((c) => (c[0] as string).includes(".index.json"));
      expect(indexWrite).toBeDefined();
      const indexContent = JSON.parse(indexWrite![1] as string);
      expect(indexContent.items).toHaveLength(1);
      expect(indexContent.items[0].slug).toBe("tdd");
    });

    it("removes entire skill directory", async () => {
      const mockIndex = {
        version: 1,
        items: [{ type: "skill", slug: "tdd", path: "skills/tdd/SKILL.md", fingerprint: "sha256:a", updatedAt: "2026-01-01T00:00:00Z" }],
        updatedAt: "2026-01-01T00:00:00Z",
      };
      mockReadFile.mockResolvedValue(JSON.stringify(mockIndex));
      mockRm.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const { deleteItem } = await import("../context/context-hub.js");
      await deleteItem("skill", "tdd");

      expect(mockRm).toHaveBeenCalledWith(expect.stringContaining("skills/tdd"), { recursive: true });
    });

    it("throws when item not found", async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({ version: 1, items: [], updatedAt: "2026-01-01T00:00:00Z" }));

      const { deleteItem } = await import("../context/context-hub.js");
      await expect(deleteItem("skill", "nonexistent")).rejects.toThrow(/not found/);
    });
  });

  describe("importItem", () => {
    it("imports a markdown file as doc", async () => {
      mockReadFile.mockImplementation(async (p) => {
        const s = String(p);
        if (s.includes(".index.json")) return JSON.stringify({ version: 1, items: [], updatedAt: "2026-01-01T00:00:00Z" }) as unknown as Buffer;
        return "# My Guide\nSome content" as unknown as Buffer;
      });
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const { importItem } = await import("../context/context-hub.js");
      const result = await importItem("doc", "/tmp/my-guide.md");

      expect(result).toContain("docs/my-guide.md");
      const docWrite = mockWriteFile.mock.calls.find((c) => (c[0] as string).includes("docs/my-guide.md"));
      expect(docWrite).toBeDefined();
      expect(docWrite![1]).toBe("# My Guide\nSome content");
    });

    it("imports a markdown file as agent", async () => {
      mockReadFile.mockImplementation(async (p) => {
        const s = String(p);
        if (s.includes(".index.json")) return JSON.stringify({ version: 1, items: [], updatedAt: "2026-01-01T00:00:00Z" }) as unknown as Buffer;
        return "---\nname: reviewer\n---\n" as unknown as Buffer;
      });
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const { importItem } = await import("../context/context-hub.js");
      const result = await importItem("agent", "/tmp/reviewer.md");

      expect(result).toContain("agents/reviewer.md");
    });

    it("imports a markdown file as skill", async () => {
      mockReadFile.mockImplementation(async (p) => {
        const s = String(p);
        if (s.includes(".index.json")) return JSON.stringify({ version: 1, items: [], updatedAt: "2026-01-01T00:00:00Z" }) as unknown as Buffer;
        return "---\nname: tdd\n---\n" as unknown as Buffer;
      });
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const { importItem } = await import("../context/context-hub.js");
      const result = await importItem("skill", "/tmp/tdd.md");

      expect(result).toContain("skills/tdd/SKILL.md");
    });

    it("derives slug from filename without extension", async () => {
      mockReadFile.mockImplementation(async (p) => {
        const s = String(p);
        if (s.includes(".index.json")) return JSON.stringify({ version: 1, items: [], updatedAt: "2026-01-01T00:00:00Z" }) as unknown as Buffer;
        return "# Content" as unknown as Buffer;
      });
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const { importItem } = await import("../context/context-hub.js");
      const result = await importItem("doc", "/path/to/My Guide.md");

      expect(result).toContain("docs/my-guide.md");
    });

    it("throws when source file does not exist", async () => {
      mockReadFile.mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));

      const { importItem } = await import("../context/context-hub.js");
      await expect(importItem("doc", "/tmp/nonexistent.md")).rejects.toThrow();
    });

    it("throws when source file is not .md", async () => {
      const { importItem } = await import("../context/context-hub.js");
      await expect(importItem("doc", "/tmp/file.txt")).rejects.toThrow("Only .md files can be imported");
    });
  });
});
