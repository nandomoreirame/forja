import * as fs from "fs";
import * as path from "path";

const FORJA_DIR = ".forja";
const CONFIG_FILE = "config.json";

export interface ForjaProjectConfig {
  name?: string;
  icon_path?: string | null;
  last_opened?: string;
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
    tabs?: Array<{ id?: string; sessionType: string; cliSessionId?: string }>;
    activeTabIndex?: number;
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

export function ensureGitignore(projectPath: string): void {
  const gitignorePath = path.join(projectPath, ".gitignore");
  const entry = ".forja/";

  try {
    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, "utf-8");
      const lines = content.split("\n").map((l) => l.trim());
      if (lines.includes(entry)) return;

      const separator = content.endsWith("\n") ? "" : "\n";
      fs.writeFileSync(gitignorePath, content + separator + entry + "\n");
    } else {
      fs.writeFileSync(gitignorePath, entry + "\n");
    }
  } catch {
    // Non-fatal: gitignore update failure
  }
}
