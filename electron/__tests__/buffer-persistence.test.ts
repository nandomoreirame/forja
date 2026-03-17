import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

import {
  saveBuffer,
  loadBuffer,
  deleteBuffer,
  cleanStaleBuffers,
  sanitizeTabId,
  MAX_BUFFER_SIZE,
  getBufferDir,
} from "../buffer-persistence";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "forja-buffer-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("saveBuffer", () => {
  it("creates buffer file in .forja/buffers/ directory", () => {
    saveBuffer(tmpDir, "tab-001", "hello world");

    const expectedDir = path.join(tmpDir, ".forja", "buffers");
    const expectedFile = path.join(expectedDir, "tab-001.buf");

    expect(fs.existsSync(expectedDir)).toBe(true);
    expect(fs.existsSync(expectedFile)).toBe(true);
  });

  it("creates directory recursively if needed", () => {
    const projectPath = path.join(tmpDir, "new-project", "nested");
    // The project path itself does not exist yet
    fs.mkdirSync(projectPath, { recursive: true });

    // .forja/buffers does NOT exist inside projectPath
    expect(fs.existsSync(path.join(projectPath, ".forja", "buffers"))).toBe(false);

    saveBuffer(projectPath, "tab-abc", "some content");

    expect(fs.existsSync(path.join(projectPath, ".forja", "buffers", "tab-abc.buf"))).toBe(true);
  });
});

describe("loadBuffer", () => {
  it("returns saved content", () => {
    const content = "This is the terminal output\nLine 2\nLine 3";
    saveBuffer(tmpDir, "tab-load-01", content);

    const loaded = loadBuffer(tmpDir, "tab-load-01");

    expect(loaded).toBe(content);
  });

  it("returns null for non-existent buffer", () => {
    const result = loadBuffer(tmpDir, "non-existent-tab");

    expect(result).toBeNull();
  });

  it("truncates content exceeding MAX_BUFFER_SIZE", () => {
    // Build content larger than MAX_BUFFER_SIZE (512KB)
    const overSized = "A".repeat(MAX_BUFFER_SIZE + 1000);

    saveBuffer(tmpDir, "tab-oversized", overSized);

    const loaded = loadBuffer(tmpDir, "tab-oversized");

    expect(loaded).not.toBeNull();
    expect(loaded!.length).toBeLessThanOrEqual(MAX_BUFFER_SIZE);
    // Should contain the tail of the content
    expect(loaded).toBe(overSized.slice(-MAX_BUFFER_SIZE));
  });
});

describe("deleteBuffer", () => {
  it("removes the buffer file", () => {
    saveBuffer(tmpDir, "tab-del-01", "content to delete");

    const bufferFile = path.join(getBufferDir(tmpDir), "tab-del-01.buf");
    expect(fs.existsSync(bufferFile)).toBe(true);

    deleteBuffer(tmpDir, "tab-del-01");

    expect(loadBuffer(tmpDir, "tab-del-01")).toBeNull();
    expect(fs.existsSync(bufferFile)).toBe(false);
  });
});

describe("cleanStaleBuffers", () => {
  it("removes buffers not in activeTabIds", () => {
    saveBuffer(tmpDir, "tab-a", "content a");
    saveBuffer(tmpDir, "tab-b", "content b");
    saveBuffer(tmpDir, "tab-c", "content c");

    // Only tab-a and tab-b are active; tab-c should be cleaned
    cleanStaleBuffers(tmpDir, ["tab-a", "tab-b"]);

    expect(loadBuffer(tmpDir, "tab-a")).toBe("content a");
    expect(loadBuffer(tmpDir, "tab-b")).toBe("content b");
    expect(loadBuffer(tmpDir, "tab-c")).toBeNull();
  });

  it("preserves active buffers", () => {
    saveBuffer(tmpDir, "tab-x", "content x");
    saveBuffer(tmpDir, "tab-y", "content y");

    // Both tabs are active — neither should be removed
    cleanStaleBuffers(tmpDir, ["tab-x", "tab-y"]);

    expect(loadBuffer(tmpDir, "tab-x")).toBe("content x");
    expect(loadBuffer(tmpDir, "tab-y")).toBe("content y");
  });
});

describe("sanitizeTabId", () => {
  it("replaces invalid characters with underscores", () => {
    expect(sanitizeTabId("tab/001")).toBe("tab_001");
    expect(sanitizeTabId("tab:001")).toBe("tab_001");
    expect(sanitizeTabId("tab 001")).toBe("tab_001");
    expect(sanitizeTabId("tab.001")).toBe("tab_001");
    expect(sanitizeTabId("tab@domain.com")).toBe("tab_domain_com");
  });

  it("preserves valid characters (letters, digits, dash, underscore)", () => {
    expect(sanitizeTabId("tab-001")).toBe("tab-001");
    expect(sanitizeTabId("tab_001")).toBe("tab_001");
    expect(sanitizeTabId("TAB001")).toBe("TAB001");
    expect(sanitizeTabId("my-tab_123")).toBe("my-tab_123");
  });
});
