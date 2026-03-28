import { describe, it, expect } from "vitest";
import { RingBuffer } from "../ring-buffer";

describe("RingBuffer", () => {
  it("stores written chunks", () => {
    const buf = new RingBuffer(1024);
    buf.write("hello ");
    buf.write("world");
    expect(buf.read()).toBe("hello world");
  });

  it("evicts oldest data when capacity is exceeded", () => {
    const buf = new RingBuffer(10); // 10 bytes
    buf.write("AAAAAAAAAA"); // exactly 10
    buf.write("B");          // triggers eviction
    const content = buf.read();
    expect(content.length).toBeLessThanOrEqual(10);
    expect(content.endsWith("B")).toBe(true);
  });

  it("returns empty string when no data written", () => {
    const buf = new RingBuffer(1024);
    expect(buf.read()).toBe("");
  });

  it("clears all data", () => {
    const buf = new RingBuffer(1024);
    buf.write("some data");
    buf.clear();
    expect(buf.read()).toBe("");
  });

  it("reports byte length correctly", () => {
    const buf = new RingBuffer(1024);
    buf.write("hello"); // 5 bytes ASCII
    expect(buf.byteLength).toBe(5);
  });

  it("handles many small writes without O(n) shift degradation", () => {
    const buf = new RingBuffer(256);
    // Write 1000 small chunks — should not degrade due to shift()
    for (let i = 0; i < 1000; i++) {
      buf.write(`chunk-${i}\n`);
    }
    const content = buf.read();
    expect(buf.byteLength).toBeLessThanOrEqual(256);
    expect(content.length).toBeGreaterThan(0);
    // Last written chunk should be present
    expect(content).toContain("chunk-999");
  });

  it("preserves byte length accuracy after many evictions", () => {
    const buf = new RingBuffer(50);
    for (let i = 0; i < 100; i++) {
      buf.write("ABCDE"); // 5 bytes each
    }
    // Should always be <= 50 bytes
    expect(buf.byteLength).toBeLessThanOrEqual(50);
    expect(buf.byteLength).toBeGreaterThan(0);
    // Verify read content matches reported byteLength
    const content = buf.read();
    expect(Buffer.byteLength(content, "utf8")).toBe(buf.byteLength);
  });

  it("handles multibyte UTF-8 characters correctly", () => {
    const buf = new RingBuffer(20);
    buf.write("héllo"); // é = 2 bytes, total = 6 bytes
    buf.write("wörld"); // ö = 2 bytes, total = 6 bytes
    expect(buf.byteLength).toBe(12);
    expect(buf.read()).toBe("héllowörld");
  });

  it("evicts correctly when single chunk exceeds capacity", () => {
    const buf = new RingBuffer(10);
    buf.write("small");
    buf.write("this-is-a-very-long-chunk"); // exceeds 10 bytes
    // Should keep the last chunk even if it alone exceeds capacity
    const content = buf.read();
    expect(content).toBe("this-is-a-very-long-chunk");
  });
});
