import { readFile, writeFile, mkdir } from "fs/promises";
import * as path from "path";
import * as os from "os";
import chokidar from "chokidar";
import type { FSWatcher } from "chokidar";

// Inline settings types and helpers to avoid cross-rootDir import from frontend/
// These must stay in sync with frontend/lib/settings-types.ts

interface FontSettings {
  fontFamily: string;
  fontSize: number;
}

interface UserSettings {
  statusbar: { visible: boolean };
  app: FontSettings;
  editor: FontSettings;
  terminal: FontSettings;
  window: { zoomLevel: number; opacity: number };
  sessions: Record<string, { args?: string[]; env?: Record<string, string> }>;
}

const DEFAULT_SETTINGS: UserSettings = {
  statusbar: { visible: true },
  app: {
    fontFamily: "Geist Sans, Inter, system-ui, sans-serif",
    fontSize: 14,
  },
  editor: {
    fontFamily:
      "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
    fontSize: 13,
  },
  terminal: {
    fontFamily:
      "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
    fontSize: 14,
  },
  window: { zoomLevel: 0, opacity: 1.0 },
  sessions: {},
};

function clamp(value: number, min: number, max: number): number {
  if (isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function mergeWithDefaults(
  partial: Partial<UserSettings> | undefined | null,
): UserSettings {
  const input = partial ?? {};

  const editor = {
    ...DEFAULT_SETTINGS.editor,
    ...(input.editor ?? {}),
  };

  // Backward compat: if terminal section is absent but editor was explicitly
  // provided, use editor values for terminal (old format had only editor)
  const hasTerminal = input.terminal !== undefined;
  const hasEditor = input.editor !== undefined;
  const terminal = hasTerminal
    ? { ...DEFAULT_SETTINGS.terminal, ...(input.terminal ?? {}) }
    : hasEditor
      ? { ...DEFAULT_SETTINGS.terminal, ...editor }
      : { ...DEFAULT_SETTINGS.terminal };

  return {
    statusbar: {
      ...DEFAULT_SETTINGS.statusbar,
      ...(input.statusbar ?? {}),
    },
    app: {
      ...DEFAULT_SETTINGS.app,
      ...(input.app ?? {}),
    },
    editor,
    terminal,
    window: {
      ...DEFAULT_SETTINGS.window,
      ...(input.window ?? {}),
    },
    sessions: input.sessions ?? {},
  };
}

function validateSettings(settings: UserSettings): UserSettings {
  return {
    ...settings,
    app: {
      ...settings.app,
      fontSize: clamp(settings.app.fontSize, 8, 32),
    },
    editor: {
      ...settings.editor,
      fontSize: clamp(settings.editor.fontSize, 8, 32),
    },
    terminal: {
      ...settings.terminal,
      fontSize: clamp(settings.terminal.fontSize, 8, 32),
    },
    window: {
      ...settings.window,
      zoomLevel: clamp(settings.window.zoomLevel, -5, 5),
      opacity: clamp(settings.window.opacity, 0.3, 1.0),
    },
  };
}

let cachedSettings: UserSettings = { ...DEFAULT_SETTINGS };
let watcher: FSWatcher | null = null;

export function getUserSettingsPath(): string {
  return path.join(os.homedir(), ".config", "forja", "settings.json");
}

export async function loadUserSettings(): Promise<UserSettings> {
  const settingsPath = getUserSettingsPath();

  try {
    const raw = await readFile(settingsPath, "utf-8");
    const parsed = JSON.parse(raw);
    const merged = mergeWithDefaults(parsed);
    cachedSettings = validateSettings(merged);
    return cachedSettings;
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "ENOENT") {
      const dir = path.dirname(settingsPath);
      await mkdir(dir, { recursive: true });
      await writeFile(settingsPath, JSON.stringify(DEFAULT_SETTINGS, null, 2), "utf-8");
      cachedSettings = { ...DEFAULT_SETTINGS };
      return cachedSettings;
    }
    cachedSettings = { ...DEFAULT_SETTINGS };
    return cachedSettings;
  }
}

export function getCachedSettings(): UserSettings {
  return cachedSettings;
}

export async function saveUserSettings(content: string): Promise<UserSettings> {
  JSON.parse(content); // validate JSON, throws if invalid
  const settingsPath = getUserSettingsPath();
  const dir = path.dirname(settingsPath);
  await mkdir(dir, { recursive: true });
  await writeFile(settingsPath, content, "utf-8");
  return loadUserSettings();
}

export function startSettingsWatcher(
  getWebContents: () => Array<{ send: (channel: string, ...args: unknown[]) => void }>,
): void {
  stopSettingsWatcher();

  const settingsPath = getUserSettingsPath();
  watcher = chokidar.watch(settingsPath, {
    ignoreInitial: true,
    persistent: true,
  });

  watcher.on("change", async () => {
    const settings = await loadUserSettings();
    const targets = getWebContents();
    for (const wc of targets) {
      wc.send("settings:changed", settings);
    }
  });
}

export function stopSettingsWatcher(): void {
  if (watcher) {
    watcher.close().catch((err) => console.warn("[user-settings] Watcher close failed:", err));
    watcher = null;
  }
}
