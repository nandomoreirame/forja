import { lazy, Suspense, useMemo } from 'react';
import { X, FileCode, AlertCircle } from 'lucide-react';
import { useFilePreviewStore } from '@/stores/file-preview';
import { CodeViewer } from './code-viewer';

// Lazy load markdown renderer only when a .md file is opened
const LazyMarkdown = lazy(() =>
  Promise.all([
    import('react-markdown'),
    import('remark-gfm'),
  ]).then(([reactMarkdown, remarkGfm]) => ({
    default: function MarkdownRenderer({ content }: { content: string }) {
      const ReactMarkdown = reactMarkdown.default;
      return (
        <ReactMarkdown remarkPlugins={[remarkGfm.default]}>
          {content}
        </ReactMarkdown>
      );
    },
  }))
);

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

export function FilePreviewPane() {
  const isOpen = useFilePreviewStore((s) => s.isOpen);
  const currentFile = useFilePreviewStore((s) => s.currentFile);
  const content = useFilePreviewStore((s) => s.content);
  const isLoading = useFilePreviewStore((s) => s.isLoading);
  const error = useFilePreviewStore((s) => s.error);
  const closePreview = useFilePreviewStore((s) => s.closePreview);

  const filename = useMemo(() => currentFile?.split('/').pop() || '', [currentFile]);
  const isMarkdown = filename.endsWith('.md');

  if (!isOpen) {
    return null;
  }

  return (
    <div
      data-testid="file-preview-pane"
      className="flex h-full basis-1/2 grow-0 shrink-0 flex-col overflow-hidden border-r border-ctp-surface0 bg-ctp-base"
    >
      {/* Header */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-ctp-surface0 px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <FileCode className="h-4 w-4 shrink-0 text-ctp-overlay1" strokeWidth={1.5} />
          <span className="truncate text-sm font-semibold text-ctp-text">
            {filename}
          </span>
          <span className="inline-flex shrink-0 items-center rounded bg-ctp-surface0 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ctp-overlay1">
            Preview
          </span>
        </div>
        <button
          onClick={closePreview}
          aria-label="Close preview"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto">
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

        {!isLoading && !error && content && (
          <>
            {isMarkdown ? (
              <div className="markdown prose prose-invert max-w-none p-4">
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center p-4">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                    </div>
                  }
                >
                  <LazyMarkdown content={content.content} />
                </Suspense>
              </div>
            ) : (
              <CodeViewer code={content.content} filename={filename} />
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {!isLoading && !error && content && (
        <div className="border-t border-ctp-surface0 px-3 py-2">
          <p className="text-xs text-ctp-overlay1">
            {formatFileSize(content.size)}
          </p>
        </div>
      )}
    </div>
  );
}
