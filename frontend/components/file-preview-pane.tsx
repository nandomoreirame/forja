import { Component, useEffect, useMemo, useState, type ErrorInfo, type ReactNode } from 'react';
import { X, FileCode, AlertCircle, Pencil, Eye } from 'lucide-react';
import { invoke } from '@/lib/ipc';
import { useFilePreviewStore } from '@/stores/file-preview';
import { useGitDiffStore } from '@/stores/git-diff';
import { useUserSettingsStore } from '@/stores/user-settings';
import { GIT_STATUS_LABELS } from '@/lib/git-constants';
import { CodeViewer } from './code-viewer';
import { ImageViewer } from './image-viewer';
import { MarkdownRenderer } from './markdown-renderer';
import { SettingsEditor } from './settings-editor';
import { GitDiffViewer } from './git-diff-viewer';
import { MonacoEditor } from './monaco-editor';
import { detectLanguage } from '@/lib/detect-language';

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
  onClose: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class PreviewErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
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
          className="flex h-full w-full flex-col overflow-hidden border-r border-ctp-surface0 bg-ctp-base"
        >
          <div className="flex h-9 shrink-0 items-center justify-end border-b border-ctp-surface0 px-3">
            <button
              onClick={this.props.onClose}
              aria-label="Close preview"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center p-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertCircle className="h-8 w-8 text-ctp-red" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-medium text-ctp-text">Failed to render preview</p>
                <p className="mt-1 text-xs text-ctp-overlay1">An error occurred while rendering this file.</p>
              </div>
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
  const closePreview = useFilePreviewStore((s) => s.closePreview);
  const isEditing = useFilePreviewStore((s) => s.isEditing);
  const editContent = useFilePreviewStore((s) => s.editContent);
  const editDirty = useFilePreviewStore((s) => s.editDirty);
  const setEditing = useFilePreviewStore((s) => s.setEditing);
  const setEditContent = useFilePreviewStore((s) => s.setEditContent);
  const saveFile = useFilePreviewStore((s) => s.saveFile);
  const editorOpen = useUserSettingsStore((s) => s.editorOpen);
  const selectedDiff = useGitDiffStore((s) => s.selectedDiff);
  const diffMode = useGitDiffStore((s) => s.diffMode);
  const setDiffMode = useGitDiffStore((s) => s.setDiffMode);
  const isLoadingDiff = useGitDiffStore((s) => s.isLoadingDiff);
  const [fileGitStatus, setFileGitStatus] = useState<string | null>(null);

  const filename = useMemo(() => currentFile?.split('/').pop() || '', [currentFile]);
  const ext = useMemo(() => filename.split(".").pop()?.toLowerCase() || "", [filename]);
  const isImage = content?.encoding === "base64" && IMAGE_EXTENSIONS.has(ext);
  const isMarkdown = !isImage && filename.endsWith('.md');
  const lines = useMemo(() => (content ? countLines(content.content) : 0), [content]);
  const language = useMemo(() => getLanguageDisplay(filename), [filename]);
  const displayName = selectedDiff?.path.split("/").pop() || filename;
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

  if (editorOpen) {
    return <SettingsEditor />;
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      data-testid="file-preview-pane"
      className="flex h-full w-full flex-col overflow-hidden border-r border-ctp-surface0 bg-ctp-base"
    >
      {/* Header */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-ctp-surface0 px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <FileCode className="h-4 w-4 shrink-0 text-ctp-overlay1" strokeWidth={1.5} />
          <span className="truncate text-sm font-semibold text-ctp-text">
            {displayName}
          </span>
          <span className="inline-flex shrink-0 items-center rounded bg-ctp-surface0 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ctp-overlay1">
            {isDiffView ? "Diff" : isEditing ? "Editing" : "Preview"}
          </span>
        </div>
        {!isDiffView && !isImage && !isMarkdown && content && (
          <button
            onClick={() => setEditing(!isEditing)}
            aria-label={isEditing ? "Switch to preview" : "Switch to edit"}
            className="inline-flex h-7 items-center gap-1 rounded px-2 text-[11px] text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
          >
            {isEditing ? (
              <>
                <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                Preview
              </>
            ) : (
              <>
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                Edit
              </>
            )}
          </button>
        )}
        <button
          onClick={closePreview}
          aria-label="Close preview"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 select-text overflow-hidden">
        {isLoading && (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              <p className="text-sm text-ctp-overlay1">Loading file...</p>
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
                <p className="text-sm font-medium text-ctp-text">Failed to load file</p>
                <p className="mt-1 text-xs text-ctp-overlay1">{error}</p>
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
          ) : isMarkdown ? (
            <div className="p-4">
              <MarkdownRenderer content={content.content} />
            </div>
          ) : isEditing ? (
            <MonacoEditor
              value={editContent ?? content.content}
              language={detectLanguage(currentFile ?? filename)}
              onChange={(value) => setEditContent(value)}
              onSave={(value) => {
                setEditContent(value);
                saveFile();
              }}
              className="h-full w-full"
            />
          ) : (
            <CodeViewer code={content.content} filename={filename} />
          )
        )}
      </div>

      {/* Footer */}
      {!isDiffView && !isLoading && !error && content && (
        <div className="flex h-9 shrink-0 items-center gap-3 border-t border-ctp-surface0 px-3 font-mono text-[11px] text-ctp-overlay1">
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
        </div>
      )}
    </div>
  );
}

export function FilePreviewPane() {
  const closePreview = useFilePreviewStore((s) => s.closePreview);

  return (
    <PreviewErrorBoundary onClose={closePreview}>
      <FilePreviewPaneContent />
    </PreviewErrorBoundary>
  );
}
