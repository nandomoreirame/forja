import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownRenderer } from "../markdown-renderer";

vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: vi.fn(),
}));
vi.mock("shiki/core", () => ({
  createHighlighterCore: vi.fn().mockResolvedValue({
    codeToHtml: vi.fn(
      (code: string) => `<pre><code>${code}</code></pre>`
    ),
    loadLanguage: vi.fn().mockResolvedValue(undefined),
  }),
}));
vi.mock("shiki/engine/oniguruma", () => ({
  createOnigurumaEngine: vi.fn().mockReturnValue({}),
}));

describe("MarkdownRenderer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders plain text content", () => {
    render(<MarkdownRenderer content="Hello world" />);
    expect(screen.getByText("Hello world")).toBeDefined();
  });

  it("renders headings", () => {
    render(<MarkdownRenderer content={"# Title"} />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toBe("Title");
  });

  it("renders inline code", () => {
    render(<MarkdownRenderer content="Use `const x = 1` here" />);
    const code = document.querySelector("code");
    expect(code).not.toBeNull();
    expect(code?.textContent).toBe("const x = 1");
  });

  it("renders bold text", () => {
    render(<MarkdownRenderer content="This is **bold** text" />);
    const strong = document.querySelector("strong");
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe("bold");
  });

  it("renders unordered lists", () => {
    const md = ["- Item 1", "- Item 2", "- Item 3"].join("\n");
    render(<MarkdownRenderer content={md} />);
    const ul = document.querySelector("ul");
    expect(ul).not.toBeNull();
    expect(ul?.querySelectorAll("li").length).toBeGreaterThanOrEqual(1);
  });

  it("renders ordered lists", () => {
    const md = ["1. First", "2. Second"].join("\n");
    render(<MarkdownRenderer content={md} />);
    const ol = document.querySelector("ol");
    expect(ol).not.toBeNull();
  });

  it("renders blockquotes", () => {
    render(<MarkdownRenderer content="> This is a quote" />);
    const blockquote = document.querySelector("blockquote");
    expect(blockquote).not.toBeNull();
  });

  it("renders tables with GFM support", () => {
    const table = "| Col1 | Col2 |\n|------|------|\n| A | B |";
    render(<MarkdownRenderer content={table} />);
    const tableEl = document.querySelector("table");
    expect(tableEl).not.toBeNull();
    const cells = document.querySelectorAll("td");
    expect(cells.length).toBeGreaterThanOrEqual(2);
  });

  it("renders fenced code blocks with language class", () => {
    const content = "```typescript\nconst x = 1;\n```";
    render(<MarkdownRenderer content={content} />);
    const pre = document.querySelector("pre");
    expect(pre).not.toBeNull();
  });

  it("renders links as anchor elements", () => {
    render(
      <MarkdownRenderer content="Visit [Example](https://example.com)" />
    );
    const link = document.querySelector("a");
    expect(link).not.toBeNull();
    expect(link?.textContent).toBe("Example");
  });

  it("renders empty string without errors", () => {
    const { container } = render(<MarkdownRenderer content="" />);
    expect(container).toBeDefined();
  });

  it("applies prose wrapper class", () => {
    const { container } = render(
      <MarkdownRenderer content="Some text" />
    );
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain("markdown");
    expect(wrapper?.className).toContain("prose");
  });
});
