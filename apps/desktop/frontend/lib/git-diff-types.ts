export interface GitChangedFile {
  path: string;
  status: string;
  staged: boolean;
  unstaged: boolean;
}

export interface GitDiffResult {
  path: string;
  status: string;
  patch: string;
  truncated: boolean;
  isBinary: boolean;
  originalContent?: string;
  modifiedContent?: string;
}

export interface GitProjectCounters {
  modified: number;
  added: number;
  deleted: number;
  untracked: number;
  total: number;
}

