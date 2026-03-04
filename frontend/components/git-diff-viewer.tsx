import type { GitDiffResult } from "@/lib/git-diff-types";

interface GitDiffViewerProps {
  diff: GitDiffResult | null;
  mode: "split" | "unified";
  onModeChange: (mode: "split" | "unified") => void;
  isLoading?: boolean;
}

interface DiffLine {
  kind: "add" | "del" | "ctx";
  text: string;
}

interface DiffHunk {
  header: string;
  oldStart: number;
  newStart: number;
  lines: DiffLine[];
}

interface UnifiedRow {
  kind: "hunk" | "add" | "del" | "ctx";
  oldLine: number | null;
  newLine: number | null;
  text: string;
}

interface SplitRow {
  kind: "hunk" | "ctx" | "add" | "del" | "mod";
  leftLine: number | null;
  rightLine: number | null;
  leftText: string;
  rightText: string;
}

function parseHunkHeader(header: string): { oldStart: number; newStart: number } {
  const m = header.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
  return {
    oldStart: m ? Number(m[1]) : 0,
    newStart: m ? Number(m[2]) : 0,
  };
}

function parsePatch(patch: string): DiffHunk[] {
  const lines = patch.split("\n");
  const hunks: DiffHunk[] = [];
  let current: DiffHunk | null = null;

  for (const raw of lines) {
    if (raw.startsWith("@@")) {
      const { oldStart, newStart } = parseHunkHeader(raw);
      current = { header: raw, oldStart, newStart, lines: [] };
      hunks.push(current);
      continue;
    }

    if (!current) continue;
    if (raw.startsWith("+")) {
      current.lines.push({ kind: "add", text: raw.slice(1) });
    } else if (raw.startsWith("-")) {
      current.lines.push({ kind: "del", text: raw.slice(1) });
    } else if (raw.startsWith(" ")) {
      current.lines.push({ kind: "ctx", text: raw.slice(1) });
    } else if (raw.startsWith("\\")) {
      // \ No newline at end of file
      current.lines.push({ kind: "ctx", text: raw });
    }
  }

  return hunks;
}

function UnifiedView({ hunks }: { hunks: DiffHunk[] }) {
  const rows: UnifiedRow[] = [];
  for (const hunk of hunks) {
    rows.push({
      kind: "hunk",
      oldLine: null,
      newLine: null,
      text: hunk.header,
    });
    let oldLine = hunk.oldStart;
    let newLine = hunk.newStart;
    for (const line of hunk.lines) {
      if (line.kind === "ctx") {
        rows.push({ kind: "ctx", oldLine, newLine, text: line.text });
        oldLine += 1;
        newLine += 1;
      } else if (line.kind === "del") {
        rows.push({ kind: "del", oldLine, newLine: null, text: line.text });
        oldLine += 1;
      } else {
        rows.push({ kind: "add", oldLine: null, newLine, text: line.text });
        newLine += 1;
      }
    }
  }

  return (
    <div data-testid="git-diff-unified" className="overflow-auto p-3 text-xs leading-5">
      {rows.map((row, index) => {
        let className = "";
        if (row.kind === "add") className = "bg-ctp-green/10";
        else if (row.kind === "del") className = "bg-ctp-red/10";
        else if (row.kind === "hunk") className = "bg-ctp-blue/10 text-ctp-blue";
        return (
          <div
            key={`${row.text}-${index}`}
            className={`grid grid-cols-[56px_56px_1fr] ${className}`}
          >
            <span className="border-r border-ctp-surface0/70 px-2 text-right text-ctp-overlay1">
              {row.oldLine ?? ""}
            </span>
            <span className="border-r border-ctp-surface0/70 px-2 text-right text-ctp-overlay1">
              {row.newLine ?? ""}
            </span>
            <span
              className={`px-3 ${
                row.kind === "add"
                  ? "text-ctp-green"
                  : row.kind === "del"
                    ? "text-ctp-red"
                    : "text-ctp-text"
              }`}
            >
              {row.kind === "add" ? "+" : row.kind === "del" ? "-" : " "}
              {row.text || " "}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function buildSplitRows(hunks: DiffHunk[]): SplitRow[] {
  const rows: SplitRow[] = [];
  for (const hunk of hunks) {
    rows.push({
      kind: "hunk",
      leftLine: null,
      rightLine: null,
      leftText: hunk.header,
      rightText: "",
    });
    let oldLine = hunk.oldStart;
    let newLine = hunk.newStart;

    for (let i = 0; i < hunk.lines.length; i += 1) {
      const current = hunk.lines[i];
      const next = hunk.lines[i + 1];

      if (current.kind === "del" && next?.kind === "add") {
        rows.push({
          kind: "mod",
          leftLine: oldLine,
          rightLine: newLine,
          leftText: current.text,
          rightText: next.text,
        });
        oldLine += 1;
        newLine += 1;
        i += 1;
        continue;
      }

      if (current.kind === "ctx") {
        rows.push({
          kind: "ctx",
          leftLine: oldLine,
          rightLine: newLine,
          leftText: current.text,
          rightText: current.text,
        });
        oldLine += 1;
        newLine += 1;
      } else if (current.kind === "del") {
        rows.push({
          kind: "del",
          leftLine: oldLine,
          rightLine: null,
          leftText: current.text,
          rightText: "",
        });
        oldLine += 1;
      } else {
        rows.push({
          kind: "add",
          leftLine: null,
          rightLine: newLine,
          leftText: "",
          rightText: current.text,
        });
        newLine += 1;
      }
    }
  }
  return rows;
}

function SplitView({ hunks }: { hunks: DiffHunk[] }) {
  const rows = buildSplitRows(hunks);
  return (
    <div data-testid="git-diff-split" className="overflow-auto p-3 text-xs leading-5">
      {rows.map((row, index) => {
        if (row.kind === "hunk") {
          return (
            <div
              key={`${row.leftText}-${index}`}
              className="mb-0.5 rounded bg-ctp-blue/10 px-2 py-0.5 text-ctp-blue"
            >
              {row.leftText || " "}
            </div>
          );
        }

        const leftClass = row.kind === "del" || row.kind === "mod" ? "bg-ctp-red/10" : "";
        const rightClass = row.kind === "add" || row.kind === "mod" ? "bg-ctp-green/10" : "";

        return (
          <div
            key={`${row.leftText}-${row.rightText}-${index}`}
            className="grid grid-cols-2 gap-2 border-b border-ctp-surface0/50"
          >
            <div className={`grid grid-cols-[56px_1fr] ${leftClass}`}>
              <span className="border-r border-ctp-surface0/70 px-2 text-right text-ctp-overlay1">
                {row.leftLine ?? ""}
              </span>
              <span className="px-3 text-ctp-text">
                {row.leftText ? `-${row.leftText}` : " "}
              </span>
            </div>
            <div className={`grid grid-cols-[56px_1fr] ${rightClass}`}>
              <span className="border-r border-ctp-surface0/70 px-2 text-right text-ctp-overlay1">
                {row.rightLine ?? ""}
              </span>
              <span className="px-3 text-ctp-text">
                {row.rightText ? `+${row.rightText}` : " "}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
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

  const hunks = parsePatch(diff.patch);
  const hasTextualDiff = hunks.length > 0;

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
        {hasTextualDiff ? (
          mode === "split" ? <SplitView hunks={hunks} /> : <UnifiedView hunks={hunks} />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-sm text-ctp-overlay1">
            No textual changes to display.
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
