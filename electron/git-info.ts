import { exec } from "child_process";
import { promisify } from "util";

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
