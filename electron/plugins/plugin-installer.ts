import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { getForjaPluginsDir } from "../paths.js";
import type { RegistryPlugin, InstallProgress } from "./types.js";

const execFileAsync = promisify(execFile);

type ProgressCallback = (progress: InstallProgress) => void;

/**
 * Returns a map of installed plugin names to their versions.
 * Reads manifest.json from each subdirectory in the plugins dir.
 */
export async function getInstalledVersions(): Promise<Map<string, string>> {
  const pluginsDir = getForjaPluginsDir();
  await fs.mkdir(pluginsDir, { recursive: true });

  const versions = new Map<string, string>();
  const entries = await fs.readdir(pluginsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const manifestPath = path.join(pluginsDir, entry.name, "manifest.json");
      const raw = JSON.parse(await fs.readFile(manifestPath, "utf-8"));
      if (raw.name && raw.version) {
        versions.set(raw.name, raw.version);
      }
    } catch {
      // Skip invalid or missing manifests
    }
  }

  return versions;
}

/**
 * Downloads, verifies, and extracts a plugin from the registry.
 * Reports progress via the optional callback.
 */
export async function installPlugin(
  plugin: RegistryPlugin,
  onProgress?: ProgressCallback
): Promise<void> {
  const pluginsDir = getForjaPluginsDir();
  await fs.mkdir(pluginsDir, { recursive: true });

  const targetDir = path.join(pluginsDir, plugin.name);
  const tmpFile = path.join(pluginsDir, `${plugin.name}.tmp.tar.gz`);

  onProgress?.({ stage: "downloading", percent: 0 });

  // Download the tarball
  let buffer: ArrayBuffer;
  try {
    const response = await fetch(plugin.downloadUrl);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }
    buffer = await response.arrayBuffer();
    onProgress?.({ stage: "downloading", percent: 100 });
  } catch (error) {
    onProgress?.({ stage: "error", message: (error as Error).message });
    throw error;
  }

  // Verify SHA256 checksum (skip if empty — development builds)
  onProgress?.({ stage: "verifying" });
  if (plugin.sha256) {
    try {
      const actualHash = crypto
        .createHash("sha256")
        .update(Buffer.from(buffer))
        .digest("hex");

      if (actualHash !== plugin.sha256) {
        throw new Error(
          `Checksum mismatch: expected ${plugin.sha256}, got ${actualHash}`
        );
      }
    } catch (error) {
      onProgress?.({ stage: "error", message: (error as Error).message });
      throw error;
    }
  }

  // Extract tarball
  onProgress?.({ stage: "extracting" });
  try {
    await fs.writeFile(tmpFile, Buffer.from(buffer));

    // Remove existing plugin dir if present (upgrade scenario)
    await fs.rm(targetDir, { recursive: true, force: true });
    await fs.mkdir(targetDir, { recursive: true });

    await execFileAsync("tar", [
      "xzf",
      tmpFile,
      "-C",
      targetDir,
      "--strip-components=1",
    ]);

    // Cleanup temp file
    await fs.rm(tmpFile, { force: true });
  } catch (error) {
    onProgress?.({ stage: "error", message: (error as Error).message });
    // Best-effort cleanup on failure
    await fs.rm(tmpFile, { force: true }).catch(() => {});
    throw error;
  }

  onProgress?.({ stage: "done" });
}

/**
 * Removes an installed plugin by name.
 * Throws if the removal fails.
 */
export async function uninstallPlugin(name: string): Promise<void> {
  const pluginsDir = getForjaPluginsDir();
  const pluginDir = path.join(pluginsDir, name);
  await fs.rm(pluginDir, { recursive: true, force: true });
}
