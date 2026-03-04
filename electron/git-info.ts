import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";

const execAsync = promisify(exec);

export interface GitInfo {
  branch: string;
  modified_count: number;
}

export async function getGitInfo(projectPath: string): Promise<GitInfo> {
  try {
    const { stdout } = await execAsync(
      "git status --porcelain --branch",
      { cwd: projectPath, timeout: 5000 }
    );

    const lines = stdout.split("\n");
    const branchLine = lines[0] ?? "";

    let branch = "unknown";
    const branchMatch = branchLine.match(/^## (.+?)(?:\.\.\.|$)/);
    if (branchMatch) {
      const raw = branchMatch[1];
      // "HEAD (no branch)" → "HEAD"
      branch = raw.startsWith("HEAD") ? "HEAD" : raw;
    }

    const modifiedCount = lines
      .slice(1)
      .filter((l) => l.trim().length > 0).length;

    return { branch, modified_count: modifiedCount };
  } catch {
    return { branch: "unknown", modified_count: 0 };
  }
}

export async function getGitFileStatuses(
  projectPath: string
): Promise<Record<string, string>> {
  try {
    const { stdout } = await execAsync("git status --porcelain", {
      cwd: projectPath,
      timeout: 5000,
    });

    const statuses: Record<string, string> = {};

    for (const line of stdout.split("\n")) {
      if (line.length < 4) continue;

      const code = line.substring(0, 2).trim();
      let filePart = line.substring(3);

      // Handle renames: "R  old -> new"
      const arrowIndex = filePart.indexOf(" -> ");
      if (arrowIndex !== -1) {
        filePart = filePart.substring(arrowIndex + 4);
      }

      // Handle quoted paths (e.g. for special characters)
      if (filePart.startsWith('"') && filePart.endsWith('"')) {
        filePart = filePart.slice(1, -1);
      }

      // Normalize to forward slashes and resolve relative paths
      const normalized = path.normalize(filePart).replace(/\\/g, "/");
      if (code && normalized) {
        statuses[normalized] = code;
      }
    }

    return statuses;
  } catch {
    return {};
  }
}
