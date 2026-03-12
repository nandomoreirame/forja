/**
 * Plugin preload script for Electron webviews.
 *
 * This CJS module is loaded by Electron as the preload for plugin <webview>
 * elements. It delegates all logic to plugin-preload-impl.js (compiled from
 * plugin-preload-impl.ts) so the implementation can be unit-tested without
 * requiring Vite/Rollup to transform .cts files.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
require("./plugin-preload-impl.js");
