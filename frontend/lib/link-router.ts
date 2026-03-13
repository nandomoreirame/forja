import { isLocalhostUrl } from "./localhost-detector";
import { useBrowserPaneStore } from "@/stores/browser-pane";
import { openUrl } from "@/lib/ipc";

/**
 * Routes a link click: localhost URLs open in the browser pane,
 * external http(s) URLs open in the system browser.
 */
export function routeLinkClick(url: string): void {
  if (isLocalhostUrl(url)) {
    useBrowserPaneStore.getState().navigateToUrl(url);
    return;
  }

  if (url.startsWith("https://") || url.startsWith("http://")) {
    openUrl(url);
  }
}
