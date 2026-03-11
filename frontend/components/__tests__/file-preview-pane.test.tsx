import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Suspense } from "react";
import { FilePreviewPane } from "../file-preview-pane";
import { useFilePreviewStore } from "@/stores/file-preview";
import { useGitDiffStore } from "@/stores/git-diff";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn().mockResolvedValue({ isGitRepo: false, branch: null, fileStatus: null, changedFiles: 0 }),
  open: vi.fn(),
}));
vi.mock("monaco-editor", () => {
  const disposable = { dispose: vi.fn() };
  const mockModel = { dispose: vi.fn(), getValue: vi.fn(() => ""), setValue: vi.fn() };
  const mockEditor = {
    getValue: vi.fn(() => ""), setValue: vi.fn(), dispose: vi.fn(),
    getModel: vi.fn(() => mockModel),
    onDidChangeModelContent: vi.fn(() => disposable),
    onDidDispose: vi.fn(() => disposable),
    layout: vi.fn(), updateOptions: vi.fn(), focus: vi.fn(),
    getAction: vi.fn(), addCommand: vi.fn(),
  };
  const mockDiffEditor = {
    getOriginalEditor: vi.fn(() => mockEditor),
    getModifiedEditor: vi.fn(() => mockEditor),
    dispose: vi.fn(), layout: vi.fn(), updateOptions: vi.fn(), setModel: vi.fn(),
  };
  return {
    editor: {
      create: vi.fn(() => mockEditor),
      createDiffEditor: vi.fn(() => mockDiffEditor),
      createModel: vi.fn((content: string) => ({
        ...mockModel, getValue: vi.fn(() => content),
      })),
      defineTheme: vi.fn(), setTheme: vi.fn(),
    },
    Uri: { parse: vi.fn((s: string) => s) },
    KeyMod: { CtrlCmd: 2048 }, KeyCode: { KeyS: 49 },
  };
});
vi.mock("@/lib/monaco-theme", () => ({
  catppuccinMochaTheme: { base: "vs-dark", inherit: true, rules: [], colors: {} },
  THEME_NAME: "catppuccin-mocha",
  getMonacoThemeName: vi.fn(() => "catppuccin-mocha"),
  getMonacoThemeData: vi.fn(() => ({ base: "vs-dark", inherit: true, rules: [], colors: {} })),
}));

vi.mock("@/stores/theme", () => ({
  useThemeStore: Object.assign(
    vi.fn(() => ({ customThemes: [] })),
    {
      getState: vi.fn(() => ({
        getActiveTheme: vi.fn(() => ({ id: "catppuccin-mocha", type: "dark" })),
        getAllThemes: vi.fn(() => []),
        customThemes: [],
      })),
      subscribe: vi.fn(() => () => {}),
    }
  ),
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
      isEditing: false,
      editContent: null,
      editDirty: false,
    });
    useGitDiffStore.getState().reset();
  });

  it("returns null when isOpen is false", () => {
    const { container } = renderWithSuspense(<FilePreviewPane />);
    expect(container.innerHTML).toBe("");
  });

  it("shows Forja branding with keyboard shortcuts when open but no file selected", () => {
    useFilePreviewStore.setState({
      isOpen: true,
      isLoading: false,
      currentFile: null,
      content: null,
      error: null,
    });
    renderWithSuspense(<FilePreviewPane />);
    const pane = screen.getByTestId("file-preview-pane");
    expect(pane).toBeInTheDocument();
    expect(screen.getByText("Forja")).toBeInTheDocument();
    expect(screen.getByText("A dedicated desktop client for vibe coders")).toBeInTheDocument();
    expect(screen.getByText("Quick open")).toBeInTheDocument();
    expect(screen.getByText("Command palette")).toBeInTheDocument();
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

  it("shows close button that clears file but keeps panel open", () => {
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
    expect(state.isOpen).toBe(true);
    expect(state.currentFile).toBeNull();
    expect(state.content).toBeNull();
  });

  it("clears the selected git diff when closing a diff preview", () => {
    useFilePreviewStore.setState({
      isOpen: true,
      currentFile: null,
      content: null,
      isLoading: false,
      error: null,
    });
    useGitDiffStore.setState({
      selectedProjectPath: "/repo",
      selectedPath: "src/file.ts",
      selectedDiff: {
        path: "src/file.ts",
        status: "M",
        patch: "diff --git a/src/file.ts b/src/file.ts",
        truncated: false,
        isBinary: false,
        originalContent: "const a = 1;",
        modifiedContent: "const a = 2;",
      },
      isLoadingDiff: false,
    });

    renderWithSuspense(<FilePreviewPane />);

    fireEvent.click(screen.getByLabelText("Close preview"));

    const previewState = useFilePreviewStore.getState();
    const diffState = useGitDiffStore.getState();

    expect(previewState.isOpen).toBe(true);
    expect(diffState.selectedDiff).toBeNull();
    expect(diffState.selectedProjectPath).toBeNull();
    expect(diffState.selectedPath).toBeNull();
    expect(screen.getByText("Forja")).toBeInTheDocument();
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

  it("shows Edit button for markdown files", () => {
    useFilePreviewStore.setState({
      isOpen: true,
      isLoading: false,
      currentFile: "/test/README.md",
      content: { path: "/test/README.md", content: "# Hello", size: 7 },
    });
    renderWithSuspense(<FilePreviewPane />);
    expect(screen.getByLabelText("Switch to edit")).toBeInTheDocument();
    expect(screen.getByText("Edit")).toBeInTheDocument();
  });

  it("switches markdown from preview to editor when Edit is clicked", async () => {
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

    fireEvent.click(screen.getByLabelText("Switch to edit"));

    expect(screen.queryByTestId("markdown-content")).not.toBeInTheDocument();
    expect(screen.getByText("Editing")).toBeInTheDocument();
  });

  it("switches markdown from editor back to preview when Preview is clicked", async () => {
    useFilePreviewStore.setState({
      isOpen: true,
      isLoading: false,
      isEditing: true,
      currentFile: "/test/README.md",
      content: { path: "/test/README.md", content: "# Hello", size: 7 },
    });
    renderWithSuspense(<FilePreviewPane />);

    expect(screen.getByLabelText("Switch to preview")).toBeInTheDocument();
    expect(screen.getByText("Preview")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Switch to preview"));

    await waitFor(() => {
      expect(screen.getByTestId("markdown-content")).toBeInTheDocument();
    });
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
