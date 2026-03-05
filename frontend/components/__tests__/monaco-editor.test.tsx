import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Mock monaco-editor BEFORE importing the component
vi.mock("monaco-editor", () => {
  const disposable = { dispose: vi.fn() };
  const mockModel = {
    dispose: vi.fn(),
    getValue: vi.fn(() => ""),
    setValue: vi.fn(),
  };
  const mockEditor = {
    getValue: vi.fn(() => "test content"),
    setValue: vi.fn(),
    dispose: vi.fn(),
    getModel: vi.fn(() => mockModel),
    onDidChangeModelContent: vi.fn(() => disposable),
    onDidDispose: vi.fn(() => disposable),
    layout: vi.fn(),
    updateOptions: vi.fn(),
    focus: vi.fn(),
    getAction: vi.fn(),
    addCommand: vi.fn(),
  };

  return {
    editor: {
      create: vi.fn(() => mockEditor),
      defineTheme: vi.fn(),
      setTheme: vi.fn(),
    },
    Uri: { parse: vi.fn((s: string) => s) },
    KeyMod: { CtrlCmd: 2048 },
    KeyCode: { KeyS: 49 },
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
}));

import { MonacoEditor } from "../monaco-editor";
import * as monaco from "monaco-editor";

describe("MonacoEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render a container div", () => {
    const { container } = render(
      <MonacoEditor value="hello" language="typescript" />
    );
    expect(
      container.querySelector("[data-testid='monaco-editor-container']")
    ).toBeInTheDocument();
  });

  it("should call monaco.editor.create on mount", () => {
    render(<MonacoEditor value="hello" language="typescript" />);
    expect(monaco.editor.create).toHaveBeenCalled();
  });

  it("should register the Catppuccin theme", () => {
    render(<MonacoEditor value="hello" language="json" />);
    expect(monaco.editor.defineTheme).toHaveBeenCalledWith(
      "catppuccin-mocha",
      expect.any(Object)
    );
  });

  it("should accept readOnly prop", () => {
    render(<MonacoEditor value="hello" language="json" readOnly />);
    expect(monaco.editor.create).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ readOnly: true })
    );
  });

  it("should accept className prop", () => {
    const { container } = render(
      <MonacoEditor value="hello" language="json" className="custom-class" />
    );
    const el = container.querySelector("[data-testid='monaco-editor-container']");
    expect(el).toHaveClass("custom-class");
  });

  it("should register onSave command when onSave prop provided", () => {
    const onSave = vi.fn();
    render(<MonacoEditor value="hello" language="json" onSave={onSave} />);
    const mockCreate = vi.mocked(monaco.editor.create);
    const editorInstance = mockCreate.mock.results[0]?.value;
    expect(editorInstance.addCommand).toHaveBeenCalled();
  });

  it("should register onChange listener when onChange prop provided", () => {
    const onChange = vi.fn();
    render(<MonacoEditor value="hello" language="json" onChange={onChange} />);
    const mockCreate = vi.mocked(monaco.editor.create);
    const editorInstance = mockCreate.mock.results[0]?.value;
    expect(editorInstance.onDidChangeModelContent).toHaveBeenCalled();
  });

  it("should dispose editor on unmount", () => {
    const { unmount } = render(
      <MonacoEditor value="hello" language="typescript" />
    );
    const mockCreate = vi.mocked(monaco.editor.create);
    const editorInstance = mockCreate.mock.results[0]?.value;
    unmount();
    expect(editorInstance.dispose).toHaveBeenCalled();
  });
});
