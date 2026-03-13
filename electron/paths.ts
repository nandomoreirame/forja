import * as path from "path";
import * as os from "os";

/**
 * Returns the root Forja configuration directory.
 * - Windows: %APPDATA%/forja (typically C:\Users\<user>\AppData\Roaming\forja)
 * - macOS/Linux: ~/.config/forja
 */
export function getForjaConfigDir(): string {
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "forja");
  }
  return path.join(os.homedir(), ".config", "forja");
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
