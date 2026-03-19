/**
 * Bridge that intercepts app-level keyboard shortcuts from Electron
 * webview webContents in the main process and forwards them to the
 * parent renderer via IPC.
 *
 * Electron's <webview> creates an isolated browser context that captures
 * all keyboard input.  The renderer-side `before-input-event` on the
 * webview DOM element is NOT reliable in modern Electron (iframe-based
 * webviews).  The correct approach is to listen on the webview's
 * webContents in the main process via `app.on('web-contents-created')`.
 */

import type { WebContents, Input, Event as ElectronEvent } from "electron";

/**
 * Keys that should stay in the webview when pressed with Ctrl/Cmd.
 * Common text-editing shortcuts users expect inside web content.
 */
const WEBVIEW_ONLY_KEYS = new Set(["c", "v", "x", "a", "z", "y", "f"]);

export interface ShortcutPayload {
  key: string;
  code: string;
  control: boolean;
  meta: boolean;
  shift: boolean;
  alt: boolean;
}

export type ShortcutSender = (payload: ShortcutPayload) => void;

/**
 * Returns true if the keyboard input should be forwarded from the webview
 * to the app's global keyboard handler.
 *
 * Any Ctrl/Cmd combo is forwarded EXCEPT common text-editing shortcuts
 * (copy, paste, cut, select-all, undo, redo, find).
 * Adding Alt to a webview-only key overrides the retention.
 */
export function shouldForwardToApp(input: Pick<Input, "key" | "control" | "meta" | "shift" | "alt">): boolean {
  const mod = input.control || input.meta;
  if (!mod) return false;

  const keyLower = input.key.toLowerCase();
  if (WEBVIEW_ONLY_KEYS.has(keyLower) && !input.alt) return false;

  return true;
}

/**
 * Attaches a `before-input-event` listener to a webview's webContents
 * that intercepts app-level keyboard shortcuts and calls the provided
 * sender function so the parent window can dispatch them.
 */
export function attachWebviewKeyboardBridge(
  webviewContents: WebContents,
  sendShortcut: ShortcutSender,
): void {
  webviewContents.on("before-input-event", (event: ElectronEvent, input: Input) => {
    if (input.type !== "keyDown") return;
    if (!shouldForwardToApp(input)) return;

    event.preventDefault();

    sendShortcut({
      key: input.key,
      code: input.code,
      control: input.control,
      meta: input.meta,
      shift: input.shift,
      alt: input.alt,
    });
  });
}
