import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("monaco-editor", () => {
  const mockModel = { dispose: vi.fn(), getValue: vi.fn(() => ""), setValue: vi.fn() };
  const mockEditor = { dispose: vi.fn(), getModel: vi.fn(() => mockModel), layout: vi.fn() };
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
  };
});

vi.mock("@/lib/monaco-theme", () => ({
  catppuccinMochaTheme: { base: "vs-dark", inherit: true, rules: [], colors: {} },
  THEME_NAME: "catppuccin-mocha",
}));

import { GitDiffViewer } from "../git-diff-viewer";
import * as monaco from "monaco-editor";

describe("GitDiffViewer", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("renders Monaco diff editor when content is available", () => {
    render(
      <GitDiffViewer
        diff={{
          path: "src/a.ts",
          status: "M",
          patch: "",
          truncated: false,
          isBinary: false,
          originalContent: "old",
          modifiedContent: "new",
        }}
        mode="split"
        onModeChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("git-diff-viewer")).toBeInTheDocument();
    expect(monaco.editor.createDiffEditor).toHaveBeenCalled();
  });

  it("renders split/unified toggle buttons", () => {
    render(
      <GitDiffViewer
        diff={{
          path: "src/a.ts",
          status: "M",
          patch: "",
          truncated: false,
          isBinary: false,
          originalContent: "old",
          modifiedContent: "new",
        }}
        mode="split"
        onModeChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Split view" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unified view" })).toBeInTheDocument();
  });

  it("calls onModeChange when toggling", () => {
    const onModeChange = vi.fn();
    render(
      <GitDiffViewer
        diff={{
          path: "src/a.ts",
          status: "M",
          patch: "",
          truncated: false,
          isBinary: false,
          originalContent: "old",
          modifiedContent: "new",
        }}
        mode="split"
        onModeChange={onModeChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Unified view" }));
    expect(onModeChange).toHaveBeenCalledWith("unified");
  });

  it("shows binary message for binary files", () => {
    render(
      <GitDiffViewer
        diff={{
          path: "image.png",
          status: "M",
          patch: "",
          truncated: false,
          isBinary: true,
        }}
        mode="split"
        onModeChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/Binary file diff/)).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(
      <GitDiffViewer
        diff={null}
        mode="split"
        onModeChange={vi.fn()}
        isLoading
      />,
    );
    expect(screen.getByText("Loading diff...")).toBeInTheDocument();
  });

  it("shows no content message when originalContent/modifiedContent are missing", () => {
    render(
      <GitDiffViewer
        diff={{
          path: "src/a.ts",
          status: "M",
          patch: "some patch",
          truncated: false,
          isBinary: false,
        }}
        mode="split"
        onModeChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/No content available/)).toBeInTheDocument();
  });
});
