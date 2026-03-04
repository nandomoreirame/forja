import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { readDirectoryTree } from "../file-tree";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "forja-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("readDirectoryTree", () => {
  it("returns root node for a directory", () => {
    const result = readDirectoryTree(tmpDir);
    expect(result.root).toBeDefined();
    expect(result.root.isDir).toBe(true);
    expect(result.root.path).toBe(tmpDir);
  });

  it("lists files in a directory", () => {
    fs.writeFileSync(path.join(tmpDir, "hello.ts"), "");
    fs.writeFileSync(path.join(tmpDir, "world.js"), "");

    const result = readDirectoryTree(tmpDir);
    const names = result.root.children?.map((c) => c.name) ?? [];
    expect(names).toContain("hello.ts");
    expect(names).toContain("world.js");
  });

  it("skips node_modules directory", () => {
    fs.mkdirSync(path.join(tmpDir, "node_modules"));
    fs.writeFileSync(path.join(tmpDir, "index.ts"), "");

    const result = readDirectoryTree(tmpDir);
    const names = result.root.children?.map((c) => c.name) ?? [];
    expect(names).not.toContain("node_modules");
    expect(names).toContain("index.ts");
  });

  it("skips .git directory", () => {
    fs.mkdirSync(path.join(tmpDir, ".git"));
    fs.writeFileSync(path.join(tmpDir, "README.md"), "");

    const result = readDirectoryTree(tmpDir);
    const names = result.root.children?.map((c) => c.name) ?? [];
    expect(names).not.toContain(".git");
    expect(names).toContain("README.md");
  });

  it("sorts directories before files", () => {
    fs.writeFileSync(path.join(tmpDir, "a-file.ts"), "");
    fs.mkdirSync(path.join(tmpDir, "b-dir"));

    const result = readDirectoryTree(tmpDir);
    const children = result.root.children ?? [];
    expect(children[0].isDir).toBe(true);
    expect(children[0].name).toBe("b-dir");
    expect(children[1].isDir).toBe(false);
  });

  it("respects maxDepth", () => {
    fs.mkdirSync(path.join(tmpDir, "level1"));
    fs.mkdirSync(path.join(tmpDir, "level1", "level2"));
    fs.writeFileSync(path.join(tmpDir, "level1", "level2", "deep.ts"), "");

    const result = readDirectoryTree(tmpDir, 1);
    const level1 = result.root.children?.find((c) => c.name === "level1");
    expect(level1?.children).toHaveLength(0); // depth limit reached
  });

  it("returns extension for files", () => {
    fs.writeFileSync(path.join(tmpDir, "script.ts"), "");

    const result = readDirectoryTree(tmpDir);
    const file = result.root.children?.find((c) => c.name === "script.ts");
    expect(file?.extension).toBe("ts");
  });

  it("returns null extension for files without extension", () => {
    fs.writeFileSync(path.join(tmpDir, "Makefile"), "");

    const result = readDirectoryTree(tmpDir);
    const file = result.root.children?.find((c) => c.name === "Makefile");
    expect(file?.extension).toBeNull();
  });

  it("handles nonexistent directory gracefully", () => {
    expect(() =>
      readDirectoryTree("/nonexistent/path/that/does/not/exist")
    ).toThrow();
  });
});
