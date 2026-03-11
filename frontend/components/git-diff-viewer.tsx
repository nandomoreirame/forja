import { lazy, Suspense } from "react";
import { detectLanguage } from "@/lib/detect-language";
import type { GitDiffResult } from "@/lib/git-diff-types";

const MonacoDiffEditor = lazy(() =>
  import("./monaco-diff-editor").then((module) => ({
    default: module.MonacoDiffEditor,
  })),
);

interface GitDiffViewerProps {
  diff: GitDiffResult | null;
  mode: "split" | "unified";
  onModeChange: (mode: "split" | "unified") => void;
  isLoading?: boolean;
}

export function GitDiffViewer({
  diff,
  mode,
  onModeChange,
  isLoading = false,
}: GitDiffViewerProps) {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-ctp-overlay1">
        Loading diff...
      </div>
    );
  }

  if (!diff) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-ctp-overlay1">
        Select a changed file to see its diff.
      </div>
    );
  }

  if (diff.isBinary) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-ctp-overlay1">
        Binary file diff is not supported in the viewer.
      </div>
    );
  }

  const language = detectLanguage(diff.path);
  const hasContent = diff.originalContent !== undefined && diff.modifiedContent !== undefined;
  const isSideBySide = mode === "split";

  return (
    <div data-testid="git-diff-viewer" className="flex h-full min-h-0 flex-col">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-ctp-surface0 px-3">
        <span className="truncate text-xs text-ctp-overlay1">
          {diff.path}
        </span>
        <div className="inline-flex items-center rounded bg-ctp-surface0 p-0.5">
          <button
            type="button"
            aria-pressed={mode === "split"}
            aria-label="Split view"
            onClick={() => onModeChange("split")}
            className={`rounded px-2 py-0.5 text-[11px] ${
              mode === "split" ? "bg-ctp-surface1 text-ctp-text" : "text-ctp-overlay1"
            }`}
          >
            Split
          </button>
          <button
            type="button"
            aria-pressed={mode === "unified"}
            aria-label="Unified view"
            onClick={() => onModeChange("unified")}
            className={`rounded px-2 py-0.5 text-[11px] ${
              mode === "unified" ? "bg-ctp-surface1 text-ctp-text" : "text-ctp-overlay1"
            }`}
          >
            Unified
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {hasContent ? (
          <Suspense fallback={<div className="h-full w-full bg-ctp-base" />}>
            <MonacoDiffEditor
              original={diff.originalContent ?? ""}
              modified={diff.modifiedContent ?? ""}
              language={language}
              renderSideBySide={isSideBySide}
              className="h-full w-full"
            />
          </Suspense>
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-sm text-ctp-overlay1">
            No content available for diff view.
          </div>
        )}
      </div>
      {diff.truncated && (
        <div className="shrink-0 border-t border-ctp-surface0 px-3 py-1 text-[11px] text-ctp-yellow">
          Diff is truncated for performance.
        </div>
      )}
    </div>
  );
}
