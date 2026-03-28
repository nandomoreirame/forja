/**
 * Hook that receives keyboard shortcuts forwarded from webview webContents
 * via the main process and re-dispatches them as KeyboardEvents on the
 * window so the global keyboard handler can process them.
 *
 * This is the renderer counterpart to `electron/webview-keyboard-bridge.ts`.
 */

import { useEffect } from "react";
import { listen } from "@/lib/ipc";

interface ShortcutPayload {
  key: string;
  code: string;
  control: boolean;
  meta: boolean;
  shift: boolean;
  alt: boolean;
}

export function useWebviewShortcutBridge(): void {
  useEffect(() => {
    let cleanup: (() => void) | null = null;

    listen<ShortcutPayload>("webview:shortcut-forwarded", (event) => {
      const { key, code, control, meta, shift, alt } = event.payload;
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key,
          code,
          ctrlKey: control,
          metaKey: meta,
          shiftKey: shift,
          altKey: alt,
          bubbles: true,
          cancelable: true,
        }),
      );
    }).then((fn) => {
      cleanup = fn;
    });

    return () => {
      cleanup?.();
    };
  }, []);
}
