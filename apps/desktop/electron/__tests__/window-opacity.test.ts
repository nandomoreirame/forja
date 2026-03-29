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

  it("getWindowTransparencyOptions returns transparent on non-Linux platforms", async () => {
    const { getWindowTransparencyOptions } = await import(
      "../window-opacity.js"
    );

    const opts = getWindowTransparencyOptions();
    // Test environment is node (not linux with tiling WM), so transparent is enabled
    expect(opts.transparent).toBe(true);
    expect(opts.backgroundColor).toBe("#00000000");
  });

  it("getWindowTransparencyOptions disables transparency on Hyprland", async () => {
    const originalPlatform = process.platform;
    const originalDesktop = process.env.XDG_CURRENT_DESKTOP;

    Object.defineProperty(process, "platform", { value: "linux", configurable: true });
    process.env.XDG_CURRENT_DESKTOP = "Hyprland";

    // Re-import to pick up env changes
    vi.resetModules();
    const { getWindowTransparencyOptions } = await import("../window-opacity.js");

    const opts = getWindowTransparencyOptions();
    expect(opts.transparent).toBeUndefined();
    expect(opts.backgroundColor).toBeUndefined();

    Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
    if (originalDesktop !== undefined) {
      process.env.XDG_CURRENT_DESKTOP = originalDesktop;
    } else {
      delete process.env.XDG_CURRENT_DESKTOP;
    }
  });

  it("getWindowTransparencyOptions disables transparency on Sway", async () => {
    const originalPlatform = process.platform;
    const originalDesktop = process.env.XDG_CURRENT_DESKTOP;

    Object.defineProperty(process, "platform", { value: "linux", configurable: true });
    process.env.XDG_CURRENT_DESKTOP = "sway";

    vi.resetModules();
    const { getWindowTransparencyOptions } = await import("../window-opacity.js");

    const opts = getWindowTransparencyOptions();
    expect(opts.transparent).toBeUndefined();

    Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
    if (originalDesktop !== undefined) {
      process.env.XDG_CURRENT_DESKTOP = originalDesktop;
    } else {
      delete process.env.XDG_CURRENT_DESKTOP;
    }
  });

  it("getWindowTransparencyOptions enables transparency on GNOME Wayland", async () => {
    const originalPlatform = process.platform;
    const originalDesktop = process.env.XDG_CURRENT_DESKTOP;

    Object.defineProperty(process, "platform", { value: "linux", configurable: true });
    process.env.XDG_CURRENT_DESKTOP = "GNOME";

    vi.resetModules();
    const { getWindowTransparencyOptions } = await import("../window-opacity.js");

    const opts = getWindowTransparencyOptions();
    expect(opts.transparent).toBe(true);
    expect(opts.backgroundColor).toBe("#00000000");

    Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
    if (originalDesktop !== undefined) {
      process.env.XDG_CURRENT_DESKTOP = originalDesktop;
    } else {
      delete process.env.XDG_CURRENT_DESKTOP;
    }
  });
});
