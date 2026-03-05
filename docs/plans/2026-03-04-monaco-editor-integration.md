# Monaco Editor Integration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Shiki-based CodeViewer, textarea-based SettingsEditor, and custom GitDiffViewer with Monaco Editor for file preview (read-only), file editing, and diff viewing.

**Architecture:** Install `monaco-editor` as a direct dependency (no CDN). Create a shared `MonacoEditor` React wrapper component with read-only, editable, and diff modes. Configure Vite workers via `self.MonacoEnvironment.getWorker`. Update Electron CSP to allow `blob:` workers. Use Catppuccin Mocha theme to match existing design system.

**Tech Stack:** `monaco-editor` (ESM), React 19, Vite, Electron IPC, Zustand, Catppuccin Mocha theme

---

## Phase 1: Foundation (Monaco Setup)

### Task 1: Install Monaco Editor dependency

**Files:**
- Modify: `package.json`

**Step 1: Install monaco-editor**

Run: `pnpm add monaco-editor`

**Step 2: Verify installation**

Run: `ls node_modules/monaco-editor/esm/vs/editor/editor.worker.js`
Expected: File exists

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add monaco-editor dependency"
```

---

### Task 2: Configure Monaco Workers for Vite

**Files:**
- Create: `frontend/lib/monaco-workers.ts`
- Modify: `frontend/main.tsx` (import worker config at app entry)

**Step 1: Write the failing test**

Create: `frontend/lib/__tests__/monaco-workers.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("monaco-workers", () => {
  beforeEach(() => {
    vi.stubGlobal("self", { MonacoEnvironment: undefined });
  });

  it("should set self.MonacoEnvironment with getWorker function", async () => {
    await import("../monaco-workers");
    expect(self.MonacoEnvironment).toBeDefined();
    expect(typeof self.MonacoEnvironment!.getWorker).toBe("function");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run frontend/lib/__tests__/monaco-workers.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

Create: `frontend/lib/monaco-workers.ts`

```typescript
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === "json") {
      return new jsonWorker();
    }
    if (label === "css" || label === "scss" || label === "less") {
      return new cssWorker();
    }
    if (label === "html" || label === "handlebars" || label === "razor") {
      return new htmlWorker();
    }
    if (label === "typescript" || label === "javascript") {
      return new tsWorker();
    }
    return new editorWorker();
  },
};
```

**Step 4: Import at app entry point**

Modify: `frontend/main.tsx` - add at the top (before React imports):

```typescript
import "./lib/monaco-workers";
```

**Step 5: Run test to verify it passes**

Run: `pnpm vitest run frontend/lib/__tests__/monaco-workers.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add frontend/lib/monaco-workers.ts frontend/lib/__tests__/monaco-workers.test.ts frontend/main.tsx
git commit -m "feat: configure Monaco Editor web workers for Vite"
```

---

### Task 3: Update Electron CSP for Monaco Workers

**Files:**
- Modify: `electron/main.ts` (CSP header, around line 135-148)
- Modify: `electron/__tests__/main.test.ts` (if CSP tests exist)

**Step 1: Write the failing test**

Check if there's an existing CSP test. If not, this is a manual verification step.

The CSP change is:
- Add `worker-src 'self' blob:;` to allow Monaco's blob: workers
- Add `blob:` to `script-src` as fallback for browsers that don't support `worker-src`

**Step 2: Update CSP in electron/main.ts**

Find the CSP string (around line 135-148) and update:

```typescript
"Content-Security-Policy": [
  "default-src 'self'; " +
  "script-src 'self' 'wasm-unsafe-eval' blob:; " +
  "worker-src 'self' blob:; " +
  "style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data: blob:; " +
  "font-src 'self' data:; " +
  "connect-src 'self';"
]
```

**Step 3: Verify existing tests still pass**

Run: `pnpm vitest run electron/__tests__/`
Expected: All PASS

**Step 4: Commit**

```bash
git add electron/main.ts
git commit -m "feat: update CSP to allow Monaco Editor blob workers"
```

---

### Task 4: Create Catppuccin Mocha theme for Monaco

**Files:**
- Create: `frontend/lib/monaco-theme.ts`
- Create: `frontend/lib/__tests__/monaco-theme.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { catppuccinMochaTheme } from "../monaco-theme";

describe("monaco-theme", () => {
  it("should export a valid Monaco theme definition", () => {
    expect(catppuccinMochaTheme).toBeDefined();
    expect(catppuccinMochaTheme.base).toBe("vs-dark");
    expect(catppuccinMochaTheme.inherit).toBe(true);
    expect(catppuccinMochaTheme.rules).toBeInstanceOf(Array);
    expect(catppuccinMochaTheme.colors).toBeDefined();
  });

  it("should use Catppuccin Mocha background color", () => {
    expect(catppuccinMochaTheme.colors["editor.background"]).toBe("#1e1e2e");
  });

  it("should use Catppuccin Mocha text color", () => {
    expect(catppuccinMochaTheme.colors["editor.foreground"]).toBe("#cdd6f4");
  });

  it("should use Catppuccin Mocha selection color", () => {
    expect(catppuccinMochaTheme.colors["editor.selectionBackground"]).toBe(
      "#585b7066"
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run frontend/lib/__tests__/monaco-theme.test.ts`
Expected: FAIL

**Step 3: Write implementation**

Create: `frontend/lib/monaco-theme.ts`

```typescript
import type * as monaco from "monaco-editor";

export const THEME_NAME = "catppuccin-mocha";

export const catppuccinMochaTheme: monaco.editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "", foreground: "cdd6f4" },
    { token: "comment", foreground: "6c7086", fontStyle: "italic" },
    { token: "keyword", foreground: "cba6f7" },
    { token: "string", foreground: "a6e3a1" },
    { token: "number", foreground: "fab387" },
    { token: "regexp", foreground: "f5c2e7" },
    { token: "type", foreground: "f9e2af" },
    { token: "class", foreground: "f9e2af" },
    { token: "function", foreground: "89b4fa" },
    { token: "variable", foreground: "cdd6f4" },
    { token: "variable.predefined", foreground: "f38ba8" },
    { token: "constant", foreground: "fab387" },
    { token: "operator", foreground: "89dceb" },
    { token: "tag", foreground: "cba6f7" },
    { token: "attribute.name", foreground: "f9e2af" },
    { token: "attribute.value", foreground: "a6e3a1" },
    { token: "delimiter", foreground: "9399b2" },
    { token: "delimiter.bracket", foreground: "9399b2" },
    { token: "meta", foreground: "f5c2e7" },
  ],
  colors: {
    "editor.background": "#1e1e2e",
    "editor.foreground": "#cdd6f4",
    "editor.lineHighlightBackground": "#313244",
    "editor.selectionBackground": "#585b7066",
    "editor.inactiveSelectionBackground": "#585b7033",
    "editorCursor.foreground": "#f5e0dc",
    "editorWhitespace.foreground": "#585b7066",
    "editorIndentGuide.background": "#31324480",
    "editorIndentGuide.activeBackground": "#585b70",
    "editorLineNumber.foreground": "#6c7086",
    "editorLineNumber.activeForeground": "#cdd6f4",
    "editorBracketMatch.background": "#585b7033",
    "editorBracketMatch.border": "#585b70",
    "editorGutter.background": "#1e1e2e",
    "editorOverviewRuler.border": "#313244",
    "editorWidget.background": "#181825",
    "editorWidget.border": "#313244",
    "editorSuggestWidget.background": "#181825",
    "editorSuggestWidget.border": "#313244",
    "editorSuggestWidget.selectedBackground": "#313244",
    "editorHoverWidget.background": "#181825",
    "editorHoverWidget.border": "#313244",
    "input.background": "#313244",
    "input.border": "#45475a",
    "input.foreground": "#cdd6f4",
    "scrollbar.shadow": "#11111b",
    "scrollbarSlider.background": "#585b7066",
    "scrollbarSlider.hoverBackground": "#585b70",
    "scrollbarSlider.activeBackground": "#7f849c",
    "minimap.background": "#1e1e2e",
    "minimapSlider.background": "#585b7033",
    "minimapSlider.hoverBackground": "#585b7066",
    "diffEditor.insertedTextBackground": "#a6e3a120",
    "diffEditor.removedTextBackground": "#f38ba820",
    "diffEditor.insertedLineBackground": "#a6e3a110",
    "diffEditor.removedLineBackground": "#f38ba810",
  },
};
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run frontend/lib/__tests__/monaco-theme.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/lib/monaco-theme.ts frontend/lib/__tests__/monaco-theme.test.ts
git commit -m "feat: add Catppuccin Mocha theme for Monaco Editor"
```

---

### Task 5: Create MonacoEditor React wrapper component

**Files:**
- Create: `frontend/components/monaco-editor.tsx`
- Create: `frontend/components/__tests__/monaco-editor.test.tsx`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Mock monaco-editor
vi.mock("monaco-editor", () => {
  const mockEditor = {
    getValue: vi.fn(() => "test content"),
    setValue: vi.fn(),
    dispose: vi.fn(),
    getModel: vi.fn(() => ({
      dispose: vi.fn(),
    })),
    onDidChangeModelContent: vi.fn(() => ({ dispose: vi.fn() })),
    layout: vi.fn(),
    updateOptions: vi.fn(),
    focus: vi.fn(),
    getAction: vi.fn(),
    addCommand: vi.fn(),
  };

  const mockDiffEditor = {
    getOriginalEditor: vi.fn(() => mockEditor),
    getModifiedEditor: vi.fn(() => mockEditor),
    dispose: vi.fn(),
    layout: vi.fn(),
    updateOptions: vi.fn(),
  };

  return {
    editor: {
      create: vi.fn(() => mockEditor),
      createDiffEditor: vi.fn(() => mockDiffEditor),
      createModel: vi.fn((content: string, lang: string) => ({
        dispose: vi.fn(),
        getValue: vi.fn(() => content),
      })),
      defineTheme: vi.fn(),
      setTheme: vi.fn(),
    },
    Uri: {
      parse: vi.fn((s: string) => s),
    },
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

describe("MonacoEditor", () => {
  it("should render a container div", () => {
    const { container } = render(
      <MonacoEditor value="hello" language="typescript" />
    );
    expect(container.querySelector("[data-testid='monaco-editor-container']")).toBeInTheDocument();
  });

  it("should accept readOnly prop", () => {
    const { container } = render(
      <MonacoEditor value="hello" language="json" readOnly />
    );
    expect(container.querySelector("[data-testid='monaco-editor-container']")).toBeInTheDocument();
  });

  it("should accept className prop", () => {
    const { container } = render(
      <MonacoEditor value="hello" language="json" className="custom-class" />
    );
    const el = container.querySelector("[data-testid='monaco-editor-container']");
    expect(el).toHaveClass("custom-class");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run frontend/components/__tests__/monaco-editor.test.tsx`
Expected: FAIL - component not found

**Step 3: Write implementation**

Create: `frontend/components/monaco-editor.tsx`

```tsx
import { useRef, useEffect, useCallback } from "react";
import * as monaco from "monaco-editor";
import { catppuccinMochaTheme, THEME_NAME } from "@/lib/monaco-theme";

let themeRegistered = false;

function ensureTheme() {
  if (!themeRegistered) {
    monaco.editor.defineTheme(THEME_NAME, catppuccinMochaTheme);
    themeRegistered = true;
  }
}

export interface MonacoEditorProps {
  value: string;
  language?: string;
  readOnly?: boolean;
  className?: string;
  onChange?: (value: string) => void;
  onSave?: (value: string) => void;
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
}

export function MonacoEditor({
  value,
  language = "plaintext",
  readOnly = false,
  className,
  onChange,
  onSave,
  options,
}: MonacoEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!containerRef.current) return;

    ensureTheme();

    const editor = monaco.editor.create(containerRef.current, {
      value,
      language,
      theme: THEME_NAME,
      readOnly,
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
      lineNumbers: readOnly ? "off" : "on",
      renderLineHighlight: readOnly ? "none" : "line",
      folding: !readOnly,
      wordWrap: "on",
      padding: { top: 8, bottom: 8 },
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      overviewRulerBorder: false,
      scrollbar: {
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8,
      },
      ...options,
    });

    editorRef.current = editor;

    if (!readOnly && onChange) {
      const disposable = editor.onDidChangeModelContent(() => {
        const currentValue = editor.getValue();
        onChange(currentValue);
      });

      editor.onDidDispose(() => disposable.dispose());
    }

    if (onSave) {
      editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
        () => {
          onSave(editor.getValue());
        }
      );
    }

    return () => {
      editor.dispose();
      editorRef.current = null;
    };
  }, [language, readOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (model && model.getValue() !== value) {
      editor.setValue(value);
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      data-testid="monaco-editor-container"
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run frontend/components/__tests__/monaco-editor.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/components/monaco-editor.tsx frontend/components/__tests__/monaco-editor.test.tsx
git commit -m "feat: create MonacoEditor React wrapper component"
```

---

### Task 6: Create MonacoDiffEditor React wrapper component

**Files:**
- Create: `frontend/components/monaco-diff-editor.tsx`
- Create: `frontend/components/__tests__/monaco-diff-editor.test.tsx`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("monaco-editor", () => {
  const mockEditor = {
    dispose: vi.fn(),
    getModel: vi.fn(() => ({ dispose: vi.fn() })),
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
      createModel: vi.fn((content: string, lang: string) => ({
        dispose: vi.fn(),
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
}));

import { MonacoDiffEditor } from "../monaco-diff-editor";

describe("MonacoDiffEditor", () => {
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

  it("should accept renderSideBySide prop", () => {
    const { container } = render(
      <MonacoDiffEditor
        original="a"
        modified="b"
        language="json"
        renderSideBySide={false}
      />
    );
    expect(
      container.querySelector("[data-testid='monaco-diff-container']")
    ).toBeInTheDocument();
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
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run frontend/components/__tests__/monaco-diff-editor.test.tsx`
Expected: FAIL

**Step 3: Write implementation**

Create: `frontend/components/monaco-diff-editor.tsx`

```tsx
import { useRef, useEffect } from "react";
import * as monaco from "monaco-editor";
import { catppuccinMochaTheme, THEME_NAME } from "@/lib/monaco-theme";

let themeRegistered = false;

function ensureTheme() {
  if (!themeRegistered) {
    monaco.editor.defineTheme(THEME_NAME, catppuccinMochaTheme);
    themeRegistered = true;
  }
}

export interface MonacoDiffEditorProps {
  original: string;
  modified: string;
  language?: string;
  renderSideBySide?: boolean;
  className?: string;
  options?: monaco.editor.IDiffEditorConstructionOptions;
}

export function MonacoDiffEditor({
  original,
  modified,
  language = "plaintext",
  renderSideBySide = true,
  className,
  options,
}: MonacoDiffEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  const modelsRef = useRef<{
    original: monaco.editor.ITextModel;
    modified: monaco.editor.ITextModel;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    ensureTheme();

    const diffEditor = monaco.editor.createDiffEditor(containerRef.current, {
      theme: THEME_NAME,
      automaticLayout: true,
      readOnly: true,
      renderSideBySide,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
      overviewRulerLanes: 0,
      scrollbar: {
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8,
      },
      ...options,
    });

    const originalModel = monaco.editor.createModel(original, language);
    const modifiedModel = monaco.editor.createModel(modified, language);

    diffEditor.setModel({
      original: originalModel,
      modified: modifiedModel,
    });

    editorRef.current = diffEditor;
    modelsRef.current = { original: originalModel, modified: modifiedModel };

    return () => {
      diffEditor.dispose();
      originalModel.dispose();
      modifiedModel.dispose();
      editorRef.current = null;
      modelsRef.current = null;
    };
  }, [language, renderSideBySide]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!modelsRef.current) return;
    const { original: origModel, modified: modModel } = modelsRef.current;
    if (origModel.getValue() !== original) {
      origModel.setValue(original);
    }
    if (modModel.getValue() !== modified) {
      modModel.setValue(modified);
    }
  }, [original, modified]);

  return (
    <div
      ref={containerRef}
      data-testid="monaco-diff-container"
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run frontend/components/__tests__/monaco-diff-editor.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/components/monaco-diff-editor.tsx frontend/components/__tests__/monaco-diff-editor.test.tsx
git commit -m "feat: create MonacoDiffEditor React wrapper component"
```

---

## Phase 2: File Preview (Read-Only Monaco)

### Task 7: Replace CodeViewer with Monaco read-only editor

**Files:**
- Modify: `frontend/components/code-viewer.tsx`
- Modify: `frontend/components/__tests__/code-viewer.test.tsx`

**Step 1: Update existing tests**

The existing `code-viewer.test.tsx` likely tests the Shiki-based component. Update mocks to use Monaco instead:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("monaco-editor", () => {
  const mockEditor = {
    getValue: vi.fn(() => ""),
    setValue: vi.fn(),
    dispose: vi.fn(),
    getModel: vi.fn(() => ({ dispose: vi.fn() })),
    onDidChangeModelContent: vi.fn(() => ({ dispose: vi.fn() })),
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
  catppuccinMochaTheme: { base: "vs-dark", inherit: true, rules: [], colors: {} },
  THEME_NAME: "catppuccin-mocha",
}));

import CodeViewer from "../code-viewer";

describe("CodeViewer", () => {
  it("should render Monaco editor in read-only mode", () => {
    const { container } = render(
      <CodeViewer content="const x = 1;" language="typescript" />
    );
    expect(
      container.querySelector("[data-testid='monaco-editor-container']")
    ).toBeInTheDocument();
  });

  it("should handle empty content", () => {
    const { container } = render(<CodeViewer content="" language="plaintext" />);
    expect(
      container.querySelector("[data-testid='monaco-editor-container']")
    ).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run frontend/components/__tests__/code-viewer.test.tsx`
Expected: FAIL (old component doesn't use Monaco)

**Step 3: Replace CodeViewer implementation**

Modify: `frontend/components/code-viewer.tsx`

```tsx
import { memo } from "react";
import { MonacoEditor } from "./monaco-editor";

interface CodeViewerProps {
  content: string;
  language: string;
}

function CodeViewerComponent({ content, language }: CodeViewerProps) {
  return (
    <MonacoEditor
      value={content}
      language={mapLanguage(language)}
      readOnly
      className="h-full w-full"
    />
  );
}

function mapLanguage(language: string): string {
  const languageMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    rb: "ruby",
    rs: "rust",
    yml: "yaml",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    fish: "shell",
    md: "markdown",
    mdx: "markdown",
    htm: "html",
    svelte: "html",
    vue: "html",
    sass: "scss",
    styl: "css",
  };
  return languageMap[language] || language;
}

const CodeViewer = memo(CodeViewerComponent);
export default CodeViewer;
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run frontend/components/__tests__/code-viewer.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/components/code-viewer.tsx frontend/components/__tests__/code-viewer.test.tsx
git commit -m "refactor: replace Shiki-based CodeViewer with Monaco read-only editor"
```

---

### Task 8: Update FilePreviewPane to pass correct language to CodeViewer

**Files:**
- Modify: `frontend/components/file-preview-pane.tsx`
- Modify: `frontend/components/__tests__/file-preview-pane.test.tsx`

**Step 1: Verify existing FilePreviewPane tests still pass**

Run: `pnpm vitest run frontend/components/__tests__/file-preview-pane.test.tsx`

If any tests reference Shiki mocks, update them to Monaco mocks. The `file-preview-pane.tsx` uses `CodeViewer` which now uses Monaco internally, so the FilePreviewPane itself shouldn't need changes unless it passes props that changed.

**Step 2: Update language detection in FilePreviewPane**

Check that `file-preview-pane.tsx` uses the `detectLanguage` function from `use-syntax-highlighter.ts`. Create a standalone `detectLanguage` utility if needed:

Create: `frontend/lib/detect-language.ts`

```typescript
const extensionMap: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  jsonc: "json",
  py: "python",
  rb: "ruby",
  rs: "rust",
  go: "go",
  java: "java",
  kt: "kotlin",
  scala: "scala",
  swift: "swift",
  c: "c",
  cpp: "cpp",
  h: "c",
  hpp: "cpp",
  cs: "csharp",
  php: "php",
  html: "html",
  htm: "html",
  css: "css",
  scss: "scss",
  sass: "scss",
  less: "less",
  xml: "xml",
  svg: "xml",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  md: "markdown",
  mdx: "markdown",
  sql: "sql",
  graphql: "graphql",
  gql: "graphql",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  fish: "shell",
  dockerfile: "dockerfile",
  makefile: "makefile",
  vue: "html",
  svelte: "html",
  lua: "lua",
  r: "r",
  dart: "dart",
  zig: "zig",
  ini: "ini",
  conf: "ini",
  env: "ini",
};

export function detectLanguage(filename: string): string {
  const lower = filename.toLowerCase();
  const basename = lower.split("/").pop() || lower;

  if (basename === "dockerfile" || basename.startsWith("dockerfile.")) {
    return "dockerfile";
  }
  if (basename === "makefile" || basename === "gnumakefile") {
    return "makefile";
  }

  const ext = basename.split(".").pop() || "";
  return extensionMap[ext] || "plaintext";
}
```

Create test: `frontend/lib/__tests__/detect-language.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { detectLanguage } from "../detect-language";

describe("detectLanguage", () => {
  it("should detect TypeScript files", () => {
    expect(detectLanguage("app.ts")).toBe("typescript");
    expect(detectLanguage("component.tsx")).toBe("typescript");
  });

  it("should detect JavaScript files", () => {
    expect(detectLanguage("index.js")).toBe("javascript");
    expect(detectLanguage("config.mjs")).toBe("javascript");
  });

  it("should detect JSON files", () => {
    expect(detectLanguage("package.json")).toBe("json");
  });

  it("should detect Dockerfile", () => {
    expect(detectLanguage("Dockerfile")).toBe("dockerfile");
    expect(detectLanguage("Dockerfile.prod")).toBe("dockerfile");
  });

  it("should detect Makefile", () => {
    expect(detectLanguage("Makefile")).toBe("makefile");
  });

  it("should return plaintext for unknown extensions", () => {
    expect(detectLanguage("readme.xyz")).toBe("plaintext");
  });

  it("should handle path with directories", () => {
    expect(detectLanguage("src/components/app.tsx")).toBe("typescript");
  });
});
```

**Step 3: Run tests**

Run: `pnpm vitest run frontend/lib/__tests__/detect-language.test.ts frontend/components/__tests__/file-preview-pane.test.tsx`
Expected: PASS

**Step 4: Commit**

```bash
git add frontend/lib/detect-language.ts frontend/lib/__tests__/detect-language.test.ts frontend/components/file-preview-pane.tsx frontend/components/__tests__/file-preview-pane.test.tsx
git commit -m "refactor: extract language detection into standalone utility"
```

---

## Phase 3: File Editing

### Task 9: Add file write IPC handler to Electron backend

**Files:**
- Modify: `electron/main.ts` (add `write_file` handler)
- Create: `electron/file-writer.ts`
- Create: `electron/__tests__/file-writer.test.ts`

**Step 1: Write the failing test**

Create: `electron/__tests__/file-writer.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { writeFile } from "../file-writer";
import * as fs from "node:fs/promises";
import * as path from "node:path";

vi.mock("node:fs/promises");

describe("file-writer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should write content to the specified file", async () => {
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);

    await writeFile("/home/user/project/test.ts", "const x = 1;");

    expect(fs.writeFile).toHaveBeenCalledWith(
      "/home/user/project/test.ts",
      "const x = 1;",
      "utf-8"
    );
  });

  it("should reject paths with directory traversal", async () => {
    await expect(
      writeFile("/home/user/../../../etc/passwd", "malicious")
    ).rejects.toThrow();
  });

  it("should reject empty content writes to system files", async () => {
    await expect(writeFile("/etc/hosts", "")).rejects.toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run electron/__tests__/file-writer.test.ts`
Expected: FAIL

**Step 3: Write implementation**

Create: `electron/file-writer.ts`

```typescript
import * as fs from "node:fs/promises";
import * as path from "node:path";

const FORBIDDEN_PREFIXES = ["/etc", "/usr", "/bin", "/sbin", "/var", "/sys", "/proc"];

export async function writeFile(filePath: string, content: string): Promise<void> {
  const resolved = path.resolve(filePath);
  const normalized = path.normalize(resolved);

  if (normalized !== resolved) {
    throw new Error(`Path traversal detected: ${filePath}`);
  }

  for (const prefix of FORBIDDEN_PREFIXES) {
    if (normalized.startsWith(prefix + "/") || normalized === prefix) {
      throw new Error(`Cannot write to system path: ${normalized}`);
    }
  }

  await fs.writeFile(normalized, content, "utf-8");
}
```

**Step 4: Register IPC handler in electron/main.ts**

Add to `electron/main.ts` alongside other `ipcMain.handle` calls:

```typescript
import { writeFile } from "./file-writer";

ipcMain.handle(
  "write_file",
  async (_event, args: { path: string; content: string }) => {
    await writeFile(args.path, args.content);
    return { success: true };
  }
);
```

**Step 5: Run tests**

Run: `pnpm vitest run electron/__tests__/file-writer.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add electron/file-writer.ts electron/__tests__/file-writer.test.ts electron/main.ts
git commit -m "feat: add write_file IPC handler for file editing support"
```

---

### Task 10: Replace SettingsEditor with Monaco-based editor

**Files:**
- Modify: `frontend/components/settings-editor.tsx`
- Modify: `frontend/components/__tests__/settings-editor.test.tsx`
- Modify: `frontend/stores/user-settings.ts` (minor: no changes needed, just verify)

**Step 1: Update the test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("monaco-editor", () => {
  const mockEditor = {
    getValue: vi.fn(() => '{ "font": "mono" }'),
    setValue: vi.fn(),
    dispose: vi.fn(),
    getModel: vi.fn(() => ({ dispose: vi.fn(), getValue: vi.fn(() => "") })),
    onDidChangeModelContent: vi.fn(() => ({ dispose: vi.fn() })),
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
  catppuccinMochaTheme: { base: "vs-dark", inherit: true, rules: [], colors: {} },
  THEME_NAME: "catppuccin-mocha",
}));

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(),
}));

import { useUserSettingsStore } from "@/stores/user-settings";
import { SettingsEditor } from "../settings-editor";

describe("SettingsEditor", () => {
  beforeEach(() => {
    useUserSettingsStore.setState({
      editorOpen: true,
      editorContent: '{ "fontSize": 14 }',
      editorDirty: false,
      editorError: null,
    });
  });

  it("should render with Monaco editor", () => {
    const { container } = render(<SettingsEditor />);
    expect(
      container.querySelector("[data-testid='monaco-editor-container']")
    ).toBeInTheDocument();
  });

  it("should show settings header", () => {
    render(<SettingsEditor />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("should show close button", () => {
    render(<SettingsEditor />);
    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run frontend/components/__tests__/settings-editor.test.tsx`
Expected: FAIL

**Step 3: Rewrite SettingsEditor**

Modify: `frontend/components/settings-editor.tsx`

```tsx
import { useCallback } from "react";
import { X } from "lucide-react";
import { MonacoEditor } from "./monaco-editor";
import { useUserSettingsStore } from "@/stores/user-settings";

export function SettingsEditor() {
  const {
    editorContent,
    editorDirty,
    editorError,
    setEditorContent,
    saveEditorContent,
    closeSettingsEditor,
  } = useUserSettingsStore();

  const handleChange = useCallback(
    (value: string) => {
      setEditorContent(value);
    },
    [setEditorContent]
  );

  const handleSave = useCallback(
    (value: string) => {
      setEditorContent(value);
      saveEditorContent();
    },
    [setEditorContent, saveEditorContent]
  );

  return (
    <div className="flex h-full flex-col bg-ctp-base">
      {/* Header */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-ctp-surface0 px-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-ctp-text">Settings</span>
          <span className="rounded bg-ctp-surface0 px-1.5 py-0.5 text-[10px] text-ctp-subtext0">
            JSON
          </span>
        </div>
        <button
          onClick={closeSettingsEditor}
          className="flex h-6 w-6 items-center justify-center rounded text-ctp-overlay1 hover:bg-ctp-surface0 hover:text-ctp-text"
          aria-label="Close settings"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          value={editorContent}
          language="json"
          onChange={handleChange}
          onSave={handleSave}
          options={{
            lineNumbers: "on",
            folding: true,
            formatOnPaste: true,
            formatOnType: true,
          }}
        />
      </div>

      {/* Status bar */}
      <div className="flex h-6 shrink-0 items-center justify-between border-t border-ctp-surface0 px-3">
        <div className="flex items-center gap-2">
          {editorError && (
            <span className="text-[10px] text-ctp-red">{editorError}</span>
          )}
          {editorDirty && !editorError && (
            <span className="text-[10px] text-ctp-yellow">Unsaved changes</span>
          )}
          {!editorDirty && !editorError && (
            <span className="text-[10px] text-ctp-subtext0">Saved</span>
          )}
        </div>
        <span className="text-[10px] text-ctp-overlay0">Ctrl+S to save</span>
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run frontend/components/__tests__/settings-editor.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/components/settings-editor.tsx frontend/components/__tests__/settings-editor.test.tsx
git commit -m "refactor: replace textarea-based SettingsEditor with Monaco Editor"
```

---

### Task 11: Add general file edit mode to FilePreviewPane

**Files:**
- Modify: `frontend/stores/file-preview.ts` (add `isEditing`, `editContent`, `setEditing`, `saveFile`)
- Modify: `frontend/components/file-preview-pane.tsx` (add edit button + toggle)
- Create: `frontend/components/__tests__/file-preview-edit.test.tsx`

**Step 1: Write the failing test for store changes**

Create: `frontend/stores/__tests__/file-preview-edit.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(),
}));

import { useFilePreviewStore } from "../file-preview";
import { invoke } from "@/lib/ipc";

describe("file-preview store - edit mode", () => {
  beforeEach(() => {
    useFilePreviewStore.setState({
      isOpen: true,
      currentFile: "/project/test.ts",
      content: {
        path: "/project/test.ts",
        content: "const x = 1;",
        size: 12,
      },
      isEditing: false,
      editContent: null,
      editDirty: false,
    });
  });

  it("should toggle edit mode on", () => {
    useFilePreviewStore.getState().setEditing(true);
    const state = useFilePreviewStore.getState();
    expect(state.isEditing).toBe(true);
    expect(state.editContent).toBe("const x = 1;");
  });

  it("should toggle edit mode off", () => {
    useFilePreviewStore.getState().setEditing(true);
    useFilePreviewStore.getState().setEditing(false);
    const state = useFilePreviewStore.getState();
    expect(state.isEditing).toBe(false);
    expect(state.editContent).toBeNull();
  });

  it("should track edit content changes", () => {
    useFilePreviewStore.getState().setEditing(true);
    useFilePreviewStore.getState().setEditContent("const x = 2;");
    const state = useFilePreviewStore.getState();
    expect(state.editContent).toBe("const x = 2;");
    expect(state.editDirty).toBe(true);
  });

  it("should save file via IPC", async () => {
    vi.mocked(invoke).mockResolvedValue({ success: true });
    useFilePreviewStore.getState().setEditing(true);
    useFilePreviewStore.getState().setEditContent("const x = 2;");
    await useFilePreviewStore.getState().saveFile();
    expect(invoke).toHaveBeenCalledWith("write_file", {
      path: "/project/test.ts",
      content: "const x = 2;",
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run frontend/stores/__tests__/file-preview-edit.test.ts`
Expected: FAIL

**Step 3: Update the store**

Add to `frontend/stores/file-preview.ts`:

```typescript
// Add to the interface:
isEditing: boolean;
editContent: string | null;
editDirty: boolean;
setEditing: (editing: boolean) => void;
setEditContent: (content: string) => void;
saveFile: () => Promise<void>;

// Add to the store create:
isEditing: false,
editContent: null,
editDirty: false,

setEditing: (editing) =>
  set((state) => ({
    isEditing: editing,
    editContent: editing ? state.content?.content ?? null : null,
    editDirty: false,
  })),

setEditContent: (content) =>
  set({ editContent: content, editDirty: true }),

saveFile: async () => {
  const { currentFile, editContent } = get();
  if (!currentFile || editContent === null) return;
  await invoke("write_file", { path: currentFile, content: editContent });
  set((state) => ({
    editDirty: false,
    content: state.content
      ? { ...state.content, content: editContent, size: editContent.length }
      : null,
  }));
},
```

**Step 4: Update FilePreviewPane to support edit mode**

In `frontend/components/file-preview-pane.tsx`, add an edit button to the header and conditionally render `MonacoEditor` in editable mode when `isEditing` is true:

```tsx
// In the header area, add edit/preview toggle button:
import { Pencil, Eye } from "lucide-react";

// In the content rendering logic:
if (isEditing && !isImage && !isMarkdown) {
  return (
    <MonacoEditor
      value={editContent ?? content.content}
      language={detectLanguage(currentFile)}
      onChange={(value) => setEditContent(value)}
      onSave={(value) => {
        setEditContent(value);
        saveFile();
      }}
      className="h-full w-full"
    />
  );
}
```

**Step 5: Run tests**

Run: `pnpm vitest run frontend/stores/__tests__/file-preview-edit.test.ts frontend/components/__tests__/file-preview-pane.test.tsx`
Expected: PASS

**Step 6: Commit**

```bash
git add frontend/stores/file-preview.ts frontend/stores/__tests__/file-preview-edit.test.ts frontend/components/file-preview-pane.tsx frontend/components/__tests__/file-preview-pane.test.tsx
git commit -m "feat: add file edit mode with Monaco Editor in FilePreviewPane"
```

---

## Phase 4: Diff View with Monaco

### Task 12: Integrate MonacoDiffEditor into GitDiffViewer

**Files:**
- Modify: `frontend/components/git-diff-viewer.tsx`
- Modify: `frontend/components/__tests__/git-diff-viewer.test.tsx`

**Step 1: Write the failing test**

Update `frontend/components/__tests__/git-diff-viewer.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("monaco-editor", () => {
  const mockEditor = {
    dispose: vi.fn(),
    getModel: vi.fn(() => ({ dispose: vi.fn() })),
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
      createModel: vi.fn((content: string) => ({
        dispose: vi.fn(),
        getValue: vi.fn(() => content),
        setValue: vi.fn(),
      })),
      defineTheme: vi.fn(),
      setTheme: vi.fn(),
    },
    Uri: { parse: vi.fn((s: string) => s) },
  };
});

vi.mock("@/lib/monaco-theme", () => ({
  catppuccinMochaTheme: { base: "vs-dark", inherit: true, rules: [], colors: {} },
  THEME_NAME: "catppuccin-mocha",
}));

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(),
}));

import { useGitDiffStore } from "@/stores/git-diff";
import GitDiffViewer from "../git-diff-viewer";

describe("GitDiffViewer", () => {
  it("should render Monaco diff editor when original and modified content are available", () => {
    useGitDiffStore.setState({
      selectedDiff: {
        path: "test.ts",
        status: "modified",
        patch: "--- a/test.ts\n+++ b/test.ts\n@@ -1 +1 @@\n-old\n+new",
        truncated: false,
        isBinary: false,
        originalContent: "old",
        modifiedContent: "new",
      },
    });

    const { container } = render(<GitDiffViewer />);
    expect(
      container.querySelector("[data-testid='monaco-diff-container']")
    ).toBeInTheDocument();
  });

  it("should show side-by-side toggle", () => {
    useGitDiffStore.setState({
      selectedDiff: {
        path: "test.ts",
        status: "modified",
        patch: "diff",
        truncated: false,
        isBinary: false,
        originalContent: "old",
        modifiedContent: "new",
      },
    });

    render(<GitDiffViewer />);
    expect(screen.getByText(/split/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run frontend/components/__tests__/git-diff-viewer.test.tsx`
Expected: FAIL

**Step 3: Add original/modified content to git diff backend**

To use Monaco's diff editor, we need the full original and modified file content (not just the patch). Add IPC handlers:

Modify: `electron/git-info.ts` - add function:

```typescript
export async function getFileContentAtHead(
  projectPath: string,
  relativePath: string
): Promise<string> {
  try {
    const { stdout } = await execAsync(
      `git show HEAD:${relativePath}`,
      { cwd: projectPath }
    );
    return stdout;
  } catch {
    return ""; // New file, no HEAD version
  }
}
```

Modify: `electron/main.ts` - add handler:

```typescript
ipcMain.handle(
  "get_git_file_content_at_head",
  async (_event, args: { path: string; relativePath: string }) => {
    return getFileContentAtHead(args.path, args.relativePath);
  }
);
```

**Step 4: Update git-diff store**

Add to `frontend/stores/git-diff.ts`:

```typescript
// Add to GitDiffResult interface:
originalContent?: string;
modifiedContent?: string;

// In selectChangedFile method, after fetching diff, also fetch contents:
const [originalContent, modifiedContent] = await Promise.all([
  invoke<string>("get_git_file_content_at_head", {
    path: projectPath,
    relativePath: file.path,
  }),
  invoke<{ content: string }>("read_file_command", {
    path: `${projectPath}/${file.path}`,
  }).then((r) => r.content),
]);
```

**Step 5: Rewrite GitDiffViewer**

Modify: `frontend/components/git-diff-viewer.tsx`

```tsx
import { useGitDiffStore } from "@/stores/git-diff";
import { MonacoDiffEditor } from "./monaco-diff-editor";
import { detectLanguage } from "@/lib/detect-language";
import { Columns2, Rows2 } from "lucide-react";

export default function GitDiffViewer() {
  const { selectedDiff, diffMode, setDiffMode } = useGitDiffStore();

  if (!selectedDiff) return null;

  const { path: filePath, originalContent, modifiedContent, isBinary } = selectedDiff;

  if (isBinary) {
    return (
      <div className="flex h-full items-center justify-center text-ctp-subtext0">
        Binary file diff not supported
      </div>
    );
  }

  const language = detectLanguage(filePath);
  const isSideBySide = diffMode === "split";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-ctp-surface0 px-3">
        <span className="text-xs text-ctp-subtext0">{filePath}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDiffMode(isSideBySide ? "unified" : "split")}
            className="flex h-6 items-center gap-1 rounded px-2 text-[10px] text-ctp-overlay1 hover:bg-ctp-surface0 hover:text-ctp-text"
            title={isSideBySide ? "Unified view" : "Split view"}
          >
            {isSideBySide ? (
              <Rows2 className="h-3 w-3" strokeWidth={1.5} />
            ) : (
              <Columns2 className="h-3 w-3" strokeWidth={1.5} />
            )}
            {isSideBySide ? "Unified" : "Split"}
          </button>
        </div>
      </div>

      {/* Diff Editor */}
      <div className="flex-1 overflow-hidden">
        <MonacoDiffEditor
          original={originalContent ?? ""}
          modified={modifiedContent ?? ""}
          language={language}
          renderSideBySide={isSideBySide}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
```

**Step 6: Run tests**

Run: `pnpm vitest run frontend/components/__tests__/git-diff-viewer.test.tsx`
Expected: PASS

**Step 7: Commit**

```bash
git add electron/git-info.ts electron/main.ts frontend/stores/git-diff.ts frontend/components/git-diff-viewer.tsx frontend/components/__tests__/git-diff-viewer.test.tsx
git commit -m "feat: replace custom GitDiffViewer with Monaco DiffEditor"
```

---

## Phase 5: Cleanup and Optimization

### Task 13: Add Monaco to Vite manual chunks

**Files:**
- Modify: `vite.config.ts`

**Step 1: Update manual chunks**

Add Monaco to the Vite chunk configuration:

```typescript
manualChunks: {
  "vendor-react": ["react", "react-dom"],
  "vendor-xterm": ["@xterm/xterm", "@xterm/addon-fit", "@xterm/addon-web-links", "@xterm/addon-webgl"],
  "vendor-monaco": ["monaco-editor"],
  "vendor-markdown": ["react-markdown", "remark-gfm"],
  "vendor-ui": [/* existing */],
},
```

Increase chunk warning limit if needed:

```typescript
chunkSizeWarningLimit: 1000,
```

**Step 2: Verify build works**

Run: `pnpm build`
Expected: Build succeeds, Monaco chunk created separately

**Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "chore: add Monaco Editor to Vite manual chunks"
```

---

### Task 14: Remove Shiki dependency (if no longer used)

**Files:**
- Modify: `package.json` (remove shiki)
- Delete: `frontend/hooks/use-syntax-highlighter.ts`
- Delete: `frontend/hooks/__tests__/use-syntax-highlighter.test.ts` (if exists)
- Modify: `frontend/components/markdown-renderer.tsx` (if it uses Shiki for code blocks)

**IMPORTANT:** Before removing Shiki, verify it's not used anywhere else:

Run: `grep -r "shiki\|useSyntaxHighlighter\|use-syntax-highlighter" --include="*.ts" --include="*.tsx" frontend/`

**Step 1: Check remaining Shiki usage**

If `markdown-renderer.tsx` uses Shiki for code blocks inside markdown, update it to use a simple `<pre>` block or integrate Monaco's `colorizeElement` API for inline highlighting.

**Step 2: Remove Shiki**

Run: `pnpm remove shiki`

**Step 3: Delete unused files**

Delete `frontend/hooks/use-syntax-highlighter.ts` and its test file.

**Step 4: Update any remaining imports**

Search for and remove any imports of `useSyntaxHighlighter` or `use-syntax-highlighter`.

**Step 5: Run full test suite**

Run: `pnpm test`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove Shiki dependency, replaced by Monaco Editor"
```

---

### Task 15: Integration testing and smoke test

**Files:**
- No new files - manual verification

**Step 1: Run the full test suite**

Run: `pnpm test`
Expected: All tests PASS

**Step 2: Run the build**

Run: `pnpm build`
Expected: Build succeeds without errors

**Step 3: Manual smoke test checklist**

Run: `pnpm dev`

1. [ ] Open a project in Forja
2. [ ] Click a TypeScript file in the file tree - should show Monaco read-only preview
3. [ ] Click a JSON file - should show Monaco read-only preview
4. [ ] Click a Python/Go/Rust file - should show correct syntax highlighting
5. [ ] Press Ctrl+, - Settings editor opens with Monaco (editable JSON)
6. [ ] Edit settings JSON, see "Unsaved changes" indicator
7. [ ] Press Ctrl+S in settings - saves and shows "Saved"
8. [ ] Click a modified file in git changes panel - Monaco diff editor shows
9. [ ] Toggle split/unified diff view - both modes work
10. [ ] Click edit button on file preview - enters edit mode with Monaco
11. [ ] Edit content and press Ctrl+S - file saves
12. [ ] Check that Catppuccin Mocha theme is applied consistently
13. [ ] Verify no CSP errors in Electron console (DevTools > Console)
14. [ ] Test with a large file (>1000 lines) - should load without freeze

**Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "test: verify Monaco Editor integration end-to-end"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1. Foundation | 1-6 | Install, workers, CSP, theme, editor + diff components |
| 2. File Preview | 7-8 | Replace CodeViewer with read-only Monaco |
| 3. File Editing | 9-11 | File write IPC, settings editor, general file editing |
| 4. Diff View | 12 | Replace custom diff viewer with Monaco DiffEditor |
| 5. Cleanup | 13-15 | Vite chunks, remove Shiki, integration tests |

**Dependencies removed:** `shiki` (replaced by Monaco's built-in highlighting)
**Dependencies added:** `monaco-editor`
**New IPC handlers:** `write_file`, `get_git_file_content_at_head`
**CSP changes:** Added `worker-src 'self' blob:;` and `blob:` to `script-src`
