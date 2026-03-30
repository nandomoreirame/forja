import { describe, it, expect } from "vitest";
import { parseAiOutput } from "../ai-output-parser";

describe("parseAiOutput", () => {
  // ── 1. Terminal session: unchanged ──────────────────────────────────────────

  it("returns terminal session input unchanged with hadChrome=false", () => {
    const text = "total 8\ndrwxr-xr-x  2 user user 4096 Jan  1 00:00 .\n-rw-r--r--  1 user user  123 Jan  1 00:00 file.txt";
    const result = parseAiOutput(text, "terminal");
    expect(result.content).toBe(text);
    expect(result.hadChrome).toBe(false);
  });

  it("does not filter box drawing chars in terminal session", () => {
    const text = "╭──────────────╮\n│  some table  │\n╰──────────────╯";
    const result = parseAiOutput(text, "terminal");
    expect(result.content).toBe(text);
    expect(result.hadChrome).toBe(false);
  });

  // ── 2. Status bars: filtered ─────────────────────────────────────────────

  it("removes Ctx percentage status bar lines", () => {
    const text = [
      "Ctx 45%",
      "Here is the answer to your question.",
    ].join("\n");
    const result = parseAiOutput(text, "claude");
    expect(result.content).not.toContain("Ctx 45%");
    expect(result.content).toContain("Here is the answer");
    expect(result.hadChrome).toBe(true);
  });

  it("removes Ctx with block chars status bar line", () => {
    const text = [
      "Ctx ████ 12%",
      "The result is 42.",
    ].join("\n");
    const result = parseAiOutput(text, "claude");
    expect(result.content).not.toContain("Ctx");
    expect(result.content).toContain("The result is 42.");
    expect(result.hadChrome).toBe(true);
  });

  it("removes model + context info status lines", () => {
    const lines = [
      "Claude Sonnet 4.5 (200k context)",
      "claude-3-5-sonnet 1234 tokens",
      "Gemini 2.0 Flash 50k tokens",
    ];
    for (const line of lines) {
      const result = parseAiOutput(line, "claude");
      expect(result.content.trim()).toBe("");
      expect(result.hadChrome).toBe(true);
    }
  });

  it("removes token count lines", () => {
    const text = "1,234 tokens\nHere is my response.";
    const result = parseAiOutput(text, "claude");
    expect(result.content).not.toContain("tokens");
    expect(result.content).toContain("Here is my response.");
    expect(result.hadChrome).toBe(true);
  });

  it("removes version info lines (current/stable)", () => {
    const text = [
      "current: 1.2.3  stable: 1.2.1",
      "This is the actual output.",
    ].join("\n");
    const result = parseAiOutput(text, "claude");
    expect(result.content).not.toContain("current:");
    expect(result.content).toContain("This is the actual output.");
    expect(result.hadChrome).toBe(true);
  });

  it("removes (1M context) lines", () => {
    const text = [
      "claude-opus-4 (1M context)",
      "Your code looks great!",
    ].join("\n");
    const result = parseAiOutput(text, "claude");
    expect(result.content).not.toContain("context)");
    expect(result.content).toContain("Your code looks great!");
    expect(result.hadChrome).toBe(true);
  });

  // ── 3. Box drawing borders: removed ─────────────────────────────────────

  it("removes lines containing box drawing border characters", () => {
    const text = [
      "╭──────────────────────────────────╮",
      "│  Claude Code  v1.2.3             │",
      "╰──────────────────────────────────╯",
      "",
      "The file has been updated.",
    ].join("\n");
    const result = parseAiOutput(text, "claude");
    expect(result.content).not.toContain("╭");
    expect(result.content).not.toContain("╰");
    expect(result.content).not.toContain("│");
    expect(result.content).not.toContain("─");
    expect(result.content).toContain("The file has been updated.");
    expect(result.hadChrome).toBe(true);
  });

  it("removes lines with corner box drawing characters (┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼)", () => {
    const text = "┌─────┐\n│ hi  │\n└─────┘";
    const result = parseAiOutput(text, "claude");
    expect(result.content.trim()).toBe("");
    expect(result.hadChrome).toBe(true);
  });

  // ── 4. Permission bar: removed ───────────────────────────────────────────

  it("removes bypass permissions line", () => {
    const text = [
      "bypass permissions  shift+tab cycle auto-accept /effort",
      "I'll help you fix that bug.",
    ].join("\n");
    const result = parseAiOutput(text, "claude");
    expect(result.content).not.toContain("bypass");
    expect(result.content).toContain("I'll help you fix that bug.");
    expect(result.hadChrome).toBe(true);
  });

  it("removes shift+tab cycle line", () => {
    const text = [
      "shift+tab to cycle through modes",
      "Done!",
    ].join("\n");
    const result = parseAiOutput(text, "claude");
    expect(result.content).not.toContain("shift+tab");
    expect(result.content).toContain("Done!");
    expect(result.hadChrome).toBe(true);
  });

  it("removes auto-accept lines", () => {
    const text = "auto-accept edits enabled\nAll changes applied.";
    const result = parseAiOutput(text, "claude");
    expect(result.content).not.toContain("auto-accept");
    expect(result.content).toContain("All changes applied.");
    expect(result.hadChrome).toBe(true);
  });

  it("removes /effort lines", () => {
    const text = "/effort high\nWorking on it...";
    const result = parseAiOutput(text, "claude");
    expect(result.content).not.toContain("/effort");
    expect(result.content).toContain("Working on it...");
    expect(result.hadChrome).toBe(true);
  });

  // ── 5. Spinner-only lines: removed ──────────────────────────────────────

  it("removes lines that are only spinner characters", () => {
    const spinners = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏", "●", "◉", "○", "◌", "⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"];
    for (const spinner of spinners) {
      const result = parseAiOutput(spinner, "claude");
      expect(result.content.trim()).toBe("");
      expect(result.hadChrome).toBe(true);
    }
  });

  it("removes spinner lines mixed with whitespace", () => {
    const text = ["  ⠋  ", "Running analysis…"].join("\n");
    const result = parseAiOutput(text, "claude");
    expect(result.content).not.toContain("⠋");
    expect(result.content).toContain("Running analysis");
    expect(result.hadChrome).toBe(true);
  });

  // ── 6. Input prompt lines: removed ──────────────────────────────────────

  it("removes lines starting with ❯ (zsh prompt)", () => {
    const text = ["❯ some command", "The output was successful."].join("\n");
    const result = parseAiOutput(text, "claude");
    expect(result.content).not.toContain("❯");
    expect(result.content).toContain("The output was successful.");
    expect(result.hadChrome).toBe(true);
  });

  it("removes lines starting with > (shell prompt)", () => {
    const text = ["> ls -la", "total 8"].join("\n");
    const result = parseAiOutput(text, "claude");
    expect(result.content).not.toContain("> ls");
    expect(result.content).toContain("total 8");
    expect(result.hadChrome).toBe(true);
  });

  it("removes lines starting with $ (bash prompt)", () => {
    const text = ["$ echo hello", "hello"].join("\n");
    const result = parseAiOutput(text, "claude");
    expect(result.content).not.toContain("$ echo");
    expect(result.content).toContain("hello");
    expect(result.hadChrome).toBe(true);
  });

  // ── 7. Consecutive blank lines: collapsed ───────────────────────────────

  it("collapses 3+ consecutive blank lines into at most 2", () => {
    const text = "line 1\n\n\n\n\nline 2";
    const result = parseAiOutput(text, "claude");
    expect(result.content).toContain("line 1");
    expect(result.content).toContain("line 2");
    // Should have at most 2 consecutive blank lines
    expect(result.content).not.toMatch(/\n{4,}/);
    expect(result.hadChrome).toBe(true);
  });

  it("keeps up to 2 consecutive blank lines intact", () => {
    const text = "line 1\n\n\nline 2";
    const result = parseAiOutput(text, "claude");
    // 2 blank lines = allowed
    expect(result.content).toContain("line 1");
    expect(result.content).toContain("line 2");
  });

  // ── 8. Mixed content: keeps AI response, removes chrome ─────────────────

  it("handles a realistic Claude Code screen snapshot", () => {
    const screenText = [
      "╭──────────────────────────────────────────╮",
      "│ Claude Code  claude-sonnet-4 (200k ctx)  │",
      "╰──────────────────────────────────────────╯",
      "Ctx 23%  ● 1,450 tokens",
      "bypass permissions  shift+tab cycle  auto-accept  /effort",
      "",
      "❯ fix the login bug",
      "",
      "I'll look into the login bug for you.",
      "",
      "Here's what I found in `auth.ts`:",
      "  - The token expiry check was comparing the wrong timestamp",
      "  - Fixed by using `Date.now()` instead of `new Date()`",
      "",
      "The fix has been applied.",
      "",
      "⠋",
    ].join("\n");

    const result = parseAiOutput(screenText, "claude");

    // Chrome should be gone
    expect(result.content).not.toContain("╭");
    expect(result.content).not.toContain("Ctx 23%");
    expect(result.content).not.toContain("bypass");
    expect(result.content).not.toContain("❯");
    expect(result.content).not.toContain("⠋");

    // AI response content should remain
    expect(result.content).toContain("I'll look into the login bug for you.");
    expect(result.content).toContain("The token expiry check was comparing the wrong timestamp");
    expect(result.content).toContain("The fix has been applied.");

    expect(result.hadChrome).toBe(true);
  });

  // ── 9. Plain text with no chrome: returns as-is, hadChrome=false ────────

  it("returns plain text with no chrome unchanged", () => {
    const text = "Here is a simple response.\nIt spans two lines.";
    const result = parseAiOutput(text, "claude");
    expect(result.content).toBe(text);
    expect(result.hadChrome).toBe(false);
  });

  it("returns hadChrome=false when no chrome is present", () => {
    const text = "The answer is 42.";
    const result = parseAiOutput(text, "gemini");
    expect(result.hadChrome).toBe(false);
  });

  // ── 10. Empty input: returns empty ──────────────────────────────────────

  it("returns empty content for empty input in AI session", () => {
    const result = parseAiOutput("", "claude");
    expect(result.content).toBe("");
    expect(result.hadChrome).toBe(false);
  });

  it("returns empty content for whitespace-only input", () => {
    const result = parseAiOutput("   \n   \n   ", "claude");
    expect(result.content).toBe("");
    expect(result.hadChrome).toBe(true);
  });

  // ── 11. Model names in response content should NOT be removed ───────────

  it("does not remove lines mentioning a model name in conversational context", () => {
    const text = [
      "I'm using Claude to help you write better code.",
      "Gemini is another popular model from Google.",
      "GPT models are made by OpenAI.",
    ].join("\n");
    const result = parseAiOutput(text, "claude");
    expect(result.content).toContain("I'm using Claude");
    expect(result.content).toContain("Gemini is another popular model");
    expect(result.content).toContain("GPT models are made by OpenAI");
    expect(result.hadChrome).toBe(false);
  });

  it("removes a line with model name + technical version token but keeps conversational model mentions", () => {
    const text = [
      "claude-sonnet-4-5 1234 tokens",
      "I recommend using Claude for this task.",
    ].join("\n");
    const result = parseAiOutput(text, "claude");
    expect(result.content).not.toContain("1234 tokens");
    expect(result.content).toContain("I recommend using Claude for this task.");
    expect(result.hadChrome).toBe(true);
  });

  // ── Additional edge cases ─────────────────────────────────────────────────

  it("trims leading blank lines", () => {
    const text = "\n\nActual content here.";
    const result = parseAiOutput(text, "claude");
    expect(result.content).toBe("Actual content here.");
    expect(result.hadChrome).toBe(true);
  });

  it("trims trailing blank lines", () => {
    const text = "Actual content here.\n\n";
    const result = parseAiOutput(text, "claude");
    expect(result.content).toBe("Actual content here.");
    expect(result.hadChrome).toBe(true);
  });

  it("works with gemini sessionType the same as claude", () => {
    const text = ["⠸", "Here is the analysis."].join("\n");
    const result = parseAiOutput(text, "gemini");
    expect(result.content).toBe("Here is the analysis.");
    expect(result.hadChrome).toBe(true);
  });
});
