import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilePreviewPane } from "../file-preview-pane";
import { useFilePreviewStore } from "@/stores/file-preview";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));
vi.mock("shiki", () => ({
  createHighlighter: vi.fn().mockResolvedValue({
    codeToHtml: vi.fn((code) => `<pre><code>${code}</code></pre>`),
    dispose: vi.fn(),
  }),
}));
vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => (
    <div data-testid="markdown-content">{children}</div>
  ),
}));
vi.mock("remark-gfm", () => ({
  default: () => {},
}));

describe("FilePreviewPane", () => {
  beforeEach(() => {
    useFilePreviewStore.setState({
      isOpen: false,
      currentFile: null,
      content: null,
      isLoading: false,
      error: null,
    });
  });

  it("returns null when isOpen is false", () => {
    const { container } = render(<FilePreviewPane />);
    expect(container.innerHTML).toBe("");
  });

  it("renders with fixed width when open", () => {
    useFilePreviewStore.setState({
      isOpen: true,
      isLoading: false,
      currentFile: "/test/file.ts",
      content: { path: "/test/file.ts", content: "const x = 1;", size: 12 },
    });
    render(<FilePreviewPane />);
    const pane = screen.getByTestId("file-preview-pane");
    expect(pane.className).toMatch(/basis-1\/2/);
  });

  it("shows loading state when isLoading is true", () => {
    useFilePreviewStore.setState({
      isOpen: true,
      isLoading: true,
      currentFile: "/test/file.ts",
    });
    render(<FilePreviewPane />);
    expect(screen.getByTestId("file-preview-pane")).toBeInTheDocument();
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("shows error message when error is set", () => {
    useFilePreviewStore.setState({
      isOpen: true,
      isLoading: false,
      currentFile: "/test/file.ts",
      error: "File not found",
    });
    render(<FilePreviewPane />);
    expect(screen.getByText("File not found")).toBeInTheDocument();
    expect(screen.getByTestId("error-icon")).toBeInTheDocument();
  });

  it("shows filename in header when content is loaded", () => {
    useFilePreviewStore.setState({
      isOpen: true,
      isLoading: false,
      currentFile: "/path/to/example.ts",
      content: { path: "/path/to/example.ts", content: "const x = 1;", size: 12 },
    });
    render(<FilePreviewPane />);
    expect(screen.getByText("example.ts")).toBeInTheDocument();
  });

  it("shows close button that calls closePreview", () => {
    useFilePreviewStore.setState({
      isOpen: true,
      isLoading: false,
      currentFile: "/test/file.ts",
      content: { path: "/test/file.ts", content: "const x = 1;", size: 12 },
    });
    render(<FilePreviewPane />);
    const closeButton = screen.getByLabelText("Close preview");
    expect(closeButton).toBeInTheDocument();

    fireEvent.click(closeButton);

    const state = useFilePreviewStore.getState();
    expect(state.isOpen).toBe(false);
  });

  it("shows file size in footer", () => {
    useFilePreviewStore.setState({
      isOpen: true,
      isLoading: false,
      currentFile: "/test/file.ts",
      content: { path: "/test/file.ts", content: "const x = 1;", size: 2048 },
    });
    render(<FilePreviewPane />);
    expect(screen.getByText("2.0 KB")).toBeInTheDocument();
  });

  it("renders markdown content for .md files", () => {
    useFilePreviewStore.setState({
      isOpen: true,
      isLoading: false,
      currentFile: "/test/README.md",
      content: { path: "/test/README.md", content: "# Hello", size: 7 },
    });
    render(<FilePreviewPane />);
    expect(screen.getByTestId("markdown-content")).toBeInTheDocument();
    expect(screen.getByText("# Hello")).toBeInTheDocument();
  });
});
