import * as path from "path";
import * as os from "os";

/**
 * Returns true when running in development mode (pnpm dev / not packaged).
 * Uses the FORJA_DEV_MODE environment variable injected by the dev script.
 */
function isDevMode(): boolean {
  return process.env.FORJA_DEV_MODE === "1";
}

/**
 * Returns the root Forja configuration directory.
 * In dev mode the entire directory is isolated to avoid conflicts
 * with the installed (production) app.
 *
 * - Dev:  ~/.config/forja-dev  (or %APPDATA%/forja-dev on Windows)
 * - Prod: ~/.config/forja      (or %APPDATA%/forja on Windows)
 */
export function getForjaConfigDir(): string {
  const dirname = isDevMode() ? "forja-dev" : "forja";
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, dirname);
  }
  return path.join(os.homedir(), ".config", dirname);
}

/**
 * Returns the electron-store config file name.
 * Always "config" — dev/prod isolation is handled by the directory.
 */
export function getForjaConfigName(): string {
  return "config";
}

/**
 * Returns the path to the Forja user settings file.
 */
export function getForjaSettingsPath(): string {
  return path.join(getForjaConfigDir(), "settings.json");
}

/**
 * Returns the path to the Forja context hub directory.
 */
export function getForjaContextDir(): string {
  return path.join(getForjaConfigDir(), "context");
}

/**
 * Returns the path to the Forja plugins directory.
 */
export function getForjaPluginsDir(): string {
  return path.join(getForjaConfigDir(), "plugins");
}
