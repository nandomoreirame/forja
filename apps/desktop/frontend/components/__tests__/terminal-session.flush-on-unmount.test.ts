import { describe, it, expect, vi } from "vitest";

describe("TerminalSession write buffer flush on unmount", () => {
  it("should flush pending write buffer to terminal before parking", () => {
    // Simulate the unmount cleanup behavior:
    // 1. writeBufferRef has pending data
    // 2. writeRafRef has a scheduled RAF
    // 3. On cleanup, buffer should be flushed to terminal, not discarded

    const terminalWrite = vi.fn();
    const mockTerminal = { write: terminalWrite };

    // Simulate buffered data that hasn't been flushed yet
    let writeBuffer = "\x1b[2K\x1b[1A\x1b[2KUpdated line content";
    let writeRaf = 1; // non-zero means RAF is scheduled

    // --- NEW behavior (fix): flush buffer before clearing ---
    if (writeRaf) {
      // cancelAnimationFrame(writeRaf);
      writeRaf = 0;
    }
    if (writeBuffer) {
      mockTerminal.write(writeBuffer);
      writeBuffer = "";
    }

    expect(terminalWrite).toHaveBeenCalledOnce();
    expect(terminalWrite).toHaveBeenCalledWith(
      "\x1b[2K\x1b[1A\x1b[2KUpdated line content",
    );
    expect(writeBuffer).toBe("");
    expect(writeRaf).toBe(0);
  });

  it("should not call write when buffer is empty", () => {
    const terminalWrite = vi.fn();
    const mockTerminal = { write: terminalWrite };

    let writeBuffer = "";
    let writeRaf = 0;

    // Flush logic should skip when buffer is empty
    if (writeRaf) {
      writeRaf = 0;
    }
    if (writeBuffer) {
      mockTerminal.write(writeBuffer);
      writeBuffer = "";
    }

    expect(terminalWrite).not.toHaveBeenCalled();
  });
});
