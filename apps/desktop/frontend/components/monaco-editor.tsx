import { useRef, useEffect } from "react";
import * as monaco from "monaco-editor";
import { getMonacoThemeName, getMonacoThemeData } from "@/lib/monaco-theme";
import { useThemeStore } from "@/stores/theme";
import { useUserSettingsStore } from "@/stores/user-settings";
import { useFilePreviewStore } from "@/stores/file-preview";
import { cn } from "@/lib/utils";

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
      cursorWidth: readOnly ? 0 : undefined,
      cursorBlinking: readOnly ? "solid" : "blink",
      matchBrackets: readOnly ? "never" : "always",
      occurrencesHighlight: readOnly ? "off" : "singleFile",
      selectionHighlight: !readOnly,
      domReadOnly: readOnly,
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

    let cursorDisposable: monaco.IDisposable | null = null;
    let scrollDisposable: monaco.IDisposable | null = null;

    if (!readOnly) {
      // Restore cursor position from store, or start at line 1
      const savedPosition = useFilePreviewStore.getState().cursorPosition;
      const savedScrollTop = useFilePreviewStore.getState().scrollTop;
      if (savedPosition) {
        editor.setPosition(savedPosition);
        editor.revealPositionInCenter(savedPosition);
      } else {
        editor.setPosition({ lineNumber: 1, column: 1 });
      }
      if (savedScrollTop != null) {
        editor.setScrollTop(savedScrollTop);
      }
      editor.focus();

      // Save cursor position on change
      cursorDisposable = editor.onDidChangeCursorPosition((e) => {
        useFilePreviewStore.setState({ cursorPosition: { lineNumber: e.position.lineNumber, column: e.position.column } });
      });
      scrollDisposable = editor.onDidScrollChange((e) => {
        useFilePreviewStore.setState({ scrollTop: e.scrollTop });
      });
    }

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
      cursorDisposable?.dispose();
      scrollDisposable?.dispose();
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
      className={cn(className, readOnly && "monaco-preview-readonly")}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
