import { describe, it, expect, beforeEach } from "vitest";
import { OscParser } from "../osc-parser.js";

describe("OscParser", () => {
  let parser: OscParser;

  beforeEach(() => {
    parser = new OscParser();
  });

  it("extracts a single OSC 9 message terminated by BEL", () => {
    const data = "some output\x1b]9;1;Hello, world!\x07more output";
    const messages = parser.feed(data);
    expect(messages).toEqual(["Hello, world!"]);
  });

  it("extracts a single OSC 9 message terminated by ST (ESC \\)", () => {
    const data = "\x1b]9;1;Hello, world!\x1b\\rest";
    const messages = parser.feed(data);
    expect(messages).toEqual(["Hello, world!"]);
  });

  it("extracts multiple OSC 9 messages from one chunk", () => {
    const data = "\x1b]9;1;First\x07between\x1b]9;1;Second\x07end";
    const messages = parser.feed(data);
    expect(messages).toEqual(["First", "Second"]);
  });

  it("handles multiline markdown content", () => {
    const markdown = "# Hello\n\nThis is **bold** and `code`.\n\n```js\nconsole.log('hi');\n```";
    const data = `\x1b]9;1;${markdown}\x07`;
    const messages = parser.feed(data);
    expect(messages).toEqual([markdown]);
  });

  it("handles partial sequence split across two chunks", () => {
    // First chunk has the start but no terminator
    const msgs1 = parser.feed("\x1b]9;1;partial");
    expect(msgs1).toEqual([]);

    // Second chunk has the rest + terminator
    const msgs2 = parser.feed(" message\x07");
    expect(msgs2).toEqual(["partial message"]);
  });

  it("handles start marker split across chunks", () => {
    const msgs1 = parser.feed("output\x1b]9;");
    expect(msgs1).toEqual([]);

    const msgs2 = parser.feed("1;Complete message\x07");
    expect(msgs2).toEqual(["Complete message"]);
  });

  it("returns empty array when no OSC 9 present", () => {
    const messages = parser.feed("normal terminal output\r\nline two");
    expect(messages).toEqual([]);
  });

  it("ignores empty OSC 9 messages", () => {
    const data = "\x1b]9;1;\x07";
    const messages = parser.feed(data);
    expect(messages).toEqual([]);
  });

  it("handles long messages (up to 4000 chars)", () => {
    const longText = "A".repeat(4000);
    const data = `\x1b]9;1;${longText}\x07`;
    const messages = parser.feed(data);
    expect(messages).toEqual([longText]);
  });

  it("reset clears buffered partial state", () => {
    parser.feed("\x1b]9;1;incomplete");
    parser.reset();
    // After reset, the partial should be gone
    const msgs = parser.feed("\x07");
    expect(msgs).toEqual([]);
  });

  it("handles mixed OSC 9 and regular ANSI sequences", () => {
    const data = "\x1b[31mred text\x1b[0m\x1b]9;1;Clean message\x07\x1b[H\x1b[2J";
    const messages = parser.feed(data);
    expect(messages).toEqual(["Clean message"]);
  });

  it("handles OSC 9 with other OSC sequences nearby", () => {
    const data = "\x1b]0;window title\x07\x1b]9;1;AI response\x07\x1b]8;;http://example.com\x07link\x1b]8;;\x07";
    const messages = parser.feed(data);
    expect(messages).toEqual(["AI response"]);
  });
});
