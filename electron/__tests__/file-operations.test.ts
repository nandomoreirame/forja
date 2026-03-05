import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs/promises");

import { renameFileOrDir, deleteFileOrDir } from "../file-operations";
import * as fs from "fs/promises";

describe("renameFileOrDir", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renames a file within the project scope", async () => {
    vi.mocked(fs.rename).mockResolvedValue(undefined);

    await renameFileOrDir(
      "/home/user/project",
      "/home/user/project/src/old.ts",
      "/home/user/project/src/new.ts"
    );

    expect(fs.rename).toHaveBeenCalledWith(
      "/home/user/project/src/old.ts",
      "/home/user/project/src/new.ts"
    );
  });

  it("renames a directory within the project scope", async () => {
    vi.mocked(fs.rename).mockResolvedValue(undefined);

    await renameFileOrDir(
      "/home/user/project",
      "/home/user/project/src",
      "/home/user/project/lib"
    );

    expect(fs.rename).toHaveBeenCalledWith(
      "/home/user/project/src",
      "/home/user/project/lib"
    );
  });

  it("blocks rename of path outside project scope", async () => {
    await expect(
      renameFileOrDir(
        "/home/user/project",
        "/etc/passwd",
        "/home/user/project/passwd"
      )
    ).rejects.toThrow("Path traversal blocked");
  });

  it("blocks rename to path outside project scope", async () => {
    await expect(
      renameFileOrDir(
        "/home/user/project",
        "/home/user/project/file.ts",
        "/etc/file.ts"
      )
    ).rejects.toThrow("Path traversal blocked");
  });

  it("blocks traversal via ../", async () => {
    await expect(
      renameFileOrDir(
        "/home/user/project",
        "/home/user/project/../../../etc/passwd",
        "/home/user/project/safe.ts"
      )
    ).rejects.toThrow("Path traversal blocked");
  });

  it("blocks rename to system paths", async () => {
    await expect(
      renameFileOrDir(
        "/home/user/project",
        "/home/user/project/file.ts",
        "/usr/bin/evil"
      )
    ).rejects.toThrow("Path traversal blocked");
  });
});

describe("deleteFileOrDir", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes a file within the project scope", async () => {
    vi.mocked(fs.rm).mockResolvedValue(undefined);

    await deleteFileOrDir("/home/user/project", "/home/user/project/src/old.ts");

    expect(fs.rm).toHaveBeenCalledWith("/home/user/project/src/old.ts", {
      recursive: true,
      force: false,
    });
  });

  it("deletes a directory recursively within the project scope", async () => {
    vi.mocked(fs.rm).mockResolvedValue(undefined);

    await deleteFileOrDir("/home/user/project", "/home/user/project/src");

    expect(fs.rm).toHaveBeenCalledWith("/home/user/project/src", {
      recursive: true,
      force: false,
    });
  });

  it("blocks deletion of path outside project scope", async () => {
    await expect(
      deleteFileOrDir("/home/user/project", "/etc/passwd")
    ).rejects.toThrow("Path traversal blocked");
  });

  it("blocks deletion of project root itself", async () => {
    await expect(
      deleteFileOrDir("/home/user/project", "/home/user/project")
    ).rejects.toThrow("Cannot delete project root");
  });

  it("blocks traversal via ../", async () => {
    await expect(
      deleteFileOrDir("/home/user/project", "/home/user/project/../../etc/passwd")
    ).rejects.toThrow("Path traversal blocked");
  });

  it("blocks deletion of system paths", async () => {
    await expect(
      deleteFileOrDir("/home/user/project", "/usr/bin/evil")
    ).rejects.toThrow("Path traversal blocked");
  });
});
