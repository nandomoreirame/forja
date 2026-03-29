import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("monaco-editor", () => {
  const mockModel = {
    dispose: vi.fn(),
    getValue: vi.fn(() => ""),
    setValue: vi.fn(),
  };

  const mockEditor = {
    dispose: vi.fn(),
    getModel: vi.fn(() => mockModel),
    layout: vi.fn(),
  };

  const mockDiffEditor = {
    getOriginalEditor: vi.fn(() => mockEditor),
    getModifiedEditor: vi.fn(() => mockEditor),
    dispose: vi.fn(),
    layout: vi.fn(),
    updateOptions: vi.fn(),
    setModel: vi.fn(),
  };

  return {
    editor: {
      create: vi.fn(() => mockEditor),
      createDiffEditor: vi.fn(() => mockDiffEditor),
      createModel: vi.fn((content: string, _lang: string) => ({
        ...mockModel,
        getValue: vi.fn(() => content),
      })),
      defineTheme: vi.fn(),
      setTheme: vi.fn(),
    },
    Uri: { parse: vi.fn((s: string) => s) },
  };
});

vi.mock("@/lib/monaco-theme", () => ({
  catppuccinMochaTheme: {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {},
  },
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

import { MonacoDiffEditor } from "../monaco-diff-editor";
import * as monaco from "monaco-editor";

describe("MonacoDiffEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render a container div", () => {
    const { container } = render(
      <MonacoDiffEditor
        original="const a = 1;"
        modified="const a = 2;"
        language="typescript"
      />
    );
    expect(
      container.querySelector("[data-testid='monaco-diff-container']")
    ).toBeInTheDocument();
  });

  it("should call createDiffEditor on mount", () => {
    render(
      <MonacoDiffEditor original="a" modified="b" language="json" />
    );
    expect(monaco.editor.createDiffEditor).toHaveBeenCalled();
  });

  it("should create two models (original and modified)", () => {
    render(
      <MonacoDiffEditor original="old" modified="new" language="typescript" />
    );
    expect(monaco.editor.createModel).toHaveBeenCalledTimes(2);
    expect(monaco.editor.createModel).toHaveBeenCalledWith("old", "typescript");
    expect(monaco.editor.createModel).toHaveBeenCalledWith("new", "typescript");
  });

  it("should pass renderSideBySide option", () => {
    render(
      <MonacoDiffEditor
        original="a"
        modified="b"
        language="json"
        renderSideBySide={false}
      />
    );
    expect(monaco.editor.createDiffEditor).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ renderSideBySide: false })
    );
  });

  it("should accept className prop", () => {
    const { container } = render(
      <MonacoDiffEditor
        original="a"
        modified="b"
        language="json"
        className="diff-custom"
      />
    );
    const el = container.querySelector("[data-testid='monaco-diff-container']");
    expect(el).toHaveClass("diff-custom");
  });

  it("should register the Catppuccin theme", () => {
    render(
      <MonacoDiffEditor original="a" modified="b" language="json" />
    );
    expect(monaco.editor.defineTheme).toHaveBeenCalledWith(
      "catppuccin-mocha",
      expect.any(Object)
    );
  });

  it("should dispose editor and models on unmount", () => {
    const { unmount } = render(
      <MonacoDiffEditor original="a" modified="b" language="json" />
    );
    const mockCreateDiff = vi.mocked(monaco.editor.createDiffEditor);
    const diffEditorInstance = mockCreateDiff.mock.results[0]?.value;
    unmount();
    expect(diffEditorInstance.dispose).toHaveBeenCalled();
  });
});
