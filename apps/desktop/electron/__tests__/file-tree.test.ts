import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execSync } from "child_process";
import { readDirectoryTree } from "../file-tree";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "forja-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("readDirectoryTree", () => {
  interface TestNode {
    name: string;
    ignored?: boolean;
    children?: TestNode[];
  }

  function findNodeByName(
    node: TestNode,
    name: string
  ): TestNode | null {
    if (node.name === name) return node;
    for (const child of node.children ?? []) {
      const match = findNodeByName(child, name);
      if (match) return match;
    }
    return null;
  }

  it("returns root node for a directory", async () => {
    const result = await readDirectoryTree(tmpDir);
    expect(result.root).toBeDefined();
    expect(result.root.isDir).toBe(true);
    expect(result.root.path).toBe(tmpDir);
  });

  it("lists files in a directory", async () => {
    fs.writeFileSync(path.join(tmpDir, "hello.ts"), "");
    fs.writeFileSync(path.join(tmpDir, "world.js"), "");

    const result = await readDirectoryTree(tmpDir);
    const names = result.root.children?.map((c) => c.name) ?? [];
    expect(names).toContain("hello.ts");
    expect(names).toContain("world.js");
  });

  it("skips node_modules directory", async () => {
    fs.mkdirSync(path.join(tmpDir, "node_modules"));
    fs.writeFileSync(path.join(tmpDir, "index.ts"), "");

    const result = await readDirectoryTree(tmpDir);
    const names = result.root.children?.map((c) => c.name) ?? [];
    expect(names).not.toContain("node_modules");
    expect(names).toContain("index.ts");
  });

  it("skips .git directory", async () => {
    fs.mkdirSync(path.join(tmpDir, ".git"));
    fs.writeFileSync(path.join(tmpDir, "README.md"), "");

    const result = await readDirectoryTree(tmpDir);
    const names = result.root.children?.map((c) => c.name) ?? [];
    expect(names).not.toContain(".git");
    expect(names).toContain("README.md");
  });

  it("sorts directories before files", async () => {
    fs.writeFileSync(path.join(tmpDir, "a-file.ts"), "");
    fs.mkdirSync(path.join(tmpDir, "b-dir"));

    const result = await readDirectoryTree(tmpDir);
    const children = result.root.children ?? [];
    expect(children[0].isDir).toBe(true);
    expect(children[0].name).toBe("b-dir");
    expect(children[1].isDir).toBe(false);
  });

  it("respects maxDepth", async () => {
    fs.mkdirSync(path.join(tmpDir, "level1"));
    fs.mkdirSync(path.join(tmpDir, "level1", "level2"));
    fs.writeFileSync(path.join(tmpDir, "level1", "level2", "deep.ts"), "");

    const result = await readDirectoryTree(tmpDir, 1);
    const level1 = result.root.children?.find((c) => c.name === "level1");
    expect(level1?.children).toHaveLength(0); // depth limit reached
  });

  it("returns extension for files", async () => {
    fs.writeFileSync(path.join(tmpDir, "script.ts"), "");

    const result = await readDirectoryTree(tmpDir);
    const file = result.root.children?.find((c) => c.name === "script.ts");
    expect(file?.extension).toBe("ts");
  });

  it("returns null extension for files without extension", async () => {
    fs.writeFileSync(path.join(tmpDir, "Makefile"), "");

    const result = await readDirectoryTree(tmpDir);
    const file = result.root.children?.find((c) => c.name === "Makefile");
    expect(file?.extension).toBeNull();
  });

  it("shows dot directories except .git and other SKIP_DIRS entries", async () => {
    fs.mkdirSync(path.join(tmpDir, ".claude"));
    fs.mkdirSync(path.join(tmpDir, ".github"));
    fs.mkdirSync(path.join(tmpDir, ".vscode"));
    fs.mkdirSync(path.join(tmpDir, ".forja"));
    fs.mkdirSync(path.join(tmpDir, ".git"));
    fs.mkdirSync(path.join(tmpDir, ".next"));
    fs.writeFileSync(path.join(tmpDir, "README.md"), "");

    const result = await readDirectoryTree(tmpDir);
    const names = result.root.children?.map((c) => c.name) ?? [];

    // dot directories should be visible
    expect(names).toContain(".claude");
    expect(names).toContain(".github");
    expect(names).toContain(".vscode");
    expect(names).toContain(".forja");

    // .git and .next are in SKIP_DIRS, should be hidden
    expect(names).not.toContain(".git");
    expect(names).not.toContain(".next");

    expect(names).toContain("README.md");
  });

  it("handles nonexistent directory gracefully", async () => {
    await expect(
      readDirectoryTree("/nonexistent/path/that/does/not/exist")
    ).rejects.toThrow();
  });

  it("marks files and directories ignored by .gitignore with ignored=true", async () => {
    execSync("git init", { cwd: tmpDir, stdio: "ignore" });
    fs.writeFileSync(path.join(tmpDir, ".gitignore"), "ignored-dir/\n*.log\n");
    fs.mkdirSync(path.join(tmpDir, "ignored-dir"));
    fs.writeFileSync(path.join(tmpDir, "ignored-dir", "inside.txt"), "ignored");
    fs.writeFileSync(path.join(tmpDir, "debug.log"), "ignored");
    fs.writeFileSync(path.join(tmpDir, "keep.ts"), "tracked");

    const result = await readDirectoryTree(tmpDir, 4);

    const ignoredDir = findNodeByName(result.root, "ignored-dir");
    const ignoredFile = findNodeByName(result.root, "inside.txt");
    const ignoredLog = findNodeByName(result.root, "debug.log");
    const keptFile = findNodeByName(result.root, "keep.ts");

    expect(ignoredDir).toBeTruthy();
    expect(ignoredFile).toBeTruthy();
    expect(ignoredLog).toBeTruthy();
    expect(keptFile).toBeTruthy();
    expect(ignoredDir?.ignored).toBe(true);
    expect(ignoredFile?.ignored).toBe(true);
    expect(ignoredLog?.ignored).toBe(true);
    expect(keptFile?.ignored).toBe(false);
  });
});
