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
  return { transparent: true, backgroundColor: "#00000000" };
}
