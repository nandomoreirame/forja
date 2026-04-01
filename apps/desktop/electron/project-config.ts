import * as fs from "fs";
import * as path from "path";

const FORJA_DIR = ".forja";
const CONFIG_FILE = "config.json";
const SAVED_SESSIONS_MAX = 20;
const SAVED_SESSIONS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface SavedSessionEntry {
  id: string;
  sessionType: string;
  customName?: string;
  cliSessionId?: string;
  savedAt: string;
}

export interface ForjaProjectConfig {
  name?: string;
  icon_path?: string | null;
  last_opened?: string;
  savedSessions?: SavedSessionEntry[];
  ui?: {
    sidebarOpen?: boolean;
    sidebarSize?: number;
    rightPanelWidth?: number;
    terminalSplitEnabled?: boolean;
    terminalSplitOrientation?: "horizontal" | "vertical";
    terminalSplitRatio?: number;
    previewFile?: string | null;
    previewSize?: number;
    layoutJson?: Record<string, unknown>;
    tabs?: Array<{ id?: string; sessionType: string; cliSessionId?: string; customName?: string }>;
    activeTabIndex?: number;
    rightPanelActiveView?: string;
    activePluginName?: string | null;
  };
}

export function getForjaConfigPath(projectPath: string): string {
  return path.join(projectPath, FORJA_DIR, CONFIG_FILE);
}

export function readProjectConfig(
  projectPath: string,
): ForjaProjectConfig | null {
  try {
    const configPath = getForjaConfigPath(projectPath);
    const content = fs.readFileSync(configPath, "utf-8");
    if (!content.trim()) return null;
    return JSON.parse(content) as ForjaProjectConfig;
  } catch {
    return null;
  }
}

export function writeProjectConfig(
  projectPath: string,
  config: ForjaProjectConfig,
): void {
  const forjaDir = path.join(projectPath, FORJA_DIR);
  fs.mkdirSync(forjaDir, { recursive: true });

  const configPath = path.join(forjaDir, CONFIG_FILE);
  const tmpPath = configPath + ".tmp";
  const json = JSON.stringify(config, null, 2) + "\n";

  fs.writeFileSync(tmpPath, json, "utf-8");
  fs.renameSync(tmpPath, configPath);

  ensureGitignore(projectPath);
}

export function patchProjectConfig(
  projectPath: string,
  patch: Partial<ForjaProjectConfig>,
): void {
  const existing = readProjectConfig(projectPath) ?? {};
  const merged: ForjaProjectConfig = { ...existing, ...patch };

  // Deep merge ui
  if (patch.ui && existing.ui) {
    merged.ui = { ...existing.ui, ...patch.ui };
  }

  writeProjectConfig(projectPath, merged);
}

export function patchProjectUi(
  projectPath: string,
  uiPatch: NonNullable<ForjaProjectConfig["ui"]>,
): void {
  const existing = readProjectConfig(projectPath) ?? {};
  const currentUi = existing.ui ?? {};
  const mergedUi = { ...currentUi, ...uiPatch };

  writeProjectConfig(projectPath, { ...existing, ui: mergedUi });
}

export function clearProjectUi(projectPath: string): void {
  const existing = readProjectConfig(projectPath);
  if (!existing || !existing.ui) return;
  const { ui: _removed, ...rest } = existing;
  writeProjectConfig(projectPath, rest);
}

export function readSavedSessions(projectPath: string): SavedSessionEntry[] {
  const existing = readProjectConfig(projectPath);
  if (!existing?.savedSessions?.length) return [];

  const savedSessions = pruneExpiredSavedSessions(existing.savedSessions);
  if (savedSessions.length !== existing.savedSessions.length) {
    writeProjectConfig(projectPath, {
      ...existing,
      savedSessions,
    });
  }

  return savedSessions;
}

export function addSavedSession(
  projectPath: string,
  entry: SavedSessionEntry,
): void {
  const existing = readProjectConfig(projectPath) ?? {};
  const activeSessions = pruneExpiredSavedSessions(existing.savedSessions ?? []);
  const boundedSessions = activeSessions.slice(-(SAVED_SESSIONS_MAX - 1));

  writeProjectConfig(projectPath, {
    ...existing,
    savedSessions: [...boundedSessions, entry],
  });
}

export function removeSavedSession(projectPath: string, id: string): void {
  const existing = readProjectConfig(projectPath);
  if (!existing?.savedSessions?.length) return;

  const savedSessions = existing.savedSessions.filter((entry) => entry.id !== id);
  writeProjectConfig(projectPath, {
    ...existing,
    savedSessions,
  });
}

export function ensureGitignore(projectPath: string): void {
  const gitDir = path.join(projectPath, ".git");
  const gitignorePath = path.join(projectPath, ".gitignore");
  const entry = ".forja/";

  try {
    // Only append to an existing .gitignore inside a git repository.
    // Never create .gitignore from scratch to avoid polluting non-git dirs.
    if (!fs.existsSync(gitDir) || !fs.existsSync(gitignorePath)) return;

    const content = fs.readFileSync(gitignorePath, "utf-8");
    const lines = content.split("\n").map((l) => l.trim());
    if (lines.includes(entry)) return;

    const separator = content.endsWith("\n") ? "" : "\n";
    fs.writeFileSync(gitignorePath, content + separator + entry + "\n");
  } catch {
    // Non-fatal: gitignore update failure
  }
}

function pruneExpiredSavedSessions(
  entries: SavedSessionEntry[],
): SavedSessionEntry[] {
  const now = Date.now();
  return entries.filter((entry) => {
    const savedAt = Date.parse(entry.savedAt);
    if (Number.isNaN(savedAt)) return false;
    return now - savedAt <= SAVED_SESSIONS_TTL_MS;
  });
}
