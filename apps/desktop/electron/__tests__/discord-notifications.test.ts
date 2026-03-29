import { describe, it, expect } from "vitest";
import {
  stripAnsi,
  isNoiseLine,
  deduplicateTypingEcho,
  cleanPtyOutput,
  collapseBlankLines,
  extractTrailingQuestion,
  summarizeForDiscord,
} from "../discord-notifications.js";

describe("stripAnsi", () => {
  it("removes ANSI color codes", () => {
    expect(stripAnsi("\x1b[32mgreen\x1b[0m")).toBe("green");
  });

  it("removes OSC sequences", () => {
    expect(stripAnsi("\x1b]0;title\x07text")).toBe("text");
  });

  it("collapses multiple spaces", () => {
    expect(stripAnsi("hello    world")).toBe("hello world");
  });

  it("removes CSI private mode sequences like ?2026h/l", () => {
    expect(stripAnsi("\x1b[?2026lhello\x1b[?2026h")).toBe("hello");
  });

  it("removes cursor show/hide sequences", () => {
    expect(stripAnsi("\x1b[?25lhidden\x1b[?25h")).toBe("hidden");
  });

  it("removes DCS sequences", () => {
    expect(stripAnsi("\x1bP+q544e\x1b\\text")).toBe("text");
  });

  it("removes stray ESC bytes", () => {
    // Lone ESC at end of string
    expect(stripAnsi("hello\x1b")).toBe("hello");
    // ESC between words (ESC + next printable char treated as 2-byte escape)
    expect(stripAnsi("test\x1b7save")).toBe("testsave");
  });

  it("removes control characters except newlines", () => {
    expect(stripAnsi("hello\x00\x07\x0fworld")).toBe("helloworld");
    expect(stripAnsi("line1\nline2")).toBe("line1\nline2");
  });

  it("handles carriage returns from spinners", () => {
    expect(stripAnsi("Thinking...\rDone!")).toBe("Done!");
  });
});

describe("isNoiseLine", () => {
  it("filters box-drawing lines", () => {
    expect(isNoiseLine("───────────────────")).toBe(true);
    expect(isNoiseLine("━━━━━━━━━━━━━━━━━━━")).toBe(true);
  });

  it("filters very short fragments", () => {
    expect(isNoiseLine("sc")).toBe(true);
    expect(isNoiseLine("g")).toBe(true);
    expect(isNoiseLine("4")).toBe(true);
  });

  it("filters Claude Code status bar lines", () => {
    expect(isNoiseLine("[Opus 4.6 (1M context)] app git:(develop*) | Ctx 5% (46.1k)")).toBe(true);
    expect(isNoiseLine("[Opus4.6(1Mcontext)] bragstack.app git:(develop*)")).toBe(true);
    expect(isNoiseLine("[Sonnet 4.5] my-app git:(main) | Ctx 15%")).toBe(true);
  });

  it("filters Codex status bar lines", () => {
    expect(isNoiseLine("gpt-5.4 medium fast · 84% left · ~/dev/projects/bragstack.app")).toBe(true);
  });

  it("filters permission/mode lines", () => {
    expect(isNoiseLine("▸ ▸ bypass permissions on (shift+tab to cycle)")).toBe(true);
  });

  it("keeps meaningful content lines", () => {
    expect(isNoiseLine("I've updated the configuration file.")).toBe(false);
    expect(isNoiseLine("Created src/utils.ts with the helper function.")).toBe(false);
    expect(isNoiseLine("All tests passing. No regressions.")).toBe(false);
    expect(isNoiseLine("In this context, you should use a Map.")).toBe(false);
    expect(isNoiseLine("The token count is 500.")).toBe(false);
    expect(isNoiseLine("Gesticulating with excitement about the feature.")).toBe(false);
  });

  it("filters empty and whitespace lines", () => {
    expect(isNoiseLine("")).toBe(true);
    expect(isNoiseLine("   ")).toBe(true);
  });

  it("filters lines dominated by progress bar chars", () => {
    expect(isNoiseLine("████████████████████")).toBe(true);
    expect(isNoiseLine("██████░░░░░░░░░░░░░")).toBe(true);
  });
});

describe("deduplicateTypingEcho", () => {
  it("removes progressive prefix lines from typing echo", () => {
    const lines = ["me", "me e", "me ex", "me exp", "me expl", "me explique"];
    const result = deduplicateTypingEcho(lines);
    expect(result).toEqual(["me explique"]);
  });

  it("preserves non-echo lines", () => {
    const lines = ["Hello world.", "This is a response.", "Done."];
    const result = deduplicateTypingEcho(lines);
    expect(result).toEqual(["Hello world.", "This is a response.", "Done."]);
  });

  it("handles mixed echo and content", () => {
    const lines = ["me", "me explique", "Here is the answer.", "More details."];
    const result = deduplicateTypingEcho(lines);
    expect(result).toEqual(["me explique", "Here is the answer.", "More details."]);
  });
});

describe("cleanPtyOutput", () => {
  it("strips ANSI and filters noise in one pass", () => {
    const raw = [
      "\x1b[?2026l\x1b[32mHere is my response.\x1b[0m",
      "\x1b[?2026h",
      "Meaningful output here.",
      "───────────────────",
      "sc",
      "[Opus 4.6 (1M context)] app git:(main) | Ctx 5%",
    ].join("\n");
    const result = cleanPtyOutput(raw);
    expect(result).toContain("Here is my response.");
    expect(result).toContain("Meaningful output here.");
    expect(result).not.toContain("2026");
    expect(result).not.toContain("───");
    expect(result).not.toContain("[Opus");
  });

  it("preserves normal content with common words", () => {
    const raw = "In this context, the token count matters.\nThe current implementation is stable.";
    const result = cleanPtyOutput(raw);
    expect(result).toContain("context");
    expect(result).toContain("token");
    expect(result).toContain("stable");
  });
});

describe("collapseBlankLines", () => {
  it("collapses 3+ blank lines into 1", () => {
    expect(collapseBlankLines("a\n\n\n\nb")).toBe("a\n\nb");
  });

  it("preserves single blank lines", () => {
    expect(collapseBlankLines("a\n\nb")).toBe("a\n\nb");
  });
});

describe("extractTrailingQuestion", () => {
  it("extracts question from end of text", () => {
    const text = "Done editing files.\n\nShould I commit these changes?";
    expect(extractTrailingQuestion(text)).toBe("Should I commit these changes?");
  });

  it("returns empty string if no question", () => {
    expect(extractTrailingQuestion("All done.")).toBe("");
  });

  it("extracts multi-line question blocks", () => {
    const text = "Changes complete.\n\nWhich option do you prefer?\n- Option A\n- Option B";
    const result = extractTrailingQuestion(text);
    expect(result).toContain("Which option do you prefer?");
    expect(result).toContain("- Option A");
  });

  it("skips trailing blank lines", () => {
    const text = "Result ready.\n\nWant me to push?\n\n";
    expect(extractTrailingQuestion(text)).toBe("Want me to push?");
  });
});

describe("summarizeForDiscord", () => {
  it("returns short text as-is", () => {
    expect(summarizeForDiscord("Hello", 100)).toBe("Hello");
  });

  it("summarizes long text with head+tail", () => {
    const lines = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}: content here`);
    const text = lines.join("\n");
    const result = summarizeForDiscord(text, 300);
    expect(result.length).toBeLessThanOrEqual(350);
    expect(result).toContain("Line 1:");
    expect(result).toContain("Line 50:");
    expect(result).toContain("... conteúdo resumido ...");
  });

  it("highlights trailing question separately", () => {
    const lines = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}: content`);
    lines.push("", "Deseja que eu faca o commit?");
    const text = lines.join("\n");
    const result = summarizeForDiscord(text, 400);
    expect(result).toContain("> **Pergunta:**");
    expect(result).toContain("Deseja que eu faca o commit?");
  });

  it("does not duplicate question in body and block", () => {
    const lines = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}: content`);
    lines.push("", "Want to continue?");
    const text = lines.join("\n");
    const result = summarizeForDiscord(text, 400);
    const questionCount = (result.match(/Want to continue\?/g) || []).length;
    expect(questionCount).toBe(1);
  });
});
