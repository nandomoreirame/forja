import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock electron clipboard
vi.mock("electron", () => ({
  clipboard: {
    readImage: vi.fn(),
  },
}));

// Mock fs/promises
vi.mock("node:fs/promises", () => ({
  writeFile: vi.fn(),
}));

import { clipboard } from "electron";
import * as fs from "node:fs/promises";
import { saveClipboardImage } from "../clipboard";

describe("saveClipboardImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when clipboard has no image", async () => {
    vi.mocked(clipboard.readImage).mockReturnValue({
      isEmpty: () => true,
      toPNG: () => Buffer.alloc(0),
    } as Electron.NativeImage);

    const result = await saveClipboardImage("/home/user/project");

    expect(result).toBeNull();
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it("writes PNG file and returns path when clipboard has an image", async () => {
    const fakeBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    vi.mocked(clipboard.readImage).mockReturnValue({
      isEmpty: () => false,
      toPNG: () => fakeBuffer,
    } as Electron.NativeImage);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);

    const result = await saveClipboardImage("/home/user/project");

    expect(result).toMatch(/^\/home\/user\/project\/screenshot-\d+\.png$/);
    expect(fs.writeFile).toHaveBeenCalledWith(result, fakeBuffer);
  });

  it("uses provided filename when given", async () => {
    const fakeBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    vi.mocked(clipboard.readImage).mockReturnValue({
      isEmpty: () => false,
      toPNG: () => fakeBuffer,
    } as Electron.NativeImage);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);

    const result = await saveClipboardImage("/home/user/project", "my-image.png");

    expect(result).toBe("/home/user/project/my-image.png");
    expect(fs.writeFile).toHaveBeenCalledWith(
      "/home/user/project/my-image.png",
      fakeBuffer
    );
  });

  it("rejects when writeFile fails", async () => {
    const fakeBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    vi.mocked(clipboard.readImage).mockReturnValue({
      isEmpty: () => false,
      toPNG: () => fakeBuffer,
    } as Electron.NativeImage);
    vi.mocked(fs.writeFile).mockRejectedValue(new Error("ENOENT"));

    await expect(
      saveClipboardImage("/home/user/project", "test.png")
    ).rejects.toThrow("ENOENT");
  });
});
