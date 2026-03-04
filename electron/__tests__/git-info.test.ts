import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { getGitInfo } from "../git-info";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "forja-git-test-"));
  // Initialize a real git repo
  execSync("git init", { cwd: tmpDir });
  execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
  execSync("git config user.name 'Test User'", { cwd: tmpDir });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("getGitInfo", () => {
  it("returns branch name in a git repo", async () => {
    // Force branch name to avoid dependency on user's git init.defaultBranch
    execSync("git checkout -b test-branch 2>/dev/null || git checkout -B test-branch", { cwd: tmpDir });
    fs.writeFileSync(path.join(tmpDir, "README.md"), "# Test");
    execSync("git add .", { cwd: tmpDir });
    execSync("git commit -m 'init'", { cwd: tmpDir });

    const result = await getGitInfo(tmpDir);
    expect(result.branch).toBe("test-branch");
    expect(result.modified_count).toBe(0);
  });

  it("counts modified files", async () => {
    fs.writeFileSync(path.join(tmpDir, "README.md"), "# Test");
    execSync("git add .", { cwd: tmpDir });
    execSync("git commit -m 'init'", { cwd: tmpDir });

    // Modify a file
    fs.writeFileSync(path.join(tmpDir, "README.md"), "# Modified");

    const result = await getGitInfo(tmpDir);
    expect(result.modified_count).toBeGreaterThan(0);
  });

  it("counts untracked files", async () => {
    fs.writeFileSync(path.join(tmpDir, "README.md"), "# Test");
    execSync("git add .", { cwd: tmpDir });
    execSync("git commit -m 'init'", { cwd: tmpDir });

    // Add untracked file
    fs.writeFileSync(path.join(tmpDir, "new-file.ts"), "");

    const result = await getGitInfo(tmpDir);
    expect(result.modified_count).toBeGreaterThan(0);
  });

  it("returns unknown branch for non-git directory", async () => {
    const nonGitDir = fs.mkdtempSync(path.join(os.tmpdir(), "forja-nongit-"));
    try {
      const result = await getGitInfo(nonGitDir);
      expect(result.branch).toBe("unknown");
      expect(result.modified_count).toBe(0);
    } finally {
      fs.rmSync(nonGitDir, { recursive: true, force: true });
    }
  });
});
