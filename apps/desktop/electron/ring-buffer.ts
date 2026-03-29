/**
 * RingBuffer — circular buffer for PTY output.
 * Stores UTF-8 string chunks up to `maxBytes`. When capacity is exceeded,
 * evicts the oldest chunks (not individual bytes) to avoid splitting multibyte chars.
 *
 * Uses head/tail indices for O(1) eviction instead of Array.shift().
 * Stores pre-computed byteLength per chunk to avoid re-computing on evict.
 */

interface ChunkEntry {
  data: string;
  bytes: number;
}

export class RingBuffer {
  private entries: ChunkEntry[] = [];
  private head = 0;
  private _byteLength = 0;
  private readonly maxBytes: number;

  constructor(maxBytes: number) {
    this.maxBytes = maxBytes;
  }

  write(chunk: string): void {
    const chunkBytes = Buffer.byteLength(chunk, "utf8");
    this.entries.push({ data: chunk, bytes: chunkBytes });
    this._byteLength += chunkBytes;

    // Evict oldest chunks while over capacity (keep at least the newest)
    while (this._byteLength > this.maxBytes && this.entries.length - this.head > 1) {
      this._byteLength -= this.entries[this.head].bytes;
      this.head++;
    }

    // Compact when head has advanced past half the array to avoid unbounded growth
    if (this.head > 0 && this.head > this.entries.length / 2) {
      this.entries = this.entries.slice(this.head);
      this.head = 0;
    }
  }

  read(): string {
    if (this.head === 0) {
      return this.entries.map((e) => e.data).join("");
    }
    return this.entries.slice(this.head).map((e) => e.data).join("");
  }

  clear(): void {
    this.entries = [];
    this.head = 0;
    this._byteLength = 0;
  }

  get byteLength(): number {
    return this._byteLength;
  }
}
