import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { getGitInfo, getGitChangedFiles, getGitFileDiff, getGitLog } from "../git-info";

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

describe("getGitChangedFiles", () => {
  it("lists changed files with status codes", async () => {
    fs.writeFileSync(path.join(tmpDir, "README.md"), "# Test");
    fs.writeFileSync(path.join(tmpDir, "delete-me.txt"), "to delete");
    execSync("git add .", { cwd: tmpDir });
    execSync("git commit -m 'init'", { cwd: tmpDir });

    fs.writeFileSync(path.join(tmpDir, "README.md"), "# Updated");
    fs.writeFileSync(path.join(tmpDir, "new-file.ts"), "export const v = 1;\n");
    fs.unlinkSync(path.join(tmpDir, "delete-me.txt"));

    const result = await getGitChangedFiles(tmpDir);

    const byPath = new Map(result.map((item) => [item.path, item.status]));
    expect(byPath.get("README.md")).toBe("M");
    expect(byPath.get("new-file.ts")).toBe("??");
    expect(byPath.get("delete-me.txt")).toBe("D");
  });

  it("returns empty list for non-git directory", async () => {
    const nonGitDir = fs.mkdtempSync(path.join(os.tmpdir(), "forja-nongit-"));
    try {
      const result = await getGitChangedFiles(nonGitDir);
      expect(result).toEqual([]);
    } finally {
      fs.rmSync(nonGitDir, { recursive: true, force: true });
    }
  });
});

describe("getGitFileDiff", () => {
  it("returns patch for modified file", async () => {
    fs.writeFileSync(path.join(tmpDir, "README.md"), "# Test\n");
    execSync("git add README.md", { cwd: tmpDir });
    execSync("git commit -m 'init'", { cwd: tmpDir });

    fs.writeFileSync(path.join(tmpDir, "README.md"), "# Test\n\nchanged line\n");

    const result = await getGitFileDiff(tmpDir, "README.md");
    expect(result.path).toBe("README.md");
    expect(result.status).toBe("M");
    expect(result.patch).toContain("@@");
    expect(result.patch).toContain("+changed line");
  });

  it("returns full-addition style diff for untracked file", async () => {
    fs.writeFileSync(path.join(tmpDir, "new-file.ts"), "console.log('x');\n");

    const result = await getGitFileDiff(tmpDir, "new-file.ts");
    expect(result.path).toBe("new-file.ts");
    expect(result.status).toBe("??");
    expect(result.patch).toContain("--- /dev/null");
    expect(result.patch).toContain("+++ b/new-file.ts");
    expect(result.patch).toContain("+console.log('x');");
  });

  it("returns deletion diff for removed file", async () => {
    fs.writeFileSync(path.join(tmpDir, "remove.ts"), "export const x = 1;\n");
    execSync("git add remove.ts", { cwd: tmpDir });
    execSync("git commit -m 'add remove file'", { cwd: tmpDir });
    fs.unlinkSync(path.join(tmpDir, "remove.ts"));

    const result = await getGitFileDiff(tmpDir, "remove.ts");
    expect(result.path).toBe("remove.ts");
    expect(result.status).toBe("D");
    expect(result.patch).toContain("--- a/remove.ts");
    expect(result.patch).toContain("+++ /dev/null");
  });
});

describe("getGitLog", () => {
  it("parses git log output into entries", async () => {
    fs.writeFileSync(path.join(tmpDir, "README.md"), "# Test\n");
    execSync("git add README.md", { cwd: tmpDir });
    execSync("git commit -m 'feat: initial commit'", { cwd: tmpDir });

    fs.writeFileSync(path.join(tmpDir, "file.ts"), "export const x = 1;\n");
    execSync("git add file.ts", { cwd: tmpDir });
    execSync("git commit -m 'feat: add file'", { cwd: tmpDir });

    const entries = await getGitLog(tmpDir);
    expect(entries.length).toBeGreaterThanOrEqual(2);
    expect(entries[0]).toMatchObject({
      hash: expect.stringMatching(/^[0-9a-f]{40}$/),
      message: "feat: add file",
      author: "Test User",
      date: expect.any(String),
    });
    expect(entries[1]).toMatchObject({
      hash: expect.stringMatching(/^[0-9a-f]{40}$/),
      message: "feat: initial commit",
      author: "Test User",
      date: expect.any(String),
    });
  });

  it("respects the limit option", async () => {
    for (let i = 1; i <= 5; i++) {
      fs.writeFileSync(path.join(tmpDir, `file${i}.ts`), `export const v${i} = ${i};\n`);
      execSync(`git add file${i}.ts`, { cwd: tmpDir });
      execSync(`git commit -m 'commit ${i}'`, { cwd: tmpDir });
    }

    const entries = await getGitLog(tmpDir, { limit: 3 });
    expect(entries).toHaveLength(3);
  });

  it("returns empty array for non-git directory", async () => {
    const nonGitDir = fs.mkdtempSync(path.join(os.tmpdir(), "forja-nongit-"));
    try {
      const entries = await getGitLog(nonGitDir);
      expect(entries).toEqual([]);
    } finally {
      fs.rmSync(nonGitDir, { recursive: true, force: true });
    }
  });

  it("returns empty array for repo with no commits", async () => {
    const entries = await getGitLog(tmpDir);
    expect(entries).toEqual([]);
  });

  it("defaults to 20 entries when no limit specified", async () => {
    for (let i = 1; i <= 25; i++) {
      fs.writeFileSync(path.join(tmpDir, `file${i}.ts`), `export const v${i} = ${i};\n`);
      execSync(`git add file${i}.ts`, { cwd: tmpDir });
      execSync(`git commit -m 'commit ${i}'`, { cwd: tmpDir });
    }

    const entries = await getGitLog(tmpDir);
    expect(entries).toHaveLength(20);
  });
});
