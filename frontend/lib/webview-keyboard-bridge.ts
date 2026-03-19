/**
 * Keyboard shortcut classification for Electron webview keyboard bridging.
 *
 * Electron's <webview> captures all keyboard input in its own browser
 * context.  The actual forwarding is handled in the main process
 * (electron/webview-keyboard-bridge.ts) via webContents.on('before-input-event').
 * This module exports the classification function used by the frontend tests.
 */

/**
 * Keys that should stay in the webview when pressed with Ctrl/Cmd.
 * These are common text-editing shortcuts that users expect to work
 * inside web content (plugin pages, browser tabs).
 */
const WEBVIEW_ONLY_KEYS = new Set(["c", "v", "x", "a", "z", "y", "f"]);

interface KeyInput {
  key: string;
  control: boolean;
  meta: boolean;
  shift: boolean;
  alt: boolean;
}

/**
 * Returns true if the keyboard input should be forwarded from the webview
 * to the app's global keyboard handler (window).
 *
 * Logic: any Ctrl/Cmd combo is forwarded EXCEPT common text-editing
 * shortcuts (copy, paste, cut, select-all, undo, redo, find).
 * Adding Alt to a webview-only key overrides the retention (e.g.,
 * Ctrl+Alt+F is "focus mode", not "find").
 */
export function shouldForwardToApp(input: KeyInput): boolean {
  const mod = input.control || input.meta;
  if (!mod) return false;

  const keyLower = input.key.toLowerCase();

  // Let common text-editing shortcuts stay in webview
  // (but Ctrl+Alt combos are always app-level)
  if (WEBVIEW_ONLY_KEYS.has(keyLower) && !input.alt) return false;

  return true;
}
