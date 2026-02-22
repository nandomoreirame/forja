import { describe, it, expect } from "vitest";
import { flattenFileTree } from "../flatten-file-tree";
import type { FileNode } from "@/stores/file-tree";

describe("flattenFileTree", () => {
  it("returns empty array for empty tree", () => {
    const root: FileNode = {
      name: "project",
      path: "/home/user/project",
      isDir: true,
      children: [],
    };

    const result = flattenFileTree(root, "/home/user/project");
    expect(result).toEqual([]);
  });

  it("returns single file at root level", () => {
    const root: FileNode = {
      name: "project",
      path: "/home/user/project",
      isDir: true,
      children: [
        {
          name: "README.md",
          path: "/home/user/project/README.md",
          isDir: false,
          extension: "md",
        },
      ],
    };

    const result = flattenFileTree(root, "/home/user/project");
    expect(result).toEqual([
      {
        name: "README.md",
        path: "/home/user/project/README.md",
        relativePath: "README.md",
        extension: "md",
      },
    ]);
  });

  it("returns nested files with correct relativePath", () => {
    const root: FileNode = {
      name: "project",
      path: "/home/user/project",
      isDir: true,
      children: [
        {
          name: "src",
          path: "/home/user/project/src",
          isDir: true,
          children: [
            {
              name: "index.ts",
              path: "/home/user/project/src/index.ts",
              isDir: false,
              extension: "ts",
            },
          ],
        },
      ],
    };

    const result = flattenFileTree(root, "/home/user/project");
    expect(result).toEqual([
      {
        name: "index.ts",
        path: "/home/user/project/src/index.ts",
        relativePath: "src/index.ts",
        extension: "ts",
      },
    ]);
  });

  it("excludes directories from results", () => {
    const root: FileNode = {
      name: "project",
      path: "/home/user/project",
      isDir: true,
      children: [
        {
          name: "src",
          path: "/home/user/project/src",
          isDir: true,
          children: [
            {
              name: "app.tsx",
              path: "/home/user/project/src/app.tsx",
              isDir: false,
              extension: "tsx",
            },
          ],
        },
        {
          name: "package.json",
          path: "/home/user/project/package.json",
          isDir: false,
          extension: "json",
        },
      ],
    };

    const result = flattenFileTree(root, "/home/user/project");
    const dirs = result.filter((f) => f.name === "src");
    expect(dirs).toHaveLength(0);
    expect(result).toHaveLength(2);
  });

  it("preserves extension field", () => {
    const root: FileNode = {
      name: "project",
      path: "/home/user/project",
      isDir: true,
      children: [
        {
          name: "file.ts",
          path: "/home/user/project/file.ts",
          isDir: false,
          extension: "ts",
        },
        {
          name: "Makefile",
          path: "/home/user/project/Makefile",
          isDir: false,
          extension: null,
        },
      ],
    };

    const result = flattenFileTree(root, "/home/user/project");
    expect(result[0].extension).toBe("ts");
    expect(result[1].extension).toBeNull();
  });

  it("handles deep nesting (3+ levels)", () => {
    const root: FileNode = {
      name: "project",
      path: "/home/user/project",
      isDir: true,
      children: [
        {
          name: "a",
          path: "/home/user/project/a",
          isDir: true,
          children: [
            {
              name: "b",
              path: "/home/user/project/a/b",
              isDir: true,
              children: [
                {
                  name: "c",
                  path: "/home/user/project/a/b/c",
                  isDir: true,
                  children: [
                    {
                      name: "deep.ts",
                      path: "/home/user/project/a/b/c/deep.ts",
                      isDir: false,
                      extension: "ts",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const result = flattenFileTree(root, "/home/user/project");
    expect(result).toEqual([
      {
        name: "deep.ts",
        path: "/home/user/project/a/b/c/deep.ts",
        relativePath: "a/b/c/deep.ts",
        extension: "ts",
      },
    ]);
  });

  it("strips root path with trailing slash", () => {
    const root: FileNode = {
      name: "project",
      path: "/home/user/project",
      isDir: true,
      children: [
        {
          name: "file.ts",
          path: "/home/user/project/file.ts",
          isDir: false,
          extension: "ts",
        },
      ],
    };

    const result = flattenFileTree(root, "/home/user/project/");
    expect(result[0].relativePath).toBe("file.ts");
  });
});
