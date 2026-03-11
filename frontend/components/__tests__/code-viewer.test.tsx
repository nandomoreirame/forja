import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

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
  return {
    editor: { create: vi.fn(() => mockEditor), defineTheme: vi.fn(), setTheme: vi.fn() },
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

import { CodeViewer } from "../code-viewer";
import * as monaco from "monaco-editor";

describe("CodeViewer", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("should render Monaco editor container", async () => {
    const { container } = render(<CodeViewer code="const x = 1;" filename="test.ts" />);
    await waitFor(() => {
      expect(container.querySelector("[data-testid='monaco-editor-container']")).toBeInTheDocument();
    });
  });

  it("should create editor in read-only mode", async () => {
    render(<CodeViewer code="const x = 1;" filename="test.ts" />);
    await waitFor(() => {
      expect(monaco.editor.create).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ readOnly: true })
      );
    });
  });

  it("should detect language from filename", async () => {
    render(<CodeViewer code="print('hello')" filename="main.py" />);
    await waitFor(() => {
      expect(monaco.editor.create).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ language: "python" })
      );
    });
  });

  it("should use plaintext for unknown extensions", async () => {
    render(<CodeViewer code="data" filename="file.xyz" />);
    await waitFor(() => {
      expect(monaco.editor.create).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ language: "plaintext" })
      );
    });
  });
});
