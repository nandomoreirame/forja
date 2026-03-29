import { describe, it, expect } from "vitest";
import { normalizeUrl, isAllowedUrl, BLOCKED_SCHEMES } from "../browser-url";

describe("normalizeUrl", () => {
  it("adds http:// prefix if missing", () => {
    expect(normalizeUrl("localhost:3000")).toBe("http://localhost:3000");
  });

  it("preserves https:// URLs unchanged", () => {
    expect(normalizeUrl("https://localhost:3000")).toBe("https://localhost:3000");
  });

  it("preserves http:// URLs unchanged", () => {
    expect(normalizeUrl("http://localhost:8080")).toBe("http://localhost:8080");
  });

  it("trims whitespace", () => {
    expect(normalizeUrl("  localhost:3000  ")).toBe("http://localhost:3000");
  });
});

describe("isAllowedUrl", () => {
  it("allows localhost URLs", () => {
    expect(isAllowedUrl("http://localhost:3000")).toBe(true);
  });

  it("allows 127.0.0.1 URLs", () => {
    expect(isAllowedUrl("http://127.0.0.1:8080")).toBe(true);
  });

  it("allows 0.0.0.0 URLs", () => {
    expect(isAllowedUrl("http://0.0.0.0:5173")).toBe(true);
  });

  it("allows any http URL", () => {
    expect(isAllowedUrl("http://example.com")).toBe(true);
  });

  it("blocks javascript: scheme", () => {
    expect(isAllowedUrl("javascript:alert(1)")).toBe(false);
  });

  it("blocks file: scheme", () => {
    expect(isAllowedUrl("file:///etc/passwd")).toBe(false);
  });

  it("blocks data: scheme", () => {
    expect(isAllowedUrl("data:text/html,<h1>hi</h1>")).toBe(false);
  });

  it("blocks vbscript: scheme", () => {
    expect(isAllowedUrl("vbscript:msgbox(1)")).toBe(false);
  });
});

describe("BLOCKED_SCHEMES", () => {
  it("contains javascript, file, data, vbscript", () => {
    expect(BLOCKED_SCHEMES).toContain("javascript:");
    expect(BLOCKED_SCHEMES).toContain("file:");
    expect(BLOCKED_SCHEMES).toContain("data:");
    expect(BLOCKED_SCHEMES).toContain("vbscript:");
  });
});
