import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { readFile } from "../file-reader";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "forja-reader-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("readFile", () => {
  it("reads a file successfully", () => {
    const filePath = path.join(tmpDir, "test.ts");
    fs.writeFileSync(filePath, "export const x = 42;", "utf-8");

    const result = readFile(filePath);
    expect(result.content).toBe("export const x = 42;");
    expect(result.path).toBe(filePath);
    expect(result.size).toBeGreaterThan(0);
  });

  it("returns correct size", () => {
    const content = "hello world";
    const filePath = path.join(tmpDir, "hello.txt");
    fs.writeFileSync(filePath, content, "utf-8");

    const result = readFile(filePath);
    expect(result.size).toBe(Buffer.byteLength(content, "utf-8"));
  });

  it("throws when file exceeds size limit", () => {
    const filePath = path.join(tmpDir, "big.txt");
    // Write 2MB file, limit to 1MB
    const bigContent = "x".repeat(2 * 1024 * 1024);
    fs.writeFileSync(filePath, bigContent, "utf-8");

    expect(() => readFile(filePath, 1)).toThrow(/too large/i);
  });

  it("reads unicode content correctly", () => {
    const content = "こんにちは世界 — hello 🌍";
    const filePath = path.join(tmpDir, "unicode.txt");
    fs.writeFileSync(filePath, content, "utf-8");

    const result = readFile(filePath);
    expect(result.content).toBe(content);
  });

  it("throws when file does not exist", () => {
    expect(() =>
      readFile(path.join(tmpDir, "nonexistent.ts"))
    ).toThrow();
  });

  it("uses default 10MB limit when maxSizeMb not specified", () => {
    const filePath = path.join(tmpDir, "small.ts");
    fs.writeFileSync(filePath, "const x = 1;", "utf-8");

    // Should not throw for a small file
    expect(() => readFile(filePath)).not.toThrow();
  });
});
