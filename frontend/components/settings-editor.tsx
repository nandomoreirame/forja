import { useCallback, useEffect, useRef, useState } from "react";
import { Settings, X } from "lucide-react";
import { useUserSettingsStore } from "@/stores/user-settings";
import { useSyntaxHighlighter } from "@/hooks/use-syntax-highlighter";
import { sanitizeHtml } from "@/lib/sanitize-html";

const EDITOR_FONT = "var(--font-mono)";
const EDITOR_FONT_SIZE = "var(--editor-font-size)";
const EDITOR_LINE_HEIGHT = "1.5";
const EDITOR_PADDING_Y = "1rem";
const EDITOR_PADDING_X = "1rem";
// Line number gutter: 4ch width + 1.5ch margin-right (from .code-viewer CSS)
const GUTTER_WIDTH = "calc(4ch + 1.5ch)";

export function SettingsEditor() {
  const editorContent = useUserSettingsStore((s) => s.editorContent);
  const editorDirty = useUserSettingsStore((s) => s.editorDirty);
  const editorError = useUserSettingsStore((s) => s.editorError);
  const setEditorContent = useUserSettingsStore((s) => s.setEditorContent);
  const closeSettingsEditor = useUserSettingsStore((s) => s.closeSettingsEditor);
  const saveEditorContent = useUserSettingsStore((s) => s.saveEditorContent);

  const { isReady, highlight } = useSyntaxHighlighter();
  const [highlightedHtml, setHighlightedHtml] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Sync highlighted code with editor content
  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;
    highlight(editorContent, "json").then((html) => {
      if (!cancelled) setHighlightedHtml(html);
    });
    return () => { cancelled = true; };
  }, [editorContent, isReady, highlight]);

  // Sync scroll between textarea and highlighted code
  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      saveEditorContent();
    }
    // Handle Tab key for indentation
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      const newValue = value.substring(0, start) + "  " + value.substring(end);
      setEditorContent(newValue);
      // Restore cursor position after React re-render
      requestAnimationFrame(() => {
        textarea.selectionStart = start + 2;
        textarea.selectionEnd = start + 2;
      });
    }
  };

  return (
    <div
      data-testid="settings-editor"
      className="flex h-full w-full flex-col overflow-hidden border-r border-ctp-surface0 bg-ctp-base"
    >
      {/* Header */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-ctp-surface0 px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Settings className="h-4 w-4 shrink-0 text-ctp-overlay1" strokeWidth={1.5} />
          <span className="truncate text-sm font-semibold text-ctp-text">
            settings.json
          </span>
          <span className="inline-flex shrink-0 items-center rounded bg-ctp-mauve/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ctp-mauve">
            Editing
          </span>
        </div>
        <button
          onClick={closeSettingsEditor}
          aria-label="Close settings editor"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* Editor with syntax highlight overlay */}
      <div className="relative flex-1 select-text overflow-hidden">
        {/* Highlighted code layer (background) */}
        <div
          ref={highlightRef}
          aria-hidden="true"
          className="code-viewer pointer-events-none absolute inset-0 overflow-hidden"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(highlightedHtml) }}
          style={{
            fontFamily: EDITOR_FONT,
            fontSize: EDITOR_FONT_SIZE,
            lineHeight: EDITOR_LINE_HEIGHT,
            padding: `${EDITOR_PADDING_Y} ${EDITOR_PADDING_X}`,
            whiteSpace: "pre",
            wordWrap: "normal",
          }}
        />
        {/* Editable textarea layer (foreground, transparent text) */}
        <textarea
          ref={textareaRef}
          value={editorContent}
          onChange={(e) => setEditorContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          spellCheck={false}
          aria-label="Settings JSON editor"
          aria-describedby="settings-status"
          className="absolute inset-0 h-full w-full resize-none overflow-auto bg-transparent outline-none"
          style={{
            fontFamily: EDITOR_FONT,
            fontSize: EDITOR_FONT_SIZE,
            lineHeight: EDITOR_LINE_HEIGHT,
            padding: `${EDITOR_PADDING_Y} ${EDITOR_PADDING_X}`,
            paddingLeft: `calc(${EDITOR_PADDING_X} + ${GUTTER_WIDTH})`,
            color: "transparent",
            caretColor: "var(--color-ctp-text)",
            whiteSpace: "pre",
            wordWrap: "normal",
          }}
        />
      </div>

      {/* Footer */}
      <div className="flex h-9 items-center justify-between border-t border-ctp-surface0 px-3">
        <p id="settings-status" role="status" aria-live="polite" className="text-xs text-ctp-overlay1">
          {editorError ? (
            <span className="text-ctp-red">{editorError}</span>
          ) : editorDirty ? (
            <span className="text-ctp-yellow">Unsaved changes</span>
          ) : (
            <span className="text-ctp-green">Saved</span>
          )}
        </p>
        <p className="text-xs text-ctp-overlay0">
          {editorDirty ? "Ctrl+S to save" : ""}
        </p>
      </div>
    </div>
  );
}
