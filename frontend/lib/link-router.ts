import { isLocalhostUrl } from "./localhost-detector";
import { useBrowserPaneStore } from "@/stores/browser-pane";

/**
 * Routes a link click: only localhost URLs are opened in the browser pane.
 * External URLs are ignored (no automatic browser opening).
 */
export function routeLinkClick(url: string): void {
  if (isLocalhostUrl(url)) {
    useBrowserPaneStore.getState().navigateToUrl(url);
  }
}
