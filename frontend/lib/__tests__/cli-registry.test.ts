import { describe, it, expect } from "vitest";
import {
  CLI_REGISTRY,
  TERMINAL_ICON,
  getCliDefinition,
  getSessionDisplayName,
  getAllCliIds,
  getAllCliBinaries,
} from "../cli-registry";
import type { CliId, SessionType } from "../cli-registry";

describe("CLI_REGISTRY", () => {
  it("contains all four CLI entries", () => {
    const ids = Object.keys(CLI_REGISTRY) as CliId[];
    expect(ids).toHaveLength(4);
    expect(ids).toContain("claude");
    expect(ids).toContain("gemini");
    expect(ids).toContain("codex");
    expect(ids).toContain("cursor-agent");
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

    it("returns 'Terminal #3' for terminal with counter 3", () => {
      expect(getSessionDisplayName("terminal", 3)).toBe("Terminal #3");
    });

    it("handles counter 0 correctly", () => {
      expect(getSessionDisplayName("claude", 0)).toBe("Claude Code #0");
    });
  });
});

describe("getAllCliIds", () => {
  it("returns an array of all four CLI IDs", () => {
    const ids = getAllCliIds();
    expect(ids).toHaveLength(4);
    expect(ids).toContain("claude");
    expect(ids).toContain("gemini");
    expect(ids).toContain("codex");
    expect(ids).toContain("cursor-agent");
  });

  it("returns an array (not Record keys)", () => {
    expect(Array.isArray(getAllCliIds())).toBe(true);
  });

  it("does not include 'terminal'", () => {
    expect(getAllCliIds()).not.toContain("terminal");
  });
});

describe("getAllCliBinaries", () => {
  it("returns an array of all four binary names", () => {
    const binaries = getAllCliBinaries();
    expect(binaries).toHaveLength(4);
    expect(binaries).toContain("claude");
    expect(binaries).toContain("gemini");
    expect(binaries).toContain("codex");
    expect(binaries).toContain("cursor-agent");
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
    const ids: CliId[] = ["claude", "gemini", "codex", "cursor-agent"];
    expect(ids).toHaveLength(4);
  });

  it("SessionType extends CliId with terminal", () => {
    const sessionTypes: SessionType[] = [
      "claude",
      "gemini",
      "codex",
      "cursor-agent",
      "terminal",
    ];
    expect(sessionTypes).toHaveLength(5);
  });
});
