import { useRef, useEffect } from "react";
import * as monaco from "monaco-editor";
import { catppuccinMochaTheme, THEME_NAME } from "@/lib/monaco-theme";

function ensureTheme() {
  monaco.editor.defineTheme(THEME_NAME, catppuccinMochaTheme);
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
