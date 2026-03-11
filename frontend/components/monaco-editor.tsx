import { useRef, useEffect } from "react";
import * as monaco from "monaco-editor";
import { getMonacoThemeName, getMonacoThemeData } from "@/lib/monaco-theme";
import { useThemeStore } from "@/stores/theme";
import { useUserSettingsStore } from "@/stores/user-settings";

function ensureTheme(): string {
  const themeName = getMonacoThemeName();
  monaco.editor.defineTheme(themeName, getMonacoThemeData());
  return themeName;
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
  const editorSettings = useUserSettingsStore((s) => s.settings.editor);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!containerRef.current) return;

    const themeName = ensureTheme();

    const editor = monaco.editor.create(containerRef.current, {
      value,
      language,
      theme: themeName,
      readOnly,
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: editorSettings.fontSize,
      lineHeight: Math.round(editorSettings.fontSize * (editorSettings.lineHeight ?? 1.5)),
      fontFamily: editorSettings.fontFamily,
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

    // Subscribe to theme changes and re-apply dynamically
    const unsubTheme = useThemeStore.subscribe(() => {
      const newThemeName = ensureTheme();
      monaco.editor.setTheme(newThemeName);
    });

    return () => {
      unsubTheme();
      editor.dispose();
      editorRef.current = null;
    };
  }, [language, readOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  // React to editor settings changes (font, lineHeight)
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.updateOptions({
      fontSize: editorSettings.fontSize,
      lineHeight: Math.round(editorSettings.fontSize * (editorSettings.lineHeight ?? 1.5)),
      fontFamily: editorSettings.fontFamily,
    });
  }, [editorSettings.fontSize, editorSettings.lineHeight, editorSettings.fontFamily]);

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
