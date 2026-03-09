export type ContextComponentType = "docs" | "agents" | "skills" | "plans";
export type MergeStrategy = "skip" | "overwrite" | "rename" | "merge";

export interface ToolCapabilities {
  docs: boolean;
  agents: boolean;
  skills: boolean;
}

export interface ToolPaths {
  docs?: string; // relative to homedir, e.g. ".claude" for CLAUDE.md, ".codex/instructions" for dir
  agents?: string; // e.g. ".claude/agents"
  skills?: string; // e.g. ".claude/skills"
}

export interface ToolDefinition {
  id: string;
  displayName: string;
  capabilities: ToolCapabilities;
  paths: ToolPaths;
  /** File that indicates this tool is present in a project (e.g. "CLAUDE.md", ".cursor/rules") */
  detectionFiles: string[];
  /** Whether rules are a single file (e.g. CLAUDE.md) or a directory (e.g. .cursor/rules/) */
  docsMode: "single-file" | "directory";
  /** For single-file mode, the filename (e.g. "CLAUDE.md", "CONVENTIONS.md") */
  docsFilename?: string;
}

export interface ContextIndex {
  version: 1;
  projectPath: string;
  updatedAt: string;
  items: ContextIndexItem[];
}

export interface ContextIndexItem {
  type: ContextComponentType;
  slug: string;
  path: string;
  fingerprint: string;
  sources: string[];
  lastSyncAt: string;
}

export interface SyncResult {
  tool: string;
  component: ContextComponentType;
  action: "created" | "skipped" | "overwritten" | "renamed" | "error";
  path: string;
  error?: string;
}

export interface SyncSummary {
  timestamp: string;
  direction: "outbound" | "inbound";
  results: SyncResult[];
}
