import { useEffect, useRef } from "react";
import { listen } from "@/lib/ipc";
import { extractLocalhostUrl } from "@/lib/localhost-detector";
import { useBrowserPaneStore } from "@/stores/browser-pane";

/**
 * Listens for PTY data events and auto-opens the browser pane
 * when a localhost URL is detected in terminal output.
 *
 * Debounced to avoid repeated triggers from the same server startup.
 */
export function useBrowserAutoOpen() {
  const lastDetectedRef = useRef<string | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unlisten = listen<{ tab_id: string; data: string }>(
      "pty:data",
      (event) => {
        const data = event.payload?.data;
        if (!data) return;

        const url = extractLocalhostUrl(data);
        if (!url) return;

        // Debounce: skip if we just detected the same URL within 5 seconds
        if (lastDetectedRef.current === url) return;
        lastDetectedRef.current = url;

        // Clear cooldown after 5s so the same URL can trigger again later
        if (cooldownRef.current) clearTimeout(cooldownRef.current);
        cooldownRef.current = setTimeout(() => {
          lastDetectedRef.current = null;
        }, 5000);

        // Auto-navigate the browser pane
        useBrowserPaneStore.getState().navigateToUrl(url);
      },
    );

    return () => {
      unlisten.then((fn) => fn()).catch(() => {});
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, []);
}
