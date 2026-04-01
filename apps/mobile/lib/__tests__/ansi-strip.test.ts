import { describe, it, expect } from "vitest";
import { stripAnsi } from "../ansi-strip";

describe("stripAnsi", () => {
  it("removes standard SGR color codes", () => {
    expect(stripAnsi("\x1B[32mhello\x1B[0m")).toBe("hello");
  });

  it("removes cursor movement sequences", () => {
    expect(stripAnsi("\x1B[2Jhello\x1B[H")).toBe("hello");
  });

  it("removes OSC sequences", () => {
    expect(stripAnsi("\x1B]0;title\x07hello")).toBe("hello");
  });

  it("removes DEC Private Mode sequences like ?2026l/h (synchronized output)", () => {
    expect(stripAnsi("[?2026l[?2026h")).toBe("");
  });

  it("removes DEC Private Mode sequences with ESC prefix", () => {
    expect(stripAnsi("\x1B[?2026l\x1B[?2026h")).toBe("");
  });

  it("removes mixed DEC private mode and regular content", () => {
    const input = "\x1B[?2026l\x1B[?2026h\nhello world\n\x1B[?2026l";
    expect(stripAnsi(input)).toBe("\nhello world\n");
  });

  it("removes bracketed paste mode sequences (?2004h/l)", () => {
    expect(stripAnsi("\x1B[?2004h\x1B[?2004l")).toBe("");
  });

  it("removes DEC private mode set/reset with multiple params", () => {
    expect(stripAnsi("\x1B[?25l\x1B[?25h")).toBe(""); // cursor visibility
  });

  it("removes kitty keyboard protocol sequences", () => {
    expect(stripAnsi("\x1B[?1049h\x1B[?1049l")).toBe(""); // alternate screen
  });

  it("handles real-world Claude Code output with DEC sequences", () => {
    const input = "[?2026l[?2026h\n" +
      "ctrl+g to edi in ...\n" +
      "0 tokens\n" +
      "\x1B[?2026l\x1B[?2026h\n" +
      "current: 2.1.81 stable\n";
    const expected = "\n" +
      "ctrl+g to edi in ...\n" +
      "0 tokens\n" +
      "\n" +
      "current: 2.1.81 stable\n";
    expect(stripAnsi(input)).toBe(expected);
  });

  it("preserves plain text without escape sequences", () => {
    expect(stripAnsi("hello world")).toBe("hello world");
  });

  it("handles empty string", () => {
    expect(stripAnsi("")).toBe("");
  });
});
