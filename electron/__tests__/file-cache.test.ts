import { describe, it, expect, beforeEach } from "vitest";
import {
  FILE_CACHE_MAX_ENTRIES,
  FILE_CACHE_MAX_BYTES,
  getFileFromCache,
  putFileInCache,
  invalidateFileCache,
  clearFileCache,
  getFileCacheStats,
} from "../file-cache";

describe("file-cache", () => {
  beforeEach(() => {
    clearFileCache();
  });

  it("constants are exported correctly", () => {
    expect(FILE_CACHE_MAX_ENTRIES).toBe(20);
    expect(FILE_CACHE_MAX_BYTES).toBe(1_000_000);
  });

  it("getFileFromCache returns undefined for uncached path", () => {
    const result = getFileFromCache("/some/nonexistent/path.ts");
    expect(result).toBeUndefined();
  });

  it("putFileInCache + getFileFromCache round-trips correctly", () => {
    const path = "/home/user/project/file.ts";
    const content = "export const hello = 'world';";

    putFileInCache(path, content);
    const entry = getFileFromCache(path);

    expect(entry).not.toBeUndefined();
    expect(entry!.content).toBe(content);
    expect(entry!.size).toBe(Buffer.byteLength(content, "utf-8"));
  });

  it("getFileFromCache moves entry to most recently used position", () => {
    // Fill cache with entries and verify LRU ordering works
    for (let i = 0; i < 5; i++) {
      putFileInCache(`/path/file${i}.ts`, `content ${i}`);
    }

    // Access file0 to make it most recently used
    getFileFromCache("/path/file0.ts");

    // Verify it's still accessible
    const entry = getFileFromCache("/path/file0.ts");
    expect(entry).not.toBeUndefined();
    expect(entry!.content).toBe("content 0");

    // Stats should still show 5 entries
    expect(getFileCacheStats().entries).toBe(5);
  });

  it("evicts oldest entry when max entries exceeded", () => {
    // Fill cache to exactly max entries
    for (let i = 0; i < FILE_CACHE_MAX_ENTRIES; i++) {
      putFileInCache(`/path/file${i}.ts`, `content ${i}`);
    }

    expect(getFileCacheStats().entries).toBe(FILE_CACHE_MAX_ENTRIES);

    // Add one more entry — should evict the oldest (file0)
    putFileInCache("/path/extra.ts", "extra content");

    // file0 should be evicted (it's the oldest)
    expect(getFileFromCache("/path/file0.ts")).toBeUndefined();

    // newer entries and the new one should still be present
    expect(getFileFromCache("/path/file1.ts")).not.toBeUndefined();
    expect(getFileFromCache("/path/extra.ts")).not.toBeUndefined();

    // total entries should not exceed max
    expect(getFileCacheStats().entries).toBeLessThanOrEqual(FILE_CACHE_MAX_ENTRIES);
  });

  it("evicts entries when total size exceeds max bytes", () => {
    // Create a string of ~400KB
    const chunk400kb = "A".repeat(400_000);

    putFileInCache("/path/file1.ts", chunk400kb);
    putFileInCache("/path/file2.ts", chunk400kb);

    // Both fit within 1MB
    expect(getFileCacheStats().entries).toBe(2);
    expect(getFileCacheStats().totalBytes).toBeLessThanOrEqual(FILE_CACHE_MAX_BYTES);

    // Adding a third 400KB entry (total = 1.2MB) should evict the oldest
    putFileInCache("/path/file3.ts", chunk400kb);

    // file1 should be evicted (oldest), file2 and file3 should remain
    expect(getFileFromCache("/path/file1.ts")).toBeUndefined();
    expect(getFileFromCache("/path/file2.ts")).not.toBeUndefined();
    expect(getFileFromCache("/path/file3.ts")).not.toBeUndefined();

    // Total bytes should be within limit
    expect(getFileCacheStats().totalBytes).toBeLessThanOrEqual(FILE_CACHE_MAX_BYTES);
  });

  it("does not cache entry that exceeds max bytes alone", () => {
    // Create a string larger than 1MB
    const oversized = "X".repeat(FILE_CACHE_MAX_BYTES + 1);

    putFileInCache("/path/huge-file.ts", oversized);

    // Should not be cached
    expect(getFileFromCache("/path/huge-file.ts")).toBeUndefined();
    expect(getFileCacheStats().entries).toBe(0);
    expect(getFileCacheStats().totalBytes).toBe(0);
  });

  it("invalidateFileCache removes a specific entry", () => {
    putFileInCache("/path/file-a.ts", "content a");
    putFileInCache("/path/file-b.ts", "content b");
    putFileInCache("/path/file-c.ts", "content c");

    expect(getFileCacheStats().entries).toBe(3);

    invalidateFileCache("/path/file-b.ts");

    expect(getFileFromCache("/path/file-b.ts")).toBeUndefined();
    expect(getFileFromCache("/path/file-a.ts")).not.toBeUndefined();
    expect(getFileFromCache("/path/file-c.ts")).not.toBeUndefined();
    expect(getFileCacheStats().entries).toBe(2);
  });

  it("clearFileCache removes all entries", () => {
    putFileInCache("/path/file1.ts", "content 1");
    putFileInCache("/path/file2.ts", "content 2");
    putFileInCache("/path/file3.ts", "content 3");

    expect(getFileCacheStats().entries).toBe(3);

    clearFileCache();

    expect(getFileCacheStats().entries).toBe(0);
    expect(getFileCacheStats().totalBytes).toBe(0);
    expect(getFileFromCache("/path/file1.ts")).toBeUndefined();
    expect(getFileFromCache("/path/file2.ts")).toBeUndefined();
    expect(getFileFromCache("/path/file3.ts")).toBeUndefined();
  });

  it("getFileCacheStats returns correct counts", () => {
    const content1 = "hello world"; // 11 bytes
    const content2 = "foo bar baz"; // 11 bytes

    putFileInCache("/path/a.ts", content1);
    putFileInCache("/path/b.ts", content2);

    const stats = getFileCacheStats();

    expect(stats.entries).toBe(2);
    expect(stats.totalBytes).toBe(
      Buffer.byteLength(content1, "utf-8") + Buffer.byteLength(content2, "utf-8")
    );
  });

  it("re-inserting an existing key updates content and moves to most recent", () => {
    putFileInCache("/path/file.ts", "original content");
    putFileInCache("/path/other.ts", "other content");

    // Re-insert file.ts with new content
    putFileInCache("/path/file.ts", "updated content");

    const entry = getFileFromCache("/path/file.ts");
    expect(entry).not.toBeUndefined();
    expect(entry!.content).toBe("updated content");

    // Should still have 2 entries (not 3)
    expect(getFileCacheStats().entries).toBe(2);
  });

  it("handles multibyte UTF-8 content size correctly", () => {
    const content = "héllo wörld"; // contains multibyte chars
    const expectedBytes = Buffer.byteLength(content, "utf-8");

    putFileInCache("/path/unicode.ts", content);

    const entry = getFileFromCache("/path/unicode.ts");
    expect(entry).not.toBeUndefined();
    expect(entry!.size).toBe(expectedBytes);
    expect(getFileCacheStats().totalBytes).toBe(expectedBytes);
  });

  it("LRU: most recently accessed entry survives eviction", () => {
    // Fill cache to max
    for (let i = 0; i < FILE_CACHE_MAX_ENTRIES; i++) {
      putFileInCache(`/path/file${i}.ts`, `content ${i}`);
    }

    // Access file0 to make it most recently used
    getFileFromCache("/path/file0.ts");

    // Add enough entries to evict the oldest
    // file1 should now be the oldest (file0 was just accessed/refreshed)
    putFileInCache("/path/new-entry.ts", "new content");

    // file0 should survive (was recently accessed)
    expect(getFileFromCache("/path/file0.ts")).not.toBeUndefined();

    // file1 should be evicted (oldest after file0 was refreshed)
    expect(getFileFromCache("/path/file1.ts")).toBeUndefined();
  });
});
