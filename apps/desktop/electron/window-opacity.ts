/**
 * Window opacity helpers.
 *
 * Background-only opacity: instead of BrowserWindow.setOpacity() which makes
 * the entire window transparent (including text), we use transparent BrowserWindow
 * + CSS background alpha via IPC to the renderer process.
 *
 * This approach keeps text fully readable while allowing the desktop to show
 * through background areas.
 */

interface OpacityWindow {
  webContents: { send: (channel: string, ...args: unknown[]) => void };
}

function clampOpacity(value: number): number {
  return Math.min(Math.max(value, 0.3), 1.0);
}

export function applyWindowOpacity(
  win: OpacityWindow,
  opacity: number,
): void {
  const clamped = clampOpacity(opacity);
  win.webContents.send("window:apply-opacity", clamped);
}

export function getWindowTransparencyOptions(): {
  transparent?: boolean;
  backgroundColor?: string;
} {
  // transparent: true + DMA zero-copy buffer sharing causes a pointer freeze
  // on Wayland tiling compositors (Hyprland, Sway, Niri, River).
  // The compositor deadlocks waiting for wl_buffer.release while Chromium waits
  // for the frame callback, blocking wl_pointer event dispatch.
  // Disable transparency on these WMs to avoid the issue.
  if (process.platform === "linux") {
    const desktop = (
      process.env.XDG_CURRENT_DESKTOP ||
      process.env.DESKTOP_SESSION ||
      process.env.XDG_SESSION_DESKTOP ||
      ""
    ).toLowerCase();
    const isTilingWm = ["hyprland", "sway", "niri", "i3", "river"].some(
      (wm) => desktop.includes(wm),
    );
    if (isTilingWm) return {};
  }
  return { transparent: true, backgroundColor: "#00000000" };
}
