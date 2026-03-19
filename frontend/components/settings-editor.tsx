import { useCallback } from "react";
import { Settings, X } from "lucide-react";
import { MonacoEditor } from "./monaco-editor";
import { useUserSettingsStore } from "@/stores/user-settings";

export function SettingsEditor() {
  const editorContent = useUserSettingsStore((s) => s.editorContent);
  const editorDirty = useUserSettingsStore((s) => s.editorDirty);
  const editorError = useUserSettingsStore((s) => s.editorError);
  const setEditorContent = useUserSettingsStore((s) => s.setEditorContent);
  const closeSettingsEditor = useUserSettingsStore((s) => s.closeSettingsEditor);
  const saveEditorContent = useUserSettingsStore((s) => s.saveEditorContent);

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
    <div
      data-testid="settings-editor"
      className="flex h-full w-full flex-col overflow-hidden border-r border-ctp-surface0 bg-ctp-base"
    >
      {/* Header */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-ctp-surface0 px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Settings className="h-4 w-4 shrink-0 text-ctp-overlay1" strokeWidth={1.5} />
          <span className="truncate text-app font-semibold text-ctp-text">
            settings.json
          </span>
          <span className="inline-flex shrink-0 items-center rounded bg-ctp-mauve/15 px-1.5 py-0.5 text-app-xs font-medium uppercase tracking-wider text-ctp-mauve">
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

      {/* Monaco Editor */}
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

      {/* Footer */}
      <div className="flex h-9 items-center justify-between border-t border-ctp-surface0 px-3">
        <p id="settings-status" role="status" aria-live="polite" className="text-app-sm text-ctp-overlay1">
          {editorError ? (
            <span className="text-ctp-red">{editorError}</span>
          ) : editorDirty ? (
            <span className="text-ctp-yellow">Unsaved changes</span>
          ) : (
            <span className="text-ctp-green">Saved</span>
          )}
        </p>
        <p className="text-app-sm text-ctp-overlay0">
          {editorDirty ? "Ctrl+S to save" : ""}
        </p>
      </div>
    </div>
  );
}
