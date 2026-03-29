import { useRef, useEffect } from "react";
import * as monaco from "monaco-editor";
import { getMonacoThemeName, getMonacoThemeData } from "@/lib/monaco-theme";
import { useThemeStore } from "@/stores/theme";

function ensureTheme(): string {
  const themeName = getMonacoThemeName();
  monaco.editor.defineTheme(themeName, getMonacoThemeData());
  return themeName;
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

    const themeName = ensureTheme();

    const diffEditor = monaco.editor.createDiffEditor(containerRef.current, {
      theme: themeName,
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

    // Subscribe to theme changes and re-apply dynamically
    const unsubTheme = useThemeStore.subscribe(() => {
      const newThemeName = ensureTheme();
      monaco.editor.setTheme(newThemeName);
    });

    return () => {
      unsubTheme();
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
