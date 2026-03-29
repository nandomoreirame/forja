import { isLocalhostUrl } from "./localhost-detector";
import { useTilingLayoutStore } from "@/stores/tiling-layout";
import { openUrl } from "@/lib/ipc";

/**
 * Routes a link click: localhost URLs open in a browser block,
 * external http(s) URLs open in the system browser.
 */
export function routeLinkClick(url: string): void {
  if (isLocalhostUrl(url)) {
    const tilingStore = useTilingLayoutStore.getState();
    const id = `browser-${Date.now().toString(36)}`;
    tilingStore.addBlock({ type: "browser", url }, undefined, id);
    return;
  }

  if (url.startsWith("https://") || url.startsWith("http://")) {
    openUrl(url);
  }
}
