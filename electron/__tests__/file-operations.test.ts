import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs/promises");

import { renameFileOrDir, deleteFileOrDir, copyFileOrDir, moveFileOrDir, createFile, createDirectory } from "../file-operations";
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

describe("copyFileOrDir", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("copies a file to a target directory within the project scope", async () => {
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.cp).mockResolvedValue(undefined);

    const dest = await copyFileOrDir(
      "/home/user/project",
      "/home/user/project/src/file.ts",
      "/home/user/project/lib"
    );

    expect(fs.mkdir).toHaveBeenCalledWith("/home/user/project/lib", { recursive: true });
    expect(fs.cp).toHaveBeenCalledWith(
      "/home/user/project/src/file.ts",
      "/home/user/project/lib/file.ts",
      { recursive: true }
    );
    expect(dest).toBe("/home/user/project/lib/file.ts");
  });

  it("copies a directory recursively to a target directory", async () => {
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.cp).mockResolvedValue(undefined);

    const dest = await copyFileOrDir(
      "/home/user/project",
      "/home/user/project/src",
      "/home/user/project/backup"
    );

    expect(fs.cp).toHaveBeenCalledWith(
      "/home/user/project/src",
      "/home/user/project/backup/src",
      { recursive: true }
    );
    expect(dest).toBe("/home/user/project/backup/src");
  });

  it("blocks copy from path outside project scope", async () => {
    await expect(
      copyFileOrDir(
        "/home/user/project",
        "/etc/passwd",
        "/home/user/project/lib"
      )
    ).rejects.toThrow("Path traversal blocked");
  });

  it("blocks copy to target directory outside project scope", async () => {
    await expect(
      copyFileOrDir(
        "/home/user/project",
        "/home/user/project/file.ts",
        "/tmp/evil"
      )
    ).rejects.toThrow("Path traversal blocked");
  });

  it("blocks traversal via ../ in source", async () => {
    await expect(
      copyFileOrDir(
        "/home/user/project",
        "/home/user/project/../../../etc/passwd",
        "/home/user/project/lib"
      )
    ).rejects.toThrow("Path traversal blocked");
  });
});

describe("moveFileOrDir", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("moves a file to a target directory within the project scope", async () => {
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.rename).mockResolvedValue(undefined);

    const dest = await moveFileOrDir(
      "/home/user/project",
      "/home/user/project/src/file.ts",
      "/home/user/project/lib"
    );

    expect(fs.mkdir).toHaveBeenCalledWith("/home/user/project/lib", { recursive: true });
    expect(fs.rename).toHaveBeenCalledWith(
      "/home/user/project/src/file.ts",
      "/home/user/project/lib/file.ts"
    );
    expect(dest).toBe("/home/user/project/lib/file.ts");
  });

  it("calls rename so source no longer exists after move", async () => {
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.rename).mockResolvedValue(undefined);

    await moveFileOrDir(
      "/home/user/project",
      "/home/user/project/src/old.ts",
      "/home/user/project/dist"
    );

    // fs.rename is called (which atomically moves the file, removing source)
    expect(fs.rename).toHaveBeenCalledWith(
      "/home/user/project/src/old.ts",
      "/home/user/project/dist/old.ts"
    );
    // cp is NOT called (this is a move, not copy)
    expect(fs.cp).not.toHaveBeenCalled();
  });

  it("blocks move from path outside project scope", async () => {
    await expect(
      moveFileOrDir(
        "/home/user/project",
        "/etc/passwd",
        "/home/user/project/lib"
      )
    ).rejects.toThrow("Path traversal blocked");
  });

  it("blocks move to target directory outside project scope", async () => {
    await expect(
      moveFileOrDir(
        "/home/user/project",
        "/home/user/project/file.ts",
        "/tmp/evil"
      )
    ).rejects.toThrow("Path traversal blocked");
  });
});

describe("createFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an empty file within the project scope", async () => {
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);

    await createFile("/home/user/project", "/home/user/project/src/new.ts");

    expect(fs.writeFile).toHaveBeenCalledWith(
      "/home/user/project/src/new.ts",
      "",
      "utf-8"
    );
  });

  it("blocks creation of file outside project scope", async () => {
    await expect(
      createFile("/home/user/project", "/etc/evil.ts")
    ).rejects.toThrow("Path traversal blocked");
  });

  it("blocks traversal via ../ in file path", async () => {
    await expect(
      createFile("/home/user/project", "/home/user/project/../../etc/evil.ts")
    ).rejects.toThrow("Path traversal blocked");
  });

  it("blocks creation of file in system paths", async () => {
    await expect(
      createFile("/home/user/project", "/usr/bin/evil")
    ).rejects.toThrow("Path traversal blocked");
  });
});

describe("createDirectory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new directory within the project scope", async () => {
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);

    await createDirectory("/home/user/project", "/home/user/project/src/components");

    expect(fs.mkdir).toHaveBeenCalledWith(
      "/home/user/project/src/components",
      { recursive: true }
    );
  });

  it("blocks creation of directory outside project scope", async () => {
    await expect(
      createDirectory("/home/user/project", "/tmp/evil-dir")
    ).rejects.toThrow("Path traversal blocked");
  });

  it("blocks traversal via ../ in directory path", async () => {
    await expect(
      createDirectory("/home/user/project", "/home/user/project/../../etc/evil")
    ).rejects.toThrow("Path traversal blocked");
  });
});

describe("Windows forbidden prefixes", () => {
  it("should export getForbiddenPrefixes with Windows paths on win32", async () => {
    vi.resetModules();
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "win32" });
    try {
      const mod = await import("../file-operations");
      const prefixes = mod.getForbiddenPrefixes();
      expect(prefixes).toContain("C:\\Windows");
      expect(prefixes).toContain("C:\\Program Files");
      expect(prefixes).toContain("C:\\Program Files (x86)");
    } finally {
      Object.defineProperty(process, "platform", { value: originalPlatform });
    }
  });

  it("should export getForbiddenPrefixes with Unix paths on linux", async () => {
    vi.resetModules();
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "linux" });
    try {
      const mod = await import("../file-operations");
      const prefixes = mod.getForbiddenPrefixes();
      expect(prefixes).toContain("/etc");
      expect(prefixes).toContain("/usr");
      expect(prefixes).not.toContain("C:\\Windows");
    } finally {
      Object.defineProperty(process, "platform", { value: originalPlatform });
    }
  });
});
