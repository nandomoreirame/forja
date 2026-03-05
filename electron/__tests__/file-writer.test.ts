import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs/promises");

import { writeFile } from "../file-writer";
import * as fs from "fs/promises";

describe("file-writer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should write content to the specified file", async () => {
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);

    await writeFile("/home/user/project/test.ts", "const x = 1;");

    expect(fs.writeFile).toHaveBeenCalledWith(
      "/home/user/project/test.ts",
      "const x = 1;",
      "utf-8"
    );
  });

  it("should reject writes to /etc", async () => {
    await expect(writeFile("/etc/hosts", "malicious")).rejects.toThrow("Cannot write to system path");
  });

  it("should reject writes to /usr", async () => {
    await expect(writeFile("/usr/bin/test", "malicious")).rejects.toThrow("Cannot write to system path");
  });

  it("should reject writes to /sys", async () => {
    await expect(writeFile("/sys/something", "malicious")).rejects.toThrow("Cannot write to system path");
  });

  it("should reject writes to /proc", async () => {
    await expect(writeFile("/proc/something", "malicious")).rejects.toThrow("Cannot write to system path");
  });

  it("should allow writes to home directory", async () => {
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    await writeFile("/home/user/project/file.ts", "content");
    expect(fs.writeFile).toHaveBeenCalled();
  });
});
