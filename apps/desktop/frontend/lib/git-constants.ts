export interface GitStatusDisplay {
  label: string;
  color: string;
}

export const GIT_STATUS_LABELS: Record<string, GitStatusDisplay> = {
  M: { label: "Modified", color: "text-ctp-yellow" },
  A: { label: "Added", color: "text-ctp-green" },
  D: { label: "Deleted", color: "text-ctp-red" },
  R: { label: "Renamed", color: "text-ctp-blue" },
  C: { label: "Copied", color: "text-ctp-blue" },
  "??": { label: "Untracked", color: "text-ctp-green" },
  AM: { label: "Added", color: "text-ctp-green" },
  MM: { label: "Modified", color: "text-ctp-yellow" },
};

export function getGitStatusDisplay(code: string): GitStatusDisplay | null {
  return GIT_STATUS_LABELS[code] ?? null;
}

export function getGitBadgeLetter(code: string): string | null {
  switch (code) {
    case "M":
    case "MM":
      return "M";
    case "??":
      return "U";
    case "A":
    case "AM":
      return "A";
    case "D":
      return "D";
    case "R":
      return "R";
    case "C":
      return "C";
    default:
      return null;
  }
}

export function getGitStatusColor(code: string): string | null {
  switch (code) {
    case "M":
    case "MM":
      return "text-ctp-yellow";
    case "??":
    case "A":
    case "AM":
      return "text-ctp-green";
    case "D":
      return "text-ctp-red";
    case "R":
    case "C":
      return "text-ctp-blue";
    default:
      return null;
  }
}
