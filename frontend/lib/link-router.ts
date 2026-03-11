import { isLocalhostUrl } from "./localhost-detector";
import { useBrowserPaneStore } from "@/stores/browser-pane";
import { openUrl } from "./ipc";

/**
 * Routes a link click: localhost URLs open in the browser pane,
 * external URLs open in the system browser.
 */
export function routeLinkClick(url: string): void {
  if (isLocalhostUrl(url)) {
    useBrowserPaneStore.getState().navigateToUrl(url);
  } else {
    openUrl(url);
  }
}
