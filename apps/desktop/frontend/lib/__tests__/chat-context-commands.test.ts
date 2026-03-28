import { describe, it, expect } from "vitest";
import {
  parseContextCommand,
  type ContextCommand,
} from "../chat-context-commands";

describe("chat-context-commands", () => {
  describe("parseContextCommand", () => {
    it("returns null for non-command input", () => {
      expect(parseContextCommand("hello world")).toBeNull();
      expect(parseContextCommand("just a regular message")).toBeNull();
      expect(parseContextCommand("")).toBeNull();
    });

    it("parses /context init", () => {
      const result = parseContextCommand("/context init");
      expect(result).toEqual<ContextCommand>({
        type: "context",
        action: "init",
      });
    });

    it("parses /context status", () => {
      const result = parseContextCommand("/context status");
      expect(result).toEqual<ContextCommand>({
        type: "context",
        action: "status",
      });
    });

    it("parses /context sync out", () => {
      const result = parseContextCommand("/context sync out");
      expect(result).toEqual<ContextCommand>({
        type: "context",
        action: "sync_out",
      });
    });

    it("parses /context sync in", () => {
      const result = parseContextCommand("/context sync in");
      expect(result).toEqual<ContextCommand>({
        type: "context",
        action: "sync_in",
      });
    });

    it("parses /context sync in --strategy merge", () => {
      const result = parseContextCommand("/context sync in --strategy merge");
      expect(result).toEqual<ContextCommand>({
        type: "context",
        action: "sync_in",
        options: { strategy: "merge" },
      });
    });

    it("parses /context sync out --strategy overwrite", () => {
      const result = parseContextCommand("/context sync out --strategy overwrite");
      expect(result).toEqual<ContextCommand>({
        type: "context",
        action: "sync_out",
        options: { strategy: "overwrite" },
      });
    });

    it("parses /skill create <slug>", () => {
      const result = parseContextCommand("/skill create commit-message");
      expect(result).toEqual<ContextCommand>({
        type: "skill",
        action: "create",
        slug: "commit-message",
      });
    });

    it("parses /agent create <slug>", () => {
      const result = parseContextCommand("/agent create code-reviewer");
      expect(result).toEqual<ContextCommand>({
        type: "agent",
        action: "create",
        slug: "code-reviewer",
      });
    });

    it("returns null for unknown commands", () => {
      expect(parseContextCommand("/unknown command")).toBeNull();
      expect(parseContextCommand("/context unknown")).toBeNull();
    });

    it("is case-insensitive for commands", () => {
      expect(parseContextCommand("/Context Init")).toEqual<ContextCommand>({
        type: "context",
        action: "init",
      });
    });

    it("trims whitespace", () => {
      expect(parseContextCommand("  /context init  ")).toEqual<ContextCommand>({
        type: "context",
        action: "init",
      });
    });

    it("parses /context sync out --tools claude,codex", () => {
      const result = parseContextCommand("/context sync out --tools claude,codex");
      expect(result).toEqual<ContextCommand>({
        type: "context",
        action: "sync_out",
        options: { toolIds: ["claude", "codex"] },
      });
    });

    it("parses combined options --strategy and --tools", () => {
      const result = parseContextCommand("/context sync in --strategy merge --tools claude");
      expect(result).toEqual<ContextCommand>({
        type: "context",
        action: "sync_in",
        options: { strategy: "merge", toolIds: ["claude"] },
      });
    });
  });
});
