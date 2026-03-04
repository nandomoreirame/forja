import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Suspense } from "react";
import { FilePreviewPane } from "../file-preview-pane";
import { useFilePreviewStore } from "@/stores/file-preview";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn().mockResolvedValue({ isGitRepo: false, branch: null, fileStatus: null, changedFiles: 0 }),
  open: vi.fn(),
}));
vi.mock("shiki/core", () => ({
  createHighlighterCore: vi.fn().mockResolvedValue({
    codeToHtml: vi.fn((code: string) => `<pre><code>${code}</code></pre>`),
    loadLanguage: vi.fn().mockResolvedValue(undefined),
  }),
}));
vi.mock("shiki/engine/oniguruma", () => ({
  createOnigurumaEngine: vi.fn().mockReturnValue({}),
}));
vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => (
    <div data-testid="markdown-content">{children}</div>
  ),
}));
vi.mock("remark-gfm", () => ({
  default: () => {},
}));

function renderWithSuspense(ui: React.ReactElement) {
  return render(<Suspense fallback={null}>{ui}</Suspense>);
}

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
    const { container } = renderWithSuspense(<FilePreviewPane />);
    expect(container.innerHTML).toBe("");
  });

  it("renders with fixed width when open", () => {
    useFilePreviewStore.setState({
      isOpen: true,
      isLoading: false,
      currentFile: "/test/file.ts",
      content: { path: "/test/file.ts", content: "const x = 1;", size: 12 },
    });
    renderWithSuspense(<FilePreviewPane />);
    const pane = screen.getByTestId("file-preview-pane");
    expect(pane.className).toMatch(/h-full/);
  });

  it("shows loading state when isLoading is true", () => {
    useFilePreviewStore.setState({
      isOpen: true,
      isLoading: true,
      currentFile: "/test/file.ts",
    });
    renderWithSuspense(<FilePreviewPane />);
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
    renderWithSuspense(<FilePreviewPane />);
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
    renderWithSuspense(<FilePreviewPane />);
    expect(screen.getByText("example.ts")).toBeInTheDocument();
  });

  it("shows close button that calls closePreview", () => {
    useFilePreviewStore.setState({
      isOpen: true,
      isLoading: false,
      currentFile: "/test/file.ts",
      content: { path: "/test/file.ts", content: "const x = 1;", size: 12 },
    });
    renderWithSuspense(<FilePreviewPane />);
    const closeButton = screen.getByLabelText("Close preview");
    expect(closeButton).toBeInTheDocument();

    fireEvent.click(closeButton);

    const state = useFilePreviewStore.getState();
    expect(state.isOpen).toBe(false);
  });

  it("shows file info in footer", () => {
    useFilePreviewStore.setState({
      isOpen: true,
      isLoading: false,
      currentFile: "/test/file.ts",
      content: { path: "/test/file.ts", content: "const x = 1;", size: 2048 },
    });
    renderWithSuspense(<FilePreviewPane />);
    expect(screen.getByText("2.0 KB")).toBeInTheDocument();
    expect(screen.getByText("1 line")).toBeInTheDocument();
    expect(screen.getByText("UTF-8")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });

  it("renders markdown content for .md files", async () => {
    useFilePreviewStore.setState({
      isOpen: true,
      isLoading: false,
      currentFile: "/test/README.md",
      content: { path: "/test/README.md", content: "# Hello", size: 7 },
    });
    renderWithSuspense(<FilePreviewPane />);

    await waitFor(() => {
      expect(screen.getByTestId("markdown-content")).toBeInTheDocument();
    });
    expect(screen.getByText("# Hello")).toBeInTheDocument();
  });

  it("renders image viewer for PNG files with base64 encoding", () => {
    const fakeBase64 = "iVBORw0KGgoAAAANSUhEUg";
    useFilePreviewStore.setState({
      isOpen: true,
      isLoading: false,
      currentFile: "/test/screenshot.png",
      content: { path: "/test/screenshot.png", content: fakeBase64, size: 1024, encoding: "base64" },
    });
    renderWithSuspense(<FilePreviewPane />);
    const img = screen.getByRole("img");
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toMatch(/^data:image\/png;base64,/);
  });

  it("renders image viewer for JPG files", () => {
    const fakeBase64 = "/9j/4AAQSkZJRgABAQ";
    useFilePreviewStore.setState({
      isOpen: true,
      isLoading: false,
      currentFile: "/test/photo.jpg",
      content: { path: "/test/photo.jpg", content: fakeBase64, size: 2048, encoding: "base64" },
    });
    renderWithSuspense(<FilePreviewPane />);
    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("shows image-specific footer for image files", () => {
    useFilePreviewStore.setState({
      isOpen: true,
      isLoading: false,
      currentFile: "/test/photo.png",
      content: { path: "/test/photo.png", content: "abc123", size: 38000, encoding: "base64" },
    });
    renderWithSuspense(<FilePreviewPane />);
    expect(screen.getByText("37.1 KB")).toBeInTheDocument();
    expect(screen.getByText("PNG")).toBeInTheDocument();
  });

  it("does not show line count in footer for image files", () => {
    useFilePreviewStore.setState({
      isOpen: true,
      isLoading: false,
      currentFile: "/test/photo.png",
      content: { path: "/test/photo.png", content: "abc123", size: 1024, encoding: "base64" },
    });
    renderWithSuspense(<FilePreviewPane />);
    expect(screen.queryByText(/line/)).not.toBeInTheDocument();
  });
});
