import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { readFile, isImageFile, getImageMimeType } from "../file-reader";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "forja-reader-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("readFile", () => {
  it("reads a file successfully", async () => {
    const filePath = path.join(tmpDir, "test.ts");
    fs.writeFileSync(filePath, "export const x = 42;", "utf-8");

    const result = await readFile(filePath);
    expect(result.content).toBe("export const x = 42;");
    expect(result.path).toBe(filePath);
    expect(result.size).toBeGreaterThan(0);
  });

  it("returns correct size", async () => {
    const content = "hello world";
    const filePath = path.join(tmpDir, "hello.txt");
    fs.writeFileSync(filePath, content, "utf-8");

    const result = await readFile(filePath);
    expect(result.size).toBe(Buffer.byteLength(content, "utf-8"));
  });

  it("throws when file exceeds size limit", async () => {
    const filePath = path.join(tmpDir, "big.txt");
    // Write 2MB file, limit to 1MB
    const bigContent = "x".repeat(2 * 1024 * 1024);
    fs.writeFileSync(filePath, bigContent, "utf-8");

    await expect(readFile(filePath, 1)).rejects.toThrow(/too large/i);
  });

  it("reads unicode content correctly", async () => {
    const content = "hello world";
    const filePath = path.join(tmpDir, "unicode.txt");
    fs.writeFileSync(filePath, content, "utf-8");

    const result = await readFile(filePath);
    expect(result.content).toBe(content);
  });

  it("throws when file does not exist", async () => {
    await expect(
      readFile(path.join(tmpDir, "nonexistent.ts"))
    ).rejects.toThrow();
  });

  it("uses default 10MB limit when maxSizeMb not specified", async () => {
    const filePath = path.join(tmpDir, "small.ts");
    fs.writeFileSync(filePath, "const x = 1;", "utf-8");

    // Should not throw for a small file
    await expect(readFile(filePath)).resolves.toBeDefined();
  });
});

describe("isImageFile", () => {
  it("returns true for supported image extensions", () => {
    expect(isImageFile("photo.png")).toBe(true);
    expect(isImageFile("photo.jpg")).toBe(true);
    expect(isImageFile("photo.jpeg")).toBe(true);
    expect(isImageFile("photo.gif")).toBe(true);
    expect(isImageFile("photo.webp")).toBe(true);
    expect(isImageFile("photo.svg")).toBe(true);
    expect(isImageFile("photo.ico")).toBe(true);
    expect(isImageFile("photo.bmp")).toBe(true);
  });

  it("returns false for non-image extensions", () => {
    expect(isImageFile("file.ts")).toBe(false);
    expect(isImageFile("file.json")).toBe(false);
    expect(isImageFile("file.md")).toBe(false);
    expect(isImageFile("file.txt")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isImageFile("photo.PNG")).toBe(true);
    expect(isImageFile("photo.Jpg")).toBe(true);
  });

  it("handles paths with directories", () => {
    expect(isImageFile("/home/user/images/photo.png")).toBe(true);
    expect(isImageFile("/home/user/code/file.ts")).toBe(false);
  });
});

describe("getImageMimeType", () => {
  it("returns correct MIME type for each extension", () => {
    expect(getImageMimeType("png")).toBe("image/png");
    expect(getImageMimeType("jpg")).toBe("image/jpeg");
    expect(getImageMimeType("jpeg")).toBe("image/jpeg");
    expect(getImageMimeType("gif")).toBe("image/gif");
    expect(getImageMimeType("webp")).toBe("image/webp");
    expect(getImageMimeType("svg")).toBe("image/svg+xml");
    expect(getImageMimeType("ico")).toBe("image/x-icon");
    expect(getImageMimeType("bmp")).toBe("image/bmp");
  });

  it("returns image/png as fallback for unknown extensions", () => {
    expect(getImageMimeType("xyz")).toBe("image/png");
  });
});

describe("readFile with images", () => {
  it("reads image files as base64 with encoding field", async () => {
    const filePath = path.join(tmpDir, "test.png");
    const imageBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    fs.writeFileSync(filePath, imageBuffer);

    const result = await readFile(filePath);
    expect(result.encoding).toBe("base64");
    expect(result.content).toBe(imageBuffer.toString("base64"));
    expect(result.size).toBe(imageBuffer.length);
  });

  it("still reads text files as utf-8 without encoding field", async () => {
    const filePath = path.join(tmpDir, "test.ts");
    fs.writeFileSync(filePath, "const x = 1;", "utf-8");

    const result = await readFile(filePath);
    expect(result.encoding).toBeUndefined();
    expect(result.content).toBe("const x = 1;");
  });

  it("reads SVG files as base64", async () => {
    const filePath = path.join(tmpDir, "icon.svg");
    const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>';
    fs.writeFileSync(filePath, svgContent, "utf-8");

    const result = await readFile(filePath);
    expect(result.encoding).toBe("base64");
    expect(result.content).toBe(Buffer.from(svgContent).toString("base64"));
  });

  it("respects size limit for image files", async () => {
    const filePath = path.join(tmpDir, "big.png");
    const bigBuffer = Buffer.alloc(2 * 1024 * 1024);
    fs.writeFileSync(filePath, bigBuffer);

    await expect(readFile(filePath, 1)).rejects.toThrow(/too large/i);
  });
});
