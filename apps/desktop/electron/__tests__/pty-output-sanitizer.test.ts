import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PtyOutputSanitizer } from "../pty-output-sanitizer.js";

/**
 * Helper: write data and wait for the xterm parser to finish processing.
 * Uses the writeAsync method which leverages xterm's native write callback.
 */
function writeAndWait(sanitizer: PtyOutputSanitizer, tabId: string, data: string): Promise<void> {
  return sanitizer.writeAsync(tabId, data);
}

describe("PtyOutputSanitizer", () => {
  let sanitizer: PtyOutputSanitizer;

  beforeEach(() => {
    sanitizer = new PtyOutputSanitizer();
  });

  afterEach(() => {
    sanitizer.dispose();
  });

  describe("addSession / hasSession", () => {
    it("creates a terminal and hasSession returns true", () => {
      sanitizer.addSession("tab-1");
      expect(sanitizer.hasSession("tab-1")).toBe(true);
    });

    it("hasSession returns false for unknown session", () => {
      expect(sanitizer.hasSession("unknown")).toBe(false);
    });

    it("double-add disposes the old terminal and creates a fresh one", async () => {
      sanitizer.addSession("tab-1");
      await writeAndWait(sanitizer, "tab-1", "first");

      // Re-add: old terminal is disposed, new one starts clean
      sanitizer.addSession("tab-1");
      const text = sanitizer.getScreenText("tab-1");
      // Fresh terminal has no content
      expect(text).toBe("");
    });

    it("accepts custom cols and rows", () => {
      sanitizer.addSession("tab-2", 120, 40);
      expect(sanitizer.hasSession("tab-2")).toBe(true);
    });
  });

  describe("removeSession", () => {
    it("removes the session and hasSession returns false", () => {
      sanitizer.addSession("tab-1");
      sanitizer.removeSession("tab-1");
      expect(sanitizer.hasSession("tab-1")).toBe(false);
    });

    it("is a no-op for non-existent session", () => {
      expect(() => sanitizer.removeSession("nonexistent")).not.toThrow();
    });
  });

  describe("write / getScreenText", () => {
    it("returns null for a non-existent session", () => {
      expect(sanitizer.getScreenText("ghost")).toBeNull();
    });

    it("returns empty string for a fresh terminal with no writes", () => {
      sanitizer.addSession("tab-1");
      expect(sanitizer.getScreenText("tab-1")).toBe("");
    });

    it("write then getScreenText returns the written text", async () => {
      sanitizer.addSession("tab-1");
      await writeAndWait(sanitizer, "tab-1", "Hello, world!");
      const text = sanitizer.getScreenText("tab-1");
      expect(text).toContain("Hello, world!");
    });

    it("write is a no-op for non-existent session", () => {
      expect(() => sanitizer.write("ghost", "data")).not.toThrow();
    });
  });

  describe("ANSI color codes", () => {
    it("strips color codes — only plain text is returned", async () => {
      sanitizer.addSession("tab-1");
      // ESC[31m = red, ESC[0m = reset
      await writeAndWait(sanitizer, "tab-1", "\x1b[31mRed Text\x1b[0m");
      const text = sanitizer.getScreenText("tab-1");
      expect(text).toContain("Red Text");
      expect(text).not.toContain("\x1b");
      expect(text).not.toContain("[31m");
    });

    it("strips bold/underline sequences", async () => {
      sanitizer.addSession("tab-1");
      await writeAndWait(sanitizer, "tab-1", "\x1b[1mBold\x1b[0m and \x1b[4mUnderline\x1b[0m");
      const text = sanitizer.getScreenText("tab-1");
      expect(text).toContain("Bold");
      expect(text).toContain("Underline");
      expect(text).not.toContain("\x1b");
    });
  });

  describe("cursor movement sequences", () => {
    it("ESC[H ESC[2J (clear screen) — only new content appears after clear", async () => {
      sanitizer.addSession("tab-1");
      // Write initial content
      await writeAndWait(sanitizer, "tab-1", "Old content");
      // Clear screen: ESC[H (move cursor home) + ESC[2J (erase entire display)
      await writeAndWait(sanitizer, "tab-1", "\x1b[H\x1b[2J");
      // Write new content
      await writeAndWait(sanitizer, "tab-1", "New content");
      const text = sanitizer.getScreenText("tab-1");
      expect(text).toContain("New content");
      expect(text).not.toContain("Old content");
    });

    it("cursor movement to overwrite a line — only final text appears", async () => {
      sanitizer.addSession("tab-1");
      // Write first text on line 1
      await writeAndWait(sanitizer, "tab-1", "Loading...");
      // Carriage return to go to beginning of line, overwrite
      await writeAndWait(sanitizer, "tab-1", "\rDone!     ");
      const text = sanitizer.getScreenText("tab-1");
      // After overwrite, "Done!" should be present; "Loading" should be gone
      expect(text).toContain("Done!");
      expect(text).not.toContain("Loading...");
    });
  });

  describe("TUI simulation", () => {
    it("write text, cursor-home, overwrite — only new text appears", async () => {
      sanitizer.addSession("tab-1");
      await writeAndWait(sanitizer, "tab-1", "Status: thinking");
      // Simulate TUI framework re-drawing: ESC[H (cursor home) + overwrite
      await writeAndWait(sanitizer, "tab-1", "\x1b[HStatus: done    ");
      const text = sanitizer.getScreenText("tab-1");
      expect(text).toContain("Status: done");
      // "thinking" should be overwritten by spaces
      expect(text).not.toContain("thinking");
    });

    it("multiple rewrites — only the last screen state is returned", async () => {
      sanitizer.addSession("tab-1");
      const frames = [
        "Frame 1: initializing",
        "\x1b[HFrame 2: loading    ",
        "\x1b[HFrame 3: processing ",
        "\x1b[HFrame 4: complete   ",
      ];
      for (const frame of frames) {
        await writeAndWait(sanitizer, "tab-1", frame);
      }
      const text = sanitizer.getScreenText("tab-1");
      expect(text).toContain("Frame 4: complete");
      expect(text).not.toContain("Frame 1");
      expect(text).not.toContain("Frame 2");
      expect(text).not.toContain("Frame 3");
    });
  });

  describe("trailing whitespace and empty lines", () => {
    it("trims trailing whitespace from each line", async () => {
      sanitizer.addSession("tab-1");
      // The 80-col terminal pads with spaces; translateToString(true) trims right
      await writeAndWait(sanitizer, "tab-1", "Hello   ");
      const text = sanitizer.getScreenText("tab-1");
      const firstLine = text?.split("\n")[0] ?? "";
      expect(firstLine).toBe("Hello");
    });

    it("removes trailing empty lines from the output", async () => {
      sanitizer.addSession("tab-1");
      await writeAndWait(sanitizer, "tab-1", "Line one\nLine two");
      const text = sanitizer.getScreenText("tab-1");
      const lines = text?.split("\n") ?? [];
      // Should not have trailing empty lines
      expect(lines[lines.length - 1]).not.toBe("");
    });

    it("returns empty string when all lines are blank", () => {
      sanitizer.addSession("tab-1");
      const text = sanitizer.getScreenText("tab-1");
      expect(text).toBe("");
    });
  });

  describe("dispose", () => {
    it("cleans up all sessions", () => {
      sanitizer.addSession("tab-1");
      sanitizer.addSession("tab-2");
      sanitizer.addSession("tab-3");

      sanitizer.dispose();

      expect(sanitizer.hasSession("tab-1")).toBe(false);
      expect(sanitizer.hasSession("tab-2")).toBe(false);
      expect(sanitizer.hasSession("tab-3")).toBe(false);
    });

    it("is safe to call multiple times", () => {
      sanitizer.addSession("tab-1");
      expect(() => {
        sanitizer.dispose();
        sanitizer.dispose();
      }).not.toThrow();
    });

    it("getScreenText returns null after dispose", () => {
      sanitizer.addSession("tab-1");
      sanitizer.dispose();
      expect(sanitizer.getScreenText("tab-1")).toBeNull();
    });
  });
});
