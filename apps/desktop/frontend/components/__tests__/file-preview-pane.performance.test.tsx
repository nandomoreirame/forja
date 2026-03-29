import { render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FilePreviewPane } from "../file-preview-pane";
import { useFilePreviewStore } from "@/stores/file-preview";
import { useGitDiffStore } from "@/stores/git-diff";

const mockMonacoCreate = vi.fn();
const mockMonacoCreateDiffEditor = vi.fn();

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn().mockResolvedValue({ isGitRepo: false, branch: null, fileStatus: null, changedFiles: 0 }),
  open: vi.fn(),
}));

vi.mock("monaco-editor", () => ({
  editor: {
    create: (...args: unknown[]) => mockMonacoCreate(...args),
    createDiffEditor: (...args: unknown[]) => mockMonacoCreateDiffEditor(...args),
    createModel: vi.fn(() => ({
      dispose: vi.fn(),
      getValue: vi.fn(() => ""),
      setValue: vi.fn(),
    })),
    defineTheme: vi.fn(),
    setTheme: vi.fn(),
  },
  Uri: { parse: vi.fn((value: string) => value) },
  KeyMod: { CtrlCmd: 2048 },
  KeyCode: { KeyS: 49 },
}));

vi.mock("@/lib/monaco-theme", () => ({
  getMonacoThemeName: vi.fn(() => "catppuccin-mocha"),
  getMonacoThemeData: vi.fn(() => ({ base: "vs-dark", inherit: true, rules: [], colors: {} })),
}));

vi.mock("@/stores/theme", () => ({
  useThemeStore: {
    subscribe: vi.fn(() => () => {}),
  },
}));

vi.mock("@/stores/user-settings", () => ({
  useUserSettingsStore: vi.fn((selector: (s: unknown) => unknown) =>
    selector({
      settings: {
        editor: {
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13,
          lineHeight: 1.5,
        },
      },
    }),
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

describe("FilePreviewPane performance guardrails", () => {
  beforeEach(() => {
    mockMonacoCreate.mockReset().mockReturnValue({
      getValue: vi.fn(() => ""),
      setValue: vi.fn(),
      dispose: vi.fn(),
      updateOptions: vi.fn(),
      getModel: vi.fn(() => ({
        getValue: vi.fn(() => ""),
        setValue: vi.fn(),
      })),
      onDidChangeModelContent: vi.fn(() => ({ dispose: vi.fn() })),
      onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
      addCommand: vi.fn(),
    });
    mockMonacoCreateDiffEditor.mockReset();

    useFilePreviewStore.setState({
      isOpen: true,
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

  it("does not instantiate Monaco for markdown preview", async () => {
    useFilePreviewStore.setState({
      isOpen: true,
      currentFile: "/test/README.md",
      content: { path: "/test/README.md", content: "# Hello", size: 7 },
    });

    renderWithSuspense(<FilePreviewPane />);

    expect(await screen.findByTestId("markdown-content")).toBeInTheDocument();
    expect(mockMonacoCreate).not.toHaveBeenCalled();
  });

  it("does not instantiate Monaco for image preview", () => {
    useFilePreviewStore.setState({
      isOpen: true,
      currentFile: "/test/photo.png",
      content: {
        path: "/test/photo.png",
        content: "abc123",
        size: 1024,
        encoding: "base64",
      },
    });

    renderWithSuspense(<FilePreviewPane />);

    expect(screen.getByRole("img")).toBeInTheDocument();
    expect(mockMonacoCreate).not.toHaveBeenCalled();
  });

  it("instantiates Monaco for code preview", async () => {
    useFilePreviewStore.setState({
      isOpen: true,
      currentFile: "/test/file.ts",
      content: { path: "/test/file.ts", content: "const x = 1;", size: 12 },
    });

    renderWithSuspense(<FilePreviewPane />);

    expect(await screen.findByTestId("monaco-editor-container")).toBeInTheDocument();
    expect(mockMonacoCreate).toHaveBeenCalledTimes(1);
  });
});
