import { hasPermission, getRequiredPermission } from "./plugin-permissions.js";
import type { PluginPermission } from "./types.js";

export interface BridgeCallResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function executeBridgeCall(
  pluginName: string,
  method: string,
  args: Record<string, unknown>,
  projectPath: string | null
): Promise<BridgeCallResult> {
  const requiredPermission = getRequiredPermission(method);

  if (!requiredPermission) {
    return { success: false, error: `Unknown method: "${method}"` };
  }

  if (!hasPermission(pluginName, requiredPermission)) {
    return {
      success: false,
      error: `Plugin "${pluginName}" lacks permission "${requiredPermission}" for method "${method}"`,
    };
  }

  try {
    const data = await executeMethod(method, args, projectPath);
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

async function executeMethod(
  method: string,
  args: Record<string, unknown>,
  projectPath: string | null
): Promise<unknown> {
  switch (method) {
    case "project.getActive": {
      if (!projectPath) return null;
      const path = await import("path");
      return { path: projectPath, name: path.default.basename(projectPath) };
    }

    case "git.status": {
      if (!projectPath) return null;
      const { getGitInfo } = await import("../git-info.js");
      return await getGitInfo(projectPath);
    }

    case "git.log": {
      if (!projectPath) return null;
      const { getGitLog } = await import("../git-info.js");
      const limit = typeof args.limit === "number" ? args.limit : 20;
      return await getGitLog(projectPath, { limit });
    }

    case "git.diff": {
      if (!projectPath) return null;
      const { getGitChangedFiles } = await import("../git-info.js");
      return await getGitChangedFiles(projectPath);
    }

    case "fs.readFile": {
      if (!projectPath) throw new Error("No active project");
      const filePath = args.path;
      if (typeof filePath !== "string") throw new Error("Invalid file path");
      const path = await import("path");
      const fullPath = path.default.resolve(projectPath, filePath);
      const { assertPathWithinScope } = await import("../path-validation.js");
      assertPathWithinScope(projectPath, filePath);
      const { readFile } = await import("../file-reader.js");
      const result = await readFile(fullPath);
      return result.content;
    }

    case "fs.writeFile": {
      if (!projectPath) throw new Error("No active project");
      const filePath = args.path;
      const content = args.content;
      if (typeof filePath !== "string") throw new Error("Invalid file path");
      if (typeof content !== "string") throw new Error("Invalid content");
      const path = await import("path");
      const fullPath = path.default.resolve(projectPath, filePath);
      const { assertPathWithinScope } = await import("../path-validation.js");
      assertPathWithinScope(projectPath, filePath);
      // Suppress file watcher for this path to avoid triggering files:changed
      const { suppressPath } = await import("../file-watcher.js");
      suppressPath(fullPath);
      const fs = await import("fs/promises");
      await fs.writeFile(fullPath, content, "utf-8");
      return { written: true };
    }

    case "terminal.getOutput": {
      // Return empty for now - will be connected to PTY manager
      return { output: "" };
    }

    case "terminal.execute": {
      // Restricted - return error for now
      throw new Error("terminal.execute is not yet implemented");
    }

    case "theme.getCurrent": {
      const { getCachedSettings } = await import("../user-settings.js");
      const settings = getCachedSettings();
      return { theme: settings.theme?.active ?? "catppuccin-mocha" };
    }

    case "notifications.show": {
      const { Notification } = await import("electron");
      const title = typeof args.title === "string" ? args.title : "Plugin Notification";
      const body = typeof args.body === "string" ? args.body : "";
      new Notification({ title, body }).show();
      return { shown: true };
    }

    default:
      throw new Error(`Unhandled method: "${method}"`);
  }
}
