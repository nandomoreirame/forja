import { readFile } from "fs/promises";
import { readFileSync, existsSync } from "fs";
import * as path from "path";
import * as os from "os";

export type PerformanceMode = "auto" | "full" | "lite";

export interface LiteModeConfig {
  mode: PerformanceMode;
  resolved: "full" | "lite";
  metricsIntervalMs: number;
  fileWatcherDepth: number;
  disableGpuAcceleration: boolean;
  tabHibernation: boolean;
  tabHibernationTimeoutMs: number;
  v8SemiSpaceSize: number;
}

const RAM_THRESHOLD_BYTES = 12 * 1024 * 1024 * 1024;

const FULL_CONFIG: Omit<LiteModeConfig, "mode" | "resolved"> = {
  metricsIntervalMs: 2000,
  fileWatcherDepth: 3,
  disableGpuAcceleration: false,
  tabHibernation: false,
  tabHibernationTimeoutMs: 0,
  v8SemiSpaceSize: 64,
};

const LITE_CONFIG: Omit<LiteModeConfig, "mode" | "resolved"> = {
  metricsIntervalMs: 10000,
  fileWatcherDepth: 1,
  disableGpuAcceleration: true,
  tabHibernation: true,
  tabHibernationTimeoutMs: 60000,
  v8SemiSpaceSize: 32,
};

let cachedConfig: LiteModeConfig | null = null;

function getSettingsPath(): string {
  return path.join(os.homedir(), ".config", "forja", "settings.json");
}

function isLowResourceMachine(): boolean {
  return os.totalmem() < RAM_THRESHOLD_BYTES;
}

async function readSettingsMode(): Promise<PerformanceMode> {
  try {
    const settingsPath = getSettingsPath();
    const raw = await readFile(settingsPath, "utf-8");
    const parsed = JSON.parse(raw);
    const mode = parsed?.performance?.mode;
    if (mode === "full" || mode === "lite" || mode === "auto") {
      return mode;
    }
    return "auto";
  } catch {
    return "auto";
  }
}

export async function detectPerformanceMode(): Promise<"full" | "lite"> {
  const mode = await readSettingsMode();

  if (mode === "full") return "full";
  if (mode === "lite") return "lite";

  // mode is "auto" or missing — fall back to hardware detection
  const totalMem = os.totalmem();
  return totalMem < RAM_THRESHOLD_BYTES ? "lite" : "full";
}

export function getLiteModeConfig(resolved: "full" | "lite"): LiteModeConfig {
  const base = resolved === "full" ? FULL_CONFIG : LITE_CONFIG;
  return {
    mode: "auto",
    resolved,
    ...base,
  };
}

export async function initLiteMode(): Promise<LiteModeConfig> {
  const resolved = await detectPerformanceMode();
  cachedConfig = getLiteModeConfig(resolved);
  return cachedConfig;
}

export function getCachedLiteModeConfig(): LiteModeConfig | null {
  return cachedConfig;
}

export function readSettingsModeSync(): PerformanceMode {
  const settingsPath = path.join(
    os.homedir(),
    ".config",
    "forja",
    "settings.json",
  );
  try {
    if (!existsSync(settingsPath)) return "auto";
    const raw = readFileSync(settingsPath, "utf-8");
    const parsed = JSON.parse(raw);
    const mode = parsed?.performance?.mode;
    if (mode === "full" || mode === "lite" || mode === "auto") return mode;
    return "auto";
  } catch {
    return "auto";
  }
}

export function resolveModeSyncFromHardware(mode: PerformanceMode): "full" | "lite" {
  if (mode === "full") return "full";
  if (mode === "lite") return "lite";
  return isLowResourceMachine() ? "lite" : "full";
}
