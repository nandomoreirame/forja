import { describe, it, expect } from "vitest";
import { stripAnsi } from "../strip-ansi";

describe("stripAnsi", () => {
  it("returns empty string for empty input", () => {
    expect(stripAnsi("")).toBe("");
  });

  it("returns plain text unchanged", () => {
    expect(stripAnsi("hello world")).toBe("hello world");
  });

  it("strips SGR color codes", () => {
    // Bold red text
    expect(stripAnsi("\x1b[1;31mError\x1b[0m")).toBe("Error");
  });

  it("strips multiple SGR sequences", () => {
    expect(stripAnsi("\x1b[32mgreen\x1b[0m and \x1b[34mblue\x1b[0m")).toBe(
      "green and blue"
    );
  });

  it("strips 256-color codes", () => {
    expect(stripAnsi("\x1b[38;5;196mred\x1b[0m")).toBe("red");
  });

  it("strips 24-bit true color codes", () => {
    expect(stripAnsi("\x1b[38;2;255;0;0mred\x1b[0m")).toBe("red");
  });

  it("strips cursor movement sequences", () => {
    // Cursor up, down, forward, back
    expect(stripAnsi("\x1b[2Ahello\x1b[3B")).toBe("hello");
    expect(stripAnsi("\x1b[5Cworld\x1b[1D")).toBe("world");
  });

  it("strips cursor position sequences", () => {
    expect(stripAnsi("\x1b[10;20Htext")).toBe("text");
    expect(stripAnsi("\x1b[10;20ftext")).toBe("text");
  });

  it("strips erase sequences", () => {
    // Erase in display, erase in line
    expect(stripAnsi("\x1b[2Jhello")).toBe("hello");
    expect(stripAnsi("\x1b[Kworld")).toBe("world");
  });

  it("strips scroll sequences", () => {
    expect(stripAnsi("\x1b[3Stext\x1b[2T")).toBe("text");
  });

  it("strips title-setting OSC sequences", () => {
    expect(stripAnsi("\x1b]0;window title\x07content")).toBe("content");
    expect(stripAnsi("\x1b]0;title\x1b\\content")).toBe("content");
  });

  it("strips hyperlink OSC sequences", () => {
    expect(
      stripAnsi("\x1b]8;;https://example.com\x07link text\x1b]8;;\x07")
    ).toBe("link text");
  });

  it("preserves newlines and carriage returns", () => {
    expect(stripAnsi("line1\nline2\nline3")).toBe("line1\nline2\nline3");
    expect(stripAnsi("line1\r\nline2\r\n")).toBe("line1\r\nline2\r\n");
  });

  it("strips DEC private mode sequences", () => {
    // Show/hide cursor
    expect(stripAnsi("\x1b[?25hvisible\x1b[?25l")).toBe("visible");
    // Alternate screen buffer
    expect(stripAnsi("\x1b[?1049hcontent\x1b[?1049l")).toBe("content");
  });

  it("handles mixed content correctly", () => {
    const input =
      "\x1b[1;34m## Hello World\x1b[0m\n\nSome \x1b[32mgreen\x1b[0m text.\n\n\x1b[33m```typescript\x1b[0m\nconst x = 1;\n\x1b[33m```\x1b[0m";
    const expected =
      "## Hello World\n\nSome green text.\n\n```typescript\nconst x = 1;\n```";
    expect(stripAnsi(input)).toBe(expected);
  });

  it("handles incomplete escape sequences gracefully", () => {
    // Incomplete CSI sequence at end
    expect(stripAnsi("text\x1b[")).toBe("text");
    // Lone ESC at end
    expect(stripAnsi("text\x1b")).toBe("text");
  });

  it("strips multiple escape sequences in a row", () => {
    expect(stripAnsi("\x1b[1m\x1b[31m\x1b[4mbold red underline\x1b[0m")).toBe(
      "bold red underline"
    );
  });
});
