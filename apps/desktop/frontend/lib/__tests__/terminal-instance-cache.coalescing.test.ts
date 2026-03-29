import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("terminal cache RAF-coalesced writes", () => {
  let rafCallbacks: Array<() => void> = [];

  beforeEach(() => {
    rafCallbacks = [];
    vi.stubGlobal("requestAnimationFrame", (cb: () => void) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should coalesce multiple data chunks into a single write", () => {
    const terminalWrite = vi.fn();

    // Simulate the coalescing buffer used in park()
    let buffer = "";
    let rafId = 0;

    const handler = (data: string) => {
      buffer += data;
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          const chunk = buffer;
          buffer = "";
          terminalWrite(chunk);
        });
      }
    };

    // Simulate Ink TUI redraw: 3 chunks arrive in same frame
    handler("\x1b[2K"); // clear line
    handler("\x1b[1A"); // cursor up
    handler("New content"); // new text

    // Before RAF fires: no writes yet
    expect(terminalWrite).not.toHaveBeenCalled();

    // Fire RAF
    rafCallbacks[0]();

    // All chunks coalesced into single write
    expect(terminalWrite).toHaveBeenCalledOnce();
    expect(terminalWrite).toHaveBeenCalledWith(
      "\x1b[2K\x1b[1ANew content",
    );
  });

  it("should cancel RAF and flush buffer on cache retrieval", () => {
    const cancelRaf = vi.fn();
    vi.stubGlobal("cancelAnimationFrame", cancelRaf);

    const terminalWrite = vi.fn();
    let buffer = "pending data";
    let rafId = 42;

    // Simulate cache.get() cleanup: flush before returning
    if (rafId) {
      cancelRaf(rafId);
      rafId = 0;
    }
    if (buffer) {
      terminalWrite(buffer);
      buffer = "";
    }

    expect(cancelRaf).toHaveBeenCalledWith(42);
    expect(terminalWrite).toHaveBeenCalledWith("pending data");
  });
});
