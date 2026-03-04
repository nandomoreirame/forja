import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "../sanitize-html";

describe("sanitizeHtml", () => {
  it("preserves safe HTML tags", () => {
    const html = '<pre><code class="lang-ts"><span>const x = 1;</span></code></pre>';
    const result = sanitizeHtml(html);
    expect(result).toContain("<pre>");
    expect(result).toContain("<code");
    expect(result).toContain("<span>");
  });

  it("strips script tags", () => {
    const html = '<div>Hello</div><script>alert("xss")</script>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain("<script>");
    expect(result).toContain("<div>Hello</div>");
  });

  it("strips event handlers", () => {
    const html = '<img src="x" onerror="alert(1)" />';
    const result = sanitizeHtml(html);
    expect(result).not.toContain("onerror");
  });

  it("preserves allowed attributes", () => {
    const html = '<a href="https://example.com" class="link">click</a>';
    const result = sanitizeHtml(html);
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('class="link"');
  });

  it("handles empty string", () => {
    expect(sanitizeHtml("")).toBe("");
  });
});
