import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useGitDiffStore } from "@/stores/git-diff";
import { useFilePreviewStore } from "@/stores/file-preview";
import { getGitBadgeLetter, getGitStatusColor } from "@/lib/git-constants";

interface GitChangesPaneProps {
  projectPaths: string[];
}

function projectName(projectPath: string): string {
  const parts = projectPath.split("/");
  return parts[parts.length - 1] || projectPath;
}

export function GitChangesPane({ projectPaths }: GitChangesPaneProps) {
  const changedFilesByProject = useGitDiffStore((s) => s.changedFilesByProject);
  const projectCountersByPath = useGitDiffStore((s) => s.projectCountersByPath);
  const selectedProjectPath = useGitDiffStore((s) => s.selectedProjectPath);
  const selectedPath = useGitDiffStore((s) => s.selectedPath);
  const selectChangedFile = useGitDiffStore((s) => s.selectChangedFile);
  const openPreview = useFilePreviewStore((s) => s.openPreview);
  const [expanded, setExpanded] = useState(false);

  const groups = useMemo(() => {
    return projectPaths.map((path) => ({
      path,
      name: projectName(path),
      files: changedFilesByProject[path] ?? [],
      counters: projectCountersByPath[path],
    }));
  }, [changedFilesByProject, projectCountersByPath, projectPaths]);

  const totalChanges = groups.reduce((sum, g) => sum + g.files.length, 0);
  if (totalChanges === 0) {
    return null;
  }

  return (
    <div data-testid="git-changes-pane" className="shrink-0 border-t border-ctp-surface0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-app-xs font-semibold uppercase tracking-wide text-ctp-overlay1 transition-colors hover:bg-ctp-surface0"
        aria-label={expanded ? "Collapse changes" : "Expand changes"}
        aria-expanded={expanded}
      >
        <ChevronRight
          className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-90" : ""}`}
          strokeWidth={1.5}
        />
        <span>Changes</span>
        <span
          className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-ctp-surface1 bg-ctp-surface0 px-1.5 text-app-xs font-semibold leading-none text-ctp-subtext0"
          aria-label={`${totalChanges} changed files`}
        >
          {totalChanges}
        </span>
      </button>
      {expanded && (
        <div className="max-h-56 overflow-y-auto pb-1">
        {groups.map((group) => {
          if (group.files.length === 0) return null;
          const counters = group.counters;
          return (
            <div key={group.path} className="mb-1">
              <div className="px-3 py-1 text-app-xs text-ctp-overlay1">
                <span className="font-medium text-ctp-subtext0">{group.name}</span>
                {counters && (
                  <span className="ml-2">
                    M:{counters.modified} A:{counters.added} D:{counters.deleted} U:{counters.untracked}
                  </span>
                )}
              </div>
              {group.files.map((file) => {
                const active =
                  selectedProjectPath === group.path && selectedPath === file.path;
                const letter = getGitBadgeLetter(file.status) ?? "?";
                const color = getGitStatusColor(file.status) ?? "text-ctp-overlay1";
                return (
                  <button
                    key={`${group.path}:${file.path}`}
                    type="button"
                    onClick={() => {
                      openPreview();
                      selectChangedFile(group.path, file.path);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-1 text-left text-app-sm transition-colors ${
                      active ? "bg-ctp-surface0" : "hover:bg-ctp-surface0/60"
                    }`}
                  >
                    <span className={`w-4 shrink-0 font-semibold ${color}`}>{letter}</span>
                    <span className="truncate text-ctp-subtext0">{file.path}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
}
