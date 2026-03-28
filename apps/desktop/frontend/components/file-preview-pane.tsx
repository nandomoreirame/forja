import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useState, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, Pencil, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { invoke } from '@/lib/ipc';
import { useFilePreviewStore } from '@/stores/file-preview';
import { useGitDiffStore } from '@/stores/git-diff';
import { GIT_STATUS_LABELS } from '@/lib/git-constants';
import { CodeViewer } from './code-viewer';
import { ImageViewer } from './image-viewer';
import { MarkdownRenderer } from './markdown-renderer';
import { GitDiffViewer } from './git-diff-viewer';
import { detectLanguage } from '@/lib/detect-language';

const MonacoEditor = lazy(() =>
  import("./monaco-editor").then((module) => ({
    default: module.MonacoEditor,
  })),
);

const IMAGE_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp",
]);

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

function countLines(content: string): number {
  let count = 1;
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '\n') count++;
  }
  return count;
}

const LANGUAGE_DISPLAY: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript JSX",
  js: "JavaScript",
  jsx: "JavaScript JSX",
  py: "Python",
  rs: "Rust",
  go: "Go",
  rb: "Ruby",
  java: "Java",
  cpp: "C++",
  c: "C",
  cs: "C#",
  php: "PHP",
  swift: "Swift",
  kt: "Kotlin",
  scala: "Scala",
  sh: "Shell",
  bash: "Bash",
  md: "Markdown",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  toml: "TOML",
  xml: "XML",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  sql: "SQL",
  graphql: "GraphQL",
  vue: "Vue",
  svelte: "Svelte",
  dockerfile: "Dockerfile",
};

function getLanguageDisplay(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return LANGUAGE_DISPLAY[ext] || ext.toUpperCase() || "Plain Text";
}

interface GitInfo {
  isGitRepo: boolean;
  branch: string | null;
  fileStatus: string | null;
  changedFiles: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class PreviewErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null as Error | null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('FilePreviewPane render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          data-testid="file-preview-pane"
          className="flex h-full w-full items-center justify-center p-4"
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertCircle className="h-8 w-8 text-ctp-red" strokeWidth={1.5} />
            <div>
              <p className="text-app font-medium text-ctp-text">Failed to render preview</p>
              <p className="mt-1 text-app-sm text-ctp-overlay1">An error occurred while rendering this file.</p>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function FilePreviewPaneContent() {
  const isOpen = useFilePreviewStore((s) => s.isOpen);
  const currentFile = useFilePreviewStore((s) => s.currentFile);
  const content = useFilePreviewStore((s) => s.content);
  const isLoading = useFilePreviewStore((s) => s.isLoading);
  const error = useFilePreviewStore((s) => s.error);
  const isEditing = useFilePreviewStore((s) => s.isEditing);
  const editContent = useFilePreviewStore((s) => s.editContent);
  const editDirty = useFilePreviewStore((s) => s.editDirty);
  const setEditing = useFilePreviewStore((s) => s.setEditing);
  const setEditContent = useFilePreviewStore((s) => s.setEditContent);
  const saveFile = useFilePreviewStore((s) => s.saveFile);
  const selectedDiff = useGitDiffStore((s) => s.selectedDiff);
  const diffMode = useGitDiffStore((s) => s.diffMode);
  const setDiffMode = useGitDiffStore((s) => s.setDiffMode);
  const isLoadingDiff = useGitDiffStore((s) => s.isLoadingDiff);
  const [fileGitStatus, setFileGitStatus] = useState<string | null>(null);
  const showUnsavedDialog = useFilePreviewStore((s) => s.showUnsavedDialog);
  const setShowUnsavedDialog = useFilePreviewStore((s) => s.setShowUnsavedDialog);
  const toggleEditing = useFilePreviewStore((s) => s.toggleEditing);

  const closePreview = useFilePreviewStore((s) => s.closePreview);

  const handleDiscardChanges = useCallback(() => {
    setShowUnsavedDialog(false);
    // Reset dirty state first so closePreview won't re-trigger
    useFilePreviewStore.setState({ editDirty: false });
    setEditing(false);
    closePreview();
  }, [setEditing, setShowUnsavedDialog, closePreview]);

  const handleSaveAndClose = useCallback(async () => {
    await saveFile();
    setShowUnsavedDialog(false);
    setEditing(false);
    closePreview();
  }, [saveFile, setEditing, setShowUnsavedDialog, closePreview]);

  // Listen for Cmd+Enter to toggle editing from within the preview pane
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        toggleEditing();
      }
    };
    // Only capture when editing in Monaco (which swallows global shortcuts)
    if (isEditing) {
      window.addEventListener("keydown", handler, true);
      return () => window.removeEventListener("keydown", handler, true);
    }
  }, [isEditing, toggleEditing]);

  const filename = useMemo(() => currentFile?.split('/').pop() || '', [currentFile]);
  const ext = useMemo(() => filename.split(".").pop()?.toLowerCase() || "", [filename]);
  const isImage = content?.encoding === "base64" && IMAGE_EXTENSIONS.has(ext);
  const isMarkdown = !isImage && filename.endsWith('.md');
  const lines = useMemo(() => (content ? countLines(content.content) : 0), [content]);
  const language = useMemo(() => getLanguageDisplay(filename), [filename]);
  const isDiffView = Boolean(selectedDiff || isLoadingDiff);
  const gitStatusEntry = fileGitStatus
    ? GIT_STATUS_LABELS[fileGitStatus] || { label: fileGitStatus, color: "text-ctp-overlay1" }
    : null;

  useEffect(() => {
    if (!currentFile) {
      setFileGitStatus(null);
      return;
    }
    invoke<GitInfo>("get_git_info_command", { filePath: currentFile })
      .then((info) => setFileGitStatus(info.fileStatus))
      .catch(() => setFileGitStatus(null));
  }, [currentFile]);

  // Auto-pin when the user starts editing (dirty state means they made changes)
  useEffect(() => {
    if (editDirty) {
      useFilePreviewStore.getState().pinFile();
    }
  }, [editDirty]);

  if (!isOpen) {
    return null;
  }

  const hasFile = Boolean(currentFile);
  const showEmptyState = !hasFile && !isLoading && !error && !isDiffView;

  if (showEmptyState) {
    return null;
  }

  return (
    <div
      data-testid="file-preview-pane"
      className="flex h-full w-full flex-col overflow-hidden"
    >
      {/* Content area */}
      <div className="min-h-0 flex-1 select-text overflow-hidden">
        {isLoading && (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              <p className="text-app text-ctp-overlay1">Loading file...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex h-full items-center justify-center p-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertCircle
                data-testid="error-icon"
                className="h-8 w-8 text-ctp-red"
                strokeWidth={1.5}
              />
              <div>
                <p className="text-app font-medium text-ctp-text">Failed to load file</p>
                <p className="mt-1 text-app-sm text-ctp-overlay1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {isDiffView ? (
          <GitDiffViewer
            diff={selectedDiff}
            mode={diffMode}
            onModeChange={setDiffMode}
            isLoading={isLoadingDiff}
          />
        ) : null}

        {!isDiffView && !isLoading && !error && content && (
          isImage ? (
            <ImageViewer content={content.content} filename={filename} />
          ) : isMarkdown && !isEditing ? (
            <div className="h-full overflow-y-auto p-4">
              <MarkdownRenderer
                content={content.content}
                basePath={currentFile ? currentFile.substring(0, currentFile.lastIndexOf("/")) : undefined}
              />
            </div>
          ) : isEditing ? (
            <Suspense fallback={<div className="h-full w-full" />}>
              <MonacoEditor
                value={editContent ?? content.content}
                language={detectLanguage(currentFile ?? filename)}
                onChange={(value) => setEditContent(value)}
                onSave={async (value) => {
                  setEditContent(value);
                  await saveFile();
                  setEditing(false);
                }}
                className="h-full w-full"
              />
            </Suspense>
          ) : (
            <CodeViewer code={content.content} filename={filename} />
          )
        )}
      </div>

      {/* Footer — file metadata + edit/preview toggle */}
      {!isDiffView && !isLoading && !error && content && (
        <div className="flex h-9 shrink-0 items-center gap-3 border-t border-ctp-surface0 px-3 font-mono text-app-xs text-ctp-overlay1">
          {isImage ? (
            <>
              <span>{formatFileSize(content.size)}</span>
              <span className="text-ctp-surface1">|</span>
              <span className="text-ctp-subtext0">{ext.toUpperCase()}</span>
            </>
          ) : (
            <>
              <span>{lines} {lines === 1 ? "line" : "lines"}</span>
              <span className="text-ctp-surface1">|</span>
              <span>{formatFileSize(content.size)}</span>
              <span className="text-ctp-surface1">|</span>
              <span>UTF-8</span>
              <span className="text-ctp-surface1">|</span>
              <span className="text-ctp-subtext0">{language}</span>
            </>
          )}
          {gitStatusEntry && (
            <>
              <span className="text-ctp-surface1">|</span>
              <span className={gitStatusEntry.color}>{gitStatusEntry.label}</span>
            </>
          )}
          {editDirty && (
            <>
              <span className="text-ctp-surface1">|</span>
              <span className="text-ctp-yellow">Unsaved</span>
            </>
          )}
          {/* Edit / Preview toggle — lives in the footer since the pane no longer has a header */}
          {!isImage && (
            <div className="ml-auto">
              <button
                onClick={toggleEditing}
                aria-label={isEditing ? "Switch to preview" : "Switch to edit"}
                className="inline-flex h-6 items-center gap-1 rounded px-2 font-sans text-app-xs text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
              >
                {isEditing ? (
                  <>
                    <Eye className="h-3 w-3" strokeWidth={1.5} />
                    Preview
                  </>
                ) : (
                  <>
                    <Pencil className="h-3 w-3" strokeWidth={1.5} />
                    Edit
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
      {/* Unsaved changes dialog */}
      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent className="border-ctp-surface1 bg-overlay-mantle sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-ctp-text">Unsaved Changes</DialogTitle>
            <DialogDescription className="text-ctp-subtext0">
              You have unsaved changes in{" "}
              <span className="font-medium text-ctp-text">{filename}</span>.
              Do you want to save before closing the editor?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUnsavedDialog(false)}
              className="border-ctp-surface1 text-ctp-subtext0 hover:bg-ctp-surface0 hover:text-ctp-text"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiscardChanges}
              className="border-ctp-red/30 text-ctp-red hover:bg-ctp-red/10 hover:text-ctp-red"
            >
              Discard
            </Button>
            <Button
              autoFocus
              size="sm"
              onClick={handleSaveAndClose}
              className="bg-ctp-mauve text-ctp-base hover:bg-ctp-mauve/90"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function FilePreviewPane() {
  return (
    <PreviewErrorBoundary>
      <FilePreviewPaneContent />
    </PreviewErrorBoundary>
  );
}
