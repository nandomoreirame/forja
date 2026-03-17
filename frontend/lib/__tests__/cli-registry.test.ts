import { describe, it, expect } from "vitest";
import {
  CLI_REGISTRY,
  TERMINAL_ICON,
  getCliDefinition,
  getSessionDisplayName,
  computeTabDisplayNames,
  getAllCliIds,
  getAllCliBinaries,
  getChatCliIds,
  detectSessionId,
} from "../cli-registry";
import type { CliId, SessionType } from "../cli-registry";

describe("CLI_REGISTRY", () => {
  it("contains all six CLI entries", () => {
    const ids = Object.keys(CLI_REGISTRY) as CliId[];
    expect(ids).toHaveLength(6);
    expect(ids).toContain("claude");
    expect(ids).toContain("gemini");
    expect(ids).toContain("codex");
    expect(ids).toContain("cursor-agent");
    expect(ids).toContain("opencode");
    expect(ids).toContain("gh-copilot");
  });

  describe("claude entry", () => {
    it("has correct displayName", () => {
      expect(CLI_REGISTRY.claude.displayName).toBe("Claude Code");
    });

    it("has correct binary", () => {
      expect(CLI_REGISTRY.claude.binary).toBe("claude");
    });

    it("has correct description", () => {
      expect(CLI_REGISTRY.claude.description).toBe(
        "AI-assisted coding with Anthropic Claude"
      );
    });

    it("has correct iconColor", () => {
      expect(CLI_REGISTRY.claude.iconColor).toBe("text-brand");
    });

    it("has correct id", () => {
      expect(CLI_REGISTRY.claude.id).toBe("claude");
    });

    it("has an icon path starting with ./images/", () => {
      expect(CLI_REGISTRY.claude.icon).toMatch(/^\.\/images\//);
    });
  });

  describe("gemini entry", () => {
    it("has correct displayName", () => {
      expect(CLI_REGISTRY.gemini.displayName).toBe("Gemini CLI");
    });

    it("has correct binary", () => {
      expect(CLI_REGISTRY.gemini.binary).toBe("gemini");
    });

    it("has correct description", () => {
      expect(CLI_REGISTRY.gemini.description).toBe(
        "AI-assisted coding with Google Gemini"
      );
    });

    it("has correct iconColor", () => {
      expect(CLI_REGISTRY.gemini.iconColor).toBe("text-ctp-blue");
    });

    it("has correct id", () => {
      expect(CLI_REGISTRY.gemini.id).toBe("gemini");
    });

    it("has an icon path starting with ./images/", () => {
      expect(CLI_REGISTRY.gemini.icon).toMatch(/^\.\/images\//);
    });
  });

  describe("codex entry", () => {
    it("has correct displayName", () => {
      expect(CLI_REGISTRY.codex.displayName).toBe("Codex CLI");
    });

    it("has correct binary", () => {
      expect(CLI_REGISTRY.codex.binary).toBe("codex");
    });

    it("has correct description", () => {
      expect(CLI_REGISTRY.codex.description).toBe(
        "AI-assisted coding with OpenAI Codex"
      );
    });

    it("has correct iconColor", () => {
      expect(CLI_REGISTRY.codex.iconColor).toBe("text-ctp-green");
    });

    it("has correct id", () => {
      expect(CLI_REGISTRY.codex.id).toBe("codex");
    });

    it("has an icon path starting with ./images/", () => {
      expect(CLI_REGISTRY.codex.icon).toMatch(/^\.\/images\//);
    });
  });

  describe("cursor-agent entry", () => {
    it("has correct displayName", () => {
      expect(CLI_REGISTRY["cursor-agent"].displayName).toBe("Cursor Agent");
    });

    it("has correct binary", () => {
      expect(CLI_REGISTRY["cursor-agent"].binary).toBe("cursor-agent");
    });

    it("has correct description", () => {
      expect(CLI_REGISTRY["cursor-agent"].description).toBe(
        "AI-assisted coding with Cursor"
      );
    });

    it("has correct iconColor", () => {
      expect(CLI_REGISTRY["cursor-agent"].iconColor).toBe("text-ctp-peach");
    });

    it("has correct id", () => {
      expect(CLI_REGISTRY["cursor-agent"].id).toBe("cursor-agent");
    });

    it("has an icon path starting with ./images/", () => {
      expect(CLI_REGISTRY["cursor-agent"].icon).toMatch(/^\.\/images\//);
    });
  });

  describe("opencode entry", () => {
    it("has correct displayName", () => {
      expect(CLI_REGISTRY.opencode.displayName).toBe("OpenCode");
    });

    it("has correct binary", () => {
      expect(CLI_REGISTRY.opencode.binary).toBe("opencode");
    });

    it("has correct description", () => {
      expect(CLI_REGISTRY.opencode.description).toBe(
        "Open source AI coding agent"
      );
    });

    it("has correct iconColor using Catppuccin teal", () => {
      expect(CLI_REGISTRY.opencode.iconColor).toBe("text-ctp-teal");
    });

    it("has correct id", () => {
      expect(CLI_REGISTRY.opencode.id).toBe("opencode");
    });

    it("has an icon path starting with ./images/", () => {
      expect(CLI_REGISTRY.opencode.icon).toMatch(/^\.\/images\//);
    });

    it("has icon pointing to opencode.svg", () => {
      expect(CLI_REGISTRY.opencode.icon).toBe("./images/opencode.svg");
    });
  });

  describe("gh-copilot entry", () => {
    it("has correct displayName", () => {
      expect(CLI_REGISTRY["gh-copilot"].displayName).toBe("GitHub Copilot");
    });

    it("has binary set to gh (the parent CLI)", () => {
      expect(CLI_REGISTRY["gh-copilot"].binary).toBe("gh");
    });

    it("has correct description", () => {
      expect(CLI_REGISTRY["gh-copilot"].description).toBe(
        "AI coding assistant by GitHub Copilot"
      );
    });

    it("has correct iconColor using Catppuccin lavender", () => {
      expect(CLI_REGISTRY["gh-copilot"].iconColor).toBe("text-ctp-lavender");
    });

    it("has correct id", () => {
      expect(CLI_REGISTRY["gh-copilot"].id).toBe("gh-copilot");
    });

    it("has an icon path starting with ./images/", () => {
      expect(CLI_REGISTRY["gh-copilot"].icon).toMatch(/^\.\/images\//);
    });

    it("has icon pointing to github-copilot.svg", () => {
      expect(CLI_REGISTRY["gh-copilot"].icon).toBe("./images/github-copilot.svg");
    });
  });

  it("every CLI entry has an icon path starting with ./images/", () => {
    const ids = Object.keys(CLI_REGISTRY) as CliId[];
    ids.forEach((id) => {
      expect(CLI_REGISTRY[id].icon).toMatch(/^\.\/images\//);
    });
  });
});

describe("getCliDefinition", () => {
  it("returns the correct definition for claude", () => {
    const def = getCliDefinition("claude");
    expect(def.id).toBe("claude");
    expect(def.displayName).toBe("Claude Code");
    expect(def.binary).toBe("claude");
  });

  it("returns the correct definition for gemini", () => {
    const def = getCliDefinition("gemini");
    expect(def.id).toBe("gemini");
    expect(def.displayName).toBe("Gemini CLI");
    expect(def.binary).toBe("gemini");
  });

  it("returns the correct definition for codex", () => {
    const def = getCliDefinition("codex");
    expect(def.id).toBe("codex");
    expect(def.displayName).toBe("Codex CLI");
    expect(def.binary).toBe("codex");
  });

  it("returns the correct definition for cursor-agent", () => {
    const def = getCliDefinition("cursor-agent");
    expect(def.id).toBe("cursor-agent");
    expect(def.displayName).toBe("Cursor Agent");
    expect(def.binary).toBe("cursor-agent");
  });

  it("returns the correct definition for opencode", () => {
    const def = getCliDefinition("opencode");
    expect(def.id).toBe("opencode");
    expect(def.displayName).toBe("OpenCode");
    expect(def.binary).toBe("opencode");
  });

  it("returns the correct definition for gh-copilot", () => {
    const def = getCliDefinition("gh-copilot");
    expect(def.id).toBe("gh-copilot");
    expect(def.displayName).toBe("GitHub Copilot");
    expect(def.binary).toBe("gh");
  });

  it("returns the same object as in the registry", () => {
    expect(getCliDefinition("claude")).toBe(CLI_REGISTRY.claude);
  });
});

describe("getSessionDisplayName", () => {
  describe("without counter", () => {
    it("returns just displayName for claude", () => {
      expect(getSessionDisplayName("claude")).toBe("Claude Code");
    });

    it("returns just displayName for gemini", () => {
      expect(getSessionDisplayName("gemini")).toBe("Gemini CLI");
    });

    it("returns just displayName for codex", () => {
      expect(getSessionDisplayName("codex")).toBe("Codex CLI");
    });

    it("returns just displayName for cursor-agent", () => {
      expect(getSessionDisplayName("cursor-agent")).toBe("Cursor Agent");
    });

    it("returns just displayName for opencode", () => {
      expect(getSessionDisplayName("opencode")).toBe("OpenCode");
    });

    it("returns just displayName for gh-copilot", () => {
      expect(getSessionDisplayName("gh-copilot")).toBe("GitHub Copilot");
    });

    it("returns 'Terminal' for terminal session type", () => {
      expect(getSessionDisplayName("terminal")).toBe("Terminal");
    });
  });

  describe("with counter", () => {
    it("returns 'Claude Code #1' for claude with counter 1", () => {
      expect(getSessionDisplayName("claude", 1)).toBe("Claude Code #1");
    });

    it("returns 'Gemini CLI #2' for gemini with counter 2", () => {
      expect(getSessionDisplayName("gemini", 2)).toBe("Gemini CLI #2");
    });

    it("returns 'Codex CLI #3' for codex with counter 3", () => {
      expect(getSessionDisplayName("codex", 3)).toBe("Codex CLI #3");
    });

    it("returns 'Cursor Agent #5' for cursor-agent with counter 5", () => {
      expect(getSessionDisplayName("cursor-agent", 5)).toBe("Cursor Agent #5");
    });

    it("returns 'OpenCode #1' for opencode with counter 1", () => {
      expect(getSessionDisplayName("opencode", 1)).toBe("OpenCode #1");
    });

    it("returns 'GitHub Copilot #2' for gh-copilot with counter 2", () => {
      expect(getSessionDisplayName("gh-copilot", 2)).toBe("GitHub Copilot #2");
    });

    it("returns 'Terminal #3' for terminal with counter 3", () => {
      expect(getSessionDisplayName("terminal", 3)).toBe("Terminal #3");
    });

    it("handles counter 0 correctly", () => {
      expect(getSessionDisplayName("claude", 0)).toBe("Claude Code #0");
    });
  });
});

describe("getAllCliIds", () => {
  it("returns an array of all six CLI IDs", () => {
    const ids = getAllCliIds();
    expect(ids).toHaveLength(6);
    expect(ids).toContain("claude");
    expect(ids).toContain("gemini");
    expect(ids).toContain("codex");
    expect(ids).toContain("cursor-agent");
    expect(ids).toContain("opencode");
    expect(ids).toContain("gh-copilot");
  });

  it("returns an array (not Record keys)", () => {
    expect(Array.isArray(getAllCliIds())).toBe(true);
  });

  it("does not include 'terminal'", () => {
    expect(getAllCliIds()).not.toContain("terminal");
  });
});

describe("getAllCliBinaries", () => {
  it("returns an array of all six binary names", () => {
    const binaries = getAllCliBinaries();
    expect(binaries).toHaveLength(6);
    expect(binaries).toContain("claude");
    expect(binaries).toContain("gemini");
    expect(binaries).toContain("codex");
    expect(binaries).toContain("cursor-agent");
    expect(binaries).toContain("opencode");
    expect(binaries).toContain("gh");
  });

  it("returns an array", () => {
    expect(Array.isArray(getAllCliBinaries())).toBe(true);
  });

  it("each binary corresponds to the correct CLI", () => {
    const binaries = getAllCliBinaries();
    const ids = getAllCliIds();
    ids.forEach((id) => {
      expect(binaries).toContain(CLI_REGISTRY[id].binary);
    });
  });

  it("gh-copilot binary is 'gh'", () => {
    const binaries = getAllCliBinaries();
    expect(binaries).toContain("gh");
  });
});

describe("chatSupported field", () => {
  it("claude supports chat", () => {
    expect(CLI_REGISTRY.claude.chatSupported).toBe(true);
  });

  it("gemini supports chat", () => {
    expect(CLI_REGISTRY.gemini.chatSupported).toBe(true);
  });

  it("codex supports chat", () => {
    expect(CLI_REGISTRY.codex.chatSupported).toBe(true);
  });

  it("cursor-agent supports chat", () => {
    expect(CLI_REGISTRY["cursor-agent"].chatSupported).toBe(true);
  });

  it("opencode does not support chat", () => {
    expect(CLI_REGISTRY.opencode.chatSupported).toBe(false);
  });

  it("gh-copilot does not support chat", () => {
    expect(CLI_REGISTRY["gh-copilot"].chatSupported).toBe(false);
  });
});

describe("getChatCliIds", () => {
  it("returns only CLIs that support chat", () => {
    const ids = getChatCliIds();
    expect(ids).toContain("claude");
    expect(ids).toContain("gemini");
    expect(ids).toContain("codex");
    expect(ids).toContain("cursor-agent");
    expect(ids).not.toContain("opencode");
    expect(ids).not.toContain("gh-copilot");
  });

  it("returns an array", () => {
    expect(Array.isArray(getChatCliIds())).toBe(true);
  });
});

describe("TERMINAL_ICON", () => {
  it("is defined", () => {
    expect(TERMINAL_ICON).toBeDefined();
  });

  it("is the terminal SVG path", () => {
    expect(TERMINAL_ICON).toBe("./images/terminal.svg");
  });

  it("starts with ./images/", () => {
    expect(TERMINAL_ICON).toMatch(/^\.\/images\//);
  });
});

describe("type contracts", () => {
  it("CliId type covers all expected values", () => {
    const ids: CliId[] = ["claude", "gemini", "codex", "cursor-agent", "opencode", "gh-copilot"];
    expect(ids).toHaveLength(6);
  });

  it("SessionType extends CliId with terminal", () => {
    const sessionTypes: SessionType[] = [
      "claude",
      "gemini",
      "codex",
      "cursor-agent",
      "opencode",
      "gh-copilot",
      "terminal",
    ];
    expect(sessionTypes).toHaveLength(7);
  });
});

describe("resumeFlag field", () => {
  it("claude has resumeFlag set to '--resume'", () => {
    expect(CLI_REGISTRY.claude.resumeFlag).toBe("--resume");
  });

  it("gemini has resumeFlag set to '--resume'", () => {
    expect(CLI_REGISTRY.gemini.resumeFlag).toBe("--resume");
  });

  it("codex has resumeFlag set to '--resume'", () => {
    expect(CLI_REGISTRY.codex.resumeFlag).toBe("--resume");
  });

  it("cursor-agent uses '--resume=' flag format", () => {
    expect(CLI_REGISTRY["cursor-agent"].resumeFlag).toBe("--resume=");
  });

  it("opencode has no resumeFlag (no resume support)", () => {
    expect(CLI_REGISTRY.opencode.resumeFlag).toBeUndefined();
  });

  it("gh-copilot has no resumeFlag (no resume support)", () => {
    expect(CLI_REGISTRY["gh-copilot"].resumeFlag).toBeUndefined();
  });
});

describe("sessionIdPattern field", () => {
  it("claude has sessionIdPattern defined", () => {
    expect(CLI_REGISTRY.claude.sessionIdPattern).toBeDefined();
    expect(CLI_REGISTRY.claude.sessionIdPattern).toBeInstanceOf(RegExp);
  });

  it("gemini has sessionIdPattern defined", () => {
    expect(CLI_REGISTRY.gemini.sessionIdPattern).toBeDefined();
    expect(CLI_REGISTRY.gemini.sessionIdPattern).toBeInstanceOf(RegExp);
  });

  it("codex has sessionIdPattern defined", () => {
    expect(CLI_REGISTRY.codex.sessionIdPattern).toBeDefined();
    expect(CLI_REGISTRY.codex.sessionIdPattern).toBeInstanceOf(RegExp);
  });

  it("cursor-agent has sessionIdPattern defined", () => {
    expect(CLI_REGISTRY["cursor-agent"].sessionIdPattern).toBeDefined();
    expect(CLI_REGISTRY["cursor-agent"].sessionIdPattern).toBeInstanceOf(RegExp);
  });

  it("opencode has no sessionIdPattern (no resume support)", () => {
    expect(CLI_REGISTRY.opencode.sessionIdPattern).toBeUndefined();
  });

  it("gh-copilot has no sessionIdPattern (no resume support)", () => {
    expect(CLI_REGISTRY["gh-copilot"].sessionIdPattern).toBeUndefined();
  });

  describe("claude sessionIdPattern matches expected format", () => {
    it("matches 'session: abc-123' and extracts session ID", () => {
      const pattern = CLI_REGISTRY.claude.sessionIdPattern!;
      const match = "session: abc-123".match(pattern);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("abc-123");
    });

    it("matches uppercase 'Session: ABC-123' case-insensitively", () => {
      const pattern = CLI_REGISTRY.claude.sessionIdPattern!;
      const match = "Session: ABC-123".match(pattern);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("ABC-123");
    });

    it("matches session ID with hex characters", () => {
      const pattern = CLI_REGISTRY.claude.sessionIdPattern!;
      const match = "session: deadbeef-cafe-1234".match(pattern);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("deadbeef-cafe-1234");
    });

    it("does not match unrelated strings", () => {
      const pattern = CLI_REGISTRY.claude.sessionIdPattern!;
      expect("some random output".match(pattern)).toBeNull();
    });
  });

  describe("gemini sessionIdPattern matches expected format", () => {
    it("matches 'session: abc123' and extracts session ID", () => {
      const pattern = CLI_REGISTRY.gemini.sessionIdPattern!;
      const match = "session: abc123".match(pattern);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("abc123");
    });

    it("matches 'session xyz-456' format without colon", () => {
      const pattern = CLI_REGISTRY.gemini.sessionIdPattern!;
      const match = "session xyz-456".match(pattern);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("xyz-456");
    });
  });

  describe("codex sessionIdPattern matches expected format", () => {
    it("matches 'session: abc123' and extracts session ID", () => {
      const pattern = CLI_REGISTRY.codex.sessionIdPattern!;
      const match = "session: abc123".match(pattern);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("abc123");
    });
  });

  describe("cursor-agent sessionIdPattern matches expected format", () => {
    it("matches 'chat: abc123' and extracts chat ID", () => {
      const pattern = CLI_REGISTRY["cursor-agent"].sessionIdPattern!;
      const match = "chat: abc123".match(pattern);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("abc123");
    });

    it("matches 'chat xyz-456' format without colon", () => {
      const pattern = CLI_REGISTRY["cursor-agent"].sessionIdPattern!;
      const match = "chat xyz-456".match(pattern);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("xyz-456");
    });
  });
});

describe("CliDefinition interface includes resumeFlag and sessionIdPattern", () => {
  it("claude has resumeFlag '--resume' and sessionIdPattern matching 'session: abc-123'", () => {
    const claude = CLI_REGISTRY.claude;
    expect(claude.resumeFlag).toBe("--resume");
    const match = "session: abc-123".match(claude.sessionIdPattern!);
    expect(match).not.toBeNull();
    expect(match![1]).toBe("abc-123");
  });

  it("CLIs without resume support have no resumeFlag", () => {
    expect(CLI_REGISTRY.opencode.resumeFlag).toBeUndefined();
    expect(CLI_REGISTRY["gh-copilot"].resumeFlag).toBeUndefined();
  });
});

describe("detectSessionId", () => {
  it("returns session ID for claude output matching 'Session: abc-def-123'", () => {
    expect(detectSessionId("claude", "Session: abc-def-123")).toBe("abc-def-123");
  });

  it("returns null for terminal sessions (no pattern lookup)", () => {
    expect(detectSessionId("terminal", "Session: abc-def-123")).toBeNull();
  });

  it("returns null when no match found in data", () => {
    expect(detectSessionId("claude", "some random output without session id")).toBeNull();
  });

  it("returns session ID for cursor-agent output matching 'Chat: my-chat-id'", () => {
    expect(detectSessionId("cursor-agent", "Chat: my-chat-id")).toBe("my-chat-id");
  });

  it("returns null for CLIs with no sessionIdPattern (opencode)", () => {
    expect(detectSessionId("opencode", "session: abc123")).toBeNull();
  });

  it("returns null for CLIs with no sessionIdPattern (gh-copilot)", () => {
    expect(detectSessionId("gh-copilot", "session: abc123")).toBeNull();
  });

  it("extracts session ID from gemini output", () => {
    expect(detectSessionId("gemini", "session: my-gemini-session-42")).toBe("my-gemini-session-42");
  });

  it("extracts session ID from codex output", () => {
    expect(detectSessionId("codex", "session: codex-session-99")).toBe("codex-session-99");
  });
});

describe("computeTabDisplayNames", () => {
  type TabLike = { id: string; sessionType: SessionType };

  describe("single tab of each type — no numbers shown", () => {
    it("single claude tab shows 'Claude Code' without number", () => {
      const tabs: TabLike[] = [{ id: "t1", sessionType: "claude" }];
      const names = computeTabDisplayNames(tabs);
      expect(names["t1"]).toBe("Claude Code");
    });

    it("single terminal tab shows 'Terminal' without number", () => {
      const tabs: TabLike[] = [{ id: "t1", sessionType: "terminal" }];
      const names = computeTabDisplayNames(tabs);
      expect(names["t1"]).toBe("Terminal");
    });

    it("single gemini tab shows 'Gemini CLI' without number", () => {
      const tabs: TabLike[] = [{ id: "t1", sessionType: "gemini" }];
      const names = computeTabDisplayNames(tabs);
      expect(names["t1"]).toBe("Gemini CLI");
    });

    it("one of each type: all show without numbers", () => {
      const tabs: TabLike[] = [
        { id: "t1", sessionType: "claude" },
        { id: "t2", sessionType: "gemini" },
        { id: "t3", sessionType: "terminal" },
        { id: "t4", sessionType: "opencode" },
      ];
      const names = computeTabDisplayNames(tabs);
      expect(names["t1"]).toBe("Claude Code");
      expect(names["t2"]).toBe("Gemini CLI");
      expect(names["t3"]).toBe("Terminal");
      expect(names["t4"]).toBe("OpenCode");
    });
  });

  describe("multiple tabs of same type — per-type sequential numbers", () => {
    it("two claude tabs get #1 and #2", () => {
      const tabs: TabLike[] = [
        { id: "t1", sessionType: "claude" },
        { id: "t2", sessionType: "claude" },
      ];
      const names = computeTabDisplayNames(tabs);
      expect(names["t1"]).toBe("Claude Code #1");
      expect(names["t2"]).toBe("Claude Code #2");
    });

    it("three terminal tabs get #1, #2, #3", () => {
      const tabs: TabLike[] = [
        { id: "t1", sessionType: "terminal" },
        { id: "t2", sessionType: "terminal" },
        { id: "t3", sessionType: "terminal" },
      ];
      const names = computeTabDisplayNames(tabs);
      expect(names["t1"]).toBe("Terminal #1");
      expect(names["t2"]).toBe("Terminal #2");
      expect(names["t3"]).toBe("Terminal #3");
    });

    it("two codex tabs get per-type numbers, single terminal gets no number", () => {
      const tabs: TabLike[] = [
        { id: "t1", sessionType: "codex" },
        { id: "t2", sessionType: "terminal" },
        { id: "t3", sessionType: "codex" },
      ];
      const names = computeTabDisplayNames(tabs);
      expect(names["t1"]).toBe("Codex CLI #1");
      expect(names["t2"]).toBe("Terminal");
      expect(names["t3"]).toBe("Codex CLI #2");
    });

    it("mixed: two claude, one gemini, two terminal — correct per-type numbering", () => {
      const tabs: TabLike[] = [
        { id: "t1", sessionType: "claude" },
        { id: "t2", sessionType: "gemini" },
        { id: "t3", sessionType: "terminal" },
        { id: "t4", sessionType: "claude" },
        { id: "t5", sessionType: "terminal" },
      ];
      const names = computeTabDisplayNames(tabs);
      expect(names["t1"]).toBe("Claude Code #1");
      expect(names["t2"]).toBe("Gemini CLI");
      expect(names["t3"]).toBe("Terminal #1");
      expect(names["t4"]).toBe("Claude Code #2");
      expect(names["t5"]).toBe("Terminal #2");
    });
  });

  describe("empty tabs list", () => {
    it("returns empty object for empty tabs", () => {
      const names = computeTabDisplayNames([]);
      expect(names).toEqual({});
    });
  });

  describe("counter resets — only based on current list", () => {
    it("after removing tabs, remaining single tab has no number", () => {
      // Simulates: had 2 claude tabs, closed one — the remaining shows no number
      const tabs: TabLike[] = [{ id: "t2", sessionType: "claude" }];
      const names = computeTabDisplayNames(tabs);
      expect(names["t2"]).toBe("Claude Code");
    });

    it("numbers are based on position in current list, not any external counter", () => {
      // Even if ids are t5, t9, t15 (suggesting previous tabs existed), numbering starts at 1
      const tabs: TabLike[] = [
        { id: "t5", sessionType: "claude" },
        { id: "t9", sessionType: "claude" },
        { id: "t15", sessionType: "claude" },
      ];
      const names = computeTabDisplayNames(tabs);
      expect(names["t5"]).toBe("Claude Code #1");
      expect(names["t9"]).toBe("Claude Code #2");
      expect(names["t15"]).toBe("Claude Code #3");
    });
  });
});
