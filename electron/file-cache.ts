/**
 * file-cache.ts — LRU cache for file reads.
 *
 * Keyed by absolute path. Max 20 entries and 1MB total size.
 * Uses Map insertion order for LRU semantics:
 *   - get: delete + re-insert to move to "most recently used" (end of map)
 *   - put: evict from beginning (oldest) when limits are exceeded
 *
 * Entries are invalidated explicitly when files are written via write_file IPC.
 * This module has no external dependencies — pure in-memory logic.
 */

export const FILE_CACHE_MAX_ENTRIES = 20;
export const FILE_CACHE_MAX_BYTES = 1_000_000; // 1MB

export interface FileCacheEntry {
  content: string;
  size: number;
}

const cache = new Map<string, FileCacheEntry>();
let totalBytes = 0;

/**
 * Returns the cached entry for the given absolute path, or undefined if not cached.
 * Moves the accessed entry to the most recently used position (end of map).
 */
export function getFileFromCache(absolutePath: string): FileCacheEntry | undefined {
  const entry = cache.get(absolutePath);
  if (entry === undefined) {
    return undefined;
  }

  // Move to end (most recently used) by deleting and re-inserting
  cache.delete(absolutePath);
  cache.set(absolutePath, entry);

  return entry;
}

/**
 * Stores the content in the cache under the given absolute path.
 *
 * Behavior:
 * - If the single entry size exceeds FILE_CACHE_MAX_BYTES, it is silently skipped.
 * - If the entry already exists, it is removed first (size recalculated).
 * - Oldest entries (from the beginning of the Map) are evicted until both
 *   the entry count and total bytes are within limits.
 */
export function putFileInCache(absolutePath: string, content: string): void {
  const size = Buffer.byteLength(content, "utf-8");

  // Skip entries that alone exceed the max size
  if (size > FILE_CACHE_MAX_BYTES) {
    return;
  }

  // If entry already exists, remove it first (update case)
  if (cache.has(absolutePath)) {
    const existing = cache.get(absolutePath)!;
    totalBytes -= existing.size;
    cache.delete(absolutePath);
  }

  // Evict oldest entries from the beginning of the Map until limits allow insertion
  const iterator = cache.entries();
  while (
    cache.size >= FILE_CACHE_MAX_ENTRIES ||
    totalBytes + size > FILE_CACHE_MAX_BYTES
  ) {
    const next = iterator.next();
    if (next.done) break;

    const [oldestKey, oldestEntry] = next.value;
    totalBytes -= oldestEntry.size;
    cache.delete(oldestKey);
  }

  cache.set(absolutePath, { content, size });
  totalBytes += size;
}

/**
 * Removes the cached entry for the given absolute path (e.g., after write_file IPC).
 */
export function invalidateFileCache(absolutePath: string): void {
  const entry = cache.get(absolutePath);
  if (entry !== undefined) {
    totalBytes -= entry.size;
    cache.delete(absolutePath);
  }
}

/**
 * Clears the entire cache and resets the total byte counter.
 */
export function clearFileCache(): void {
  cache.clear();
  totalBytes = 0;
}

/**
 * Returns the current number of cached entries and total byte count.
 */
export function getFileCacheStats(): { entries: number; totalBytes: number } {
  return {
    entries: cache.size,
    totalBytes,
  };
}
