import { describe, it, expect, vi } from "vitest";

/**
 * Tests for background-only window opacity.
 *
 * Instead of BrowserWindow.setOpacity() (which makes everything transparent),
 * we always send an IPC event so the renderer can apply alpha to CSS
 * background variables only, keeping text fully readable.
 */

describe("window opacity - background-only approach", () => {
  it("applyWindowOpacity sends IPC event with clamped opacity", async () => {
    const win = {
      webContents: { send: vi.fn() },
    };

    const { applyWindowOpacity } = await import("../window-opacity.js");
    applyWindowOpacity(win, 0.6);

    expect(win.webContents.send).toHaveBeenCalledWith(
      "window:apply-opacity",
      0.6,
    );
  });

  it("applyWindowOpacity clamps opacity between 0.3 and 1.0", async () => {
    const win = {
      webContents: { send: vi.fn() },
    };

    const { applyWindowOpacity } = await import("../window-opacity.js");

    applyWindowOpacity(win, 0.1);
    expect(win.webContents.send).toHaveBeenCalledWith(
      "window:apply-opacity",
      0.3,
    );

    win.webContents.send.mockClear();
    applyWindowOpacity(win, 1.5);
    expect(win.webContents.send).toHaveBeenCalledWith(
      "window:apply-opacity",
      1.0,
    );
  });

  it("getWindowTransparencyOptions returns transparent for all platforms", async () => {
    const { getWindowTransparencyOptions } = await import(
      "../window-opacity.js"
    );

    const opts = getWindowTransparencyOptions();
    expect(opts.transparent).toBe(true);
    expect(opts.backgroundColor).toBe("#00000000");
  });
});
