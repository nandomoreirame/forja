import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface CliSessionEntry {
  sessionId: string;
  summary?: string;
  firstPrompt?: string;
  modified: string;
  created?: string;
  projectPath?: string;
}

/**
 * Encodes a project path the same way Claude Code does:
 * replace all non-alphanumeric characters (except hyphens) with "-".
 * e.g. "/home/user/project.app" → "-home-user-project-app"
 */
export function encodeProjectPath(projectPath: string): string {
  return projectPath.replace(/[^a-zA-Z0-9-]/g, "-");
}

/**
 * Returns the Claude Code project directory for a given project path.
 * e.g. ~/.claude/projects/-home-user-project/
 */
function getClaudeProjectDir(projectPath: string): string {
  return path.join(os.homedir(), ".claude", "projects", encodeProjectPath(projectPath));
}

/**
 * Reads sessions-index.json if it exists and returns entries as a map
 * keyed by sessionId for quick lookup of summary/firstPrompt.
 */
function readSessionsIndex(projectDir: string): Map<string, { summary?: string; firstPrompt?: string }> {
  const indexPath = path.join(projectDir, "sessions-index.json");
  const map = new Map<string, { summary?: string; firstPrompt?: string }>();
  try {
    const raw = fs.readFileSync(indexPath, "utf-8");
    const data = JSON.parse(raw);
    if (data?.entries && Array.isArray(data.entries)) {
      for (const entry of data.entries) {
        if (entry.sessionId) {
          map.set(entry.sessionId, {
            summary: entry.summary,
            firstPrompt: entry.firstPrompt,
          });
        }
      }
    }
  } catch {
    // File doesn't exist or is invalid — that's fine
  }
  return map;
}

/**
 * Lists Claude Code sessions for a project by scanning .jsonl files
 * in ~/.claude/projects/<encoded-path>/.
 *
 * Returns entries sorted by modification time (newest first).
 * Enriches with summary/firstPrompt from sessions-index.json when available.
 */
export function getClaudeSessions(projectPath: string, limit = 20): CliSessionEntry[] {
  const projectDir = getClaudeProjectDir(projectPath);

  let files: string[];
  try {
    files = fs.readdirSync(projectDir).filter((f) => f.endsWith(".jsonl"));
  } catch {
    return [];
  }

  // Get modification times and sort newest first
  const withStats = files
    .map((filename) => {
      const fullPath = path.join(projectDir, filename);
      try {
        const stat = fs.statSync(fullPath);
        return {
          sessionId: filename.replace(".jsonl", ""),
          modified: stat.mtime,
          fullPath,
        };
      } catch {
        return null;
      }
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  withStats.sort((a, b) => b.modified.getTime() - a.modified.getTime());

  // Enrich with sessions-index.json metadata (summary from /rename)
  const indexMap = readSessionsIndex(projectDir);

  return withStats.slice(0, limit).map((entry) => {
    const indexed = indexMap.get(entry.sessionId);
    return {
      sessionId: entry.sessionId,
      summary: indexed?.summary,
      firstPrompt: indexed?.firstPrompt,
      modified: entry.modified.toISOString(),
    };
  });
}

/**
 * Finds the most recently modified Claude session for a project.
 * Returns the sessionId or null if no sessions exist.
 */
export function getMostRecentClaudeSession(projectPath: string): CliSessionEntry | null {
  const sessions = getClaudeSessions(projectPath, 1);
  return sessions[0] ?? null;
}

// ---------------------------------------------------------------------------
// Gemini CLI
// ---------------------------------------------------------------------------

/**
 * Reads the Gemini projects.json and returns the project name for a given path.
 * Returns null if the path is not registered in projects.json.
 */
function getGeminiProjectName(projectPath: string): string | null {
  const projectsJsonPath = path.join(os.homedir(), ".gemini", "projects.json");
  try {
    const raw = fs.readFileSync(projectsJsonPath, "utf-8");
    const data = JSON.parse(raw) as { projects?: Record<string, string> };
    return data.projects?.[projectPath] ?? null;
  } catch {
    return null;
  }
}

/**
 * Extracts the first user text prompt from a Gemini session's messages array.
 */
function extractGeminiFirstPrompt(
  messages: Array<{ type: string; content: unknown }>
): string | undefined {
  const firstUser = messages.find((m) => m.type === "user");
  if (!firstUser) return undefined;
  const content = firstUser.content;
  if (Array.isArray(content)) {
    const textPart = (content as Array<{ text?: string }>).find((c) => c.text);
    return textPart?.text;
  }
  return undefined;
}

/**
 * Lists Gemini CLI sessions for a project by scanning session JSON files in
 * ~/.gemini/tmp/<project-name>/chats/.
 *
 * Requires the project path to be registered in ~/.gemini/projects.json.
 * Returns entries sorted by lastUpdated (newest first).
 */
export function getGeminiSessions(projectPath: string, limit = 20): CliSessionEntry[] {
  const projectName = getGeminiProjectName(projectPath);
  if (!projectName) return [];

  const chatsDir = path.join(os.homedir(), ".gemini", "tmp", projectName, "chats");

  let files: string[];
  try {
    files = (fs.readdirSync(chatsDir) as unknown as string[]).filter(
      (f) => f.endsWith(".json") && f.startsWith("session-")
    );
  } catch {
    return [];
  }

  const entries: CliSessionEntry[] = [];

  for (const filename of files) {
    const fullPath = path.join(chatsDir, filename);
    try {
      const raw = fs.readFileSync(fullPath, "utf-8");
      const data = JSON.parse(raw) as {
        sessionId?: string;
        startTime?: string;
        lastUpdated?: string;
        messages?: Array<{ type: string; content: unknown }>;
      };

      if (!data.sessionId || !data.lastUpdated) continue;

      entries.push({
        sessionId: data.sessionId,
        firstPrompt: extractGeminiFirstPrompt(data.messages ?? []),
        modified: data.lastUpdated,
        created: data.startTime,
      });
    } catch {
      // Skip malformed files
    }
  }

  entries.sort(
    (a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()
  );

  return entries.slice(0, limit);
}

/**
 * Finds the most recently modified Gemini session for a project.
 */
export function getMostRecentGeminiSession(projectPath: string): CliSessionEntry | null {
  const sessions = getGeminiSessions(projectPath, 1);
  return sessions[0] ?? null;
}

// ---------------------------------------------------------------------------
// Codex CLI
// ---------------------------------------------------------------------------

/**
 * Recursively finds all .jsonl files under a directory, walking up to maxDepth
 * levels deep. Used to scan ~/.codex/sessions/YYYY/MM/DD/ structure.
 */
function findJsonlFilesRecursive(dir: string, maxDepth = 4): string[] {
  const results: string[] = [];

  function walk(current: string, depth: number): void {
    if (depth > maxDepth) return;
    let entries: string[];
    try {
      entries = fs.readdirSync(current) as unknown as string[];
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walk(fullPath, depth + 1);
        } else if (stat.isFile() && entry.endsWith(".jsonl")) {
          results.push(fullPath);
        }
      } catch {
        // Skip inaccessible entries
      }
    }
  }

  walk(dir, 0);
  return results;
}

/**
 * Reads the first line of a JSONL file and parses it as the Codex session_meta record.
 * Returns null if the file does not start with a valid session_meta entry.
 */
function readCodexSessionMeta(
  filePath: string
): { id: string; cwd: string; timestamp: string } | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const firstLine = raw.split("\n")[0];
    if (!firstLine) return null;

    const parsed = JSON.parse(firstLine) as {
      type?: string;
      payload?: { id?: string; cwd?: string; timestamp?: string };
    };

    if (parsed.type !== "session_meta") return null;
    const { id, cwd, timestamp } = parsed.payload ?? {};
    if (!id || !cwd || !timestamp) return null;

    return { id, cwd, timestamp };
  } catch {
    return null;
  }
}

/**
 * Lists Codex CLI sessions for a project by scanning ~/.codex/sessions/ recursively
 * and filtering by the cwd embedded in each session's session_meta record.
 *
 * Returns entries sorted by session timestamp (newest first).
 */
export function getCodexSessions(projectPath: string, limit = 20): CliSessionEntry[] {
  const sessionsDir = path.join(os.homedir(), ".codex", "sessions");
  const allFiles = findJsonlFilesRecursive(sessionsDir, 4);

  const entries: CliSessionEntry[] = [];

  for (const filePath of allFiles) {
    const meta = readCodexSessionMeta(filePath);
    if (!meta) continue;
    if (meta.cwd !== projectPath) continue;

    entries.push({
      sessionId: meta.id,
      modified: meta.timestamp,
      created: meta.timestamp,
    });
  }

  entries.sort(
    (a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()
  );

  return entries.slice(0, limit);
}

/**
 * Finds the most recently modified Codex session for a project.
 */
export function getMostRecentCodexSession(projectPath: string): CliSessionEntry | null {
  const sessions = getCodexSessions(projectPath, 1);
  return sessions[0] ?? null;
}

// ---------------------------------------------------------------------------
// Cursor Agent
// ---------------------------------------------------------------------------

/** UUID v4 pattern for validating session filenames from Cursor. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Encodes a project path the same way Cursor Agent does:
 * strips the leading "/" and replaces remaining "/" with "-".
 * e.g. "/home/user/project" → "home-user-project"
 */
function encodeCursorProjectPath(projectPath: string): string {
  return projectPath.replace(/^\//, "").replace(/\//g, "-");
}

/**
 * Returns the Cursor Agent project directory for a given project path.
 * e.g. ~/.cursor/projects/home-user-project/
 */
function getCursorProjectDir(projectPath: string): string {
  return path.join(
    os.homedir(),
    ".cursor",
    "projects",
    encodeCursorProjectPath(projectPath)
  );
}

/**
 * Lists Cursor Agent sessions for a project by scanning
 * ~/.cursor/projects/<encoded-path>/agent-transcripts/.
 *
 * Sessions may be flat files (<UUID>.jsonl) or subdirectories (<UUID>/<UUID>.jsonl).
 * The session ID is the UUID extracted from the filename.
 *
 * Returns entries sorted by modification time (newest first).
 */
export function getCursorSessions(projectPath: string, limit = 20): CliSessionEntry[] {
  const transcriptsDir = path.join(
    getCursorProjectDir(projectPath),
    "agent-transcripts"
  );

  let entries: string[];
  try {
    entries = fs.readdirSync(transcriptsDir) as unknown as string[];
  } catch {
    return [];
  }

  const sessions: Array<{ sessionId: string; mtime: Date }> = [];

  for (const entry of entries) {
    const entryPath = path.join(transcriptsDir, entry);

    try {
      const stat = fs.statSync(entryPath);

      if (stat.isFile() && entry.endsWith(".jsonl")) {
        // Flat format: <UUID>.jsonl
        const sessionId = entry.replace(/\.jsonl$/, "");
        if (!UUID_PATTERN.test(sessionId)) continue;
        sessions.push({ sessionId, mtime: stat.mtime });
      } else if (stat.isDirectory() && UUID_PATTERN.test(entry)) {
        // Subdirectory format: <UUID>/<UUID>.jsonl
        const innerFile = path.join(entryPath, `${entry}.jsonl`);
        try {
          const innerStat = fs.statSync(innerFile);
          sessions.push({ sessionId: entry, mtime: innerStat.mtime });
        } catch {
          // Inner file missing — skip
        }
      }
    } catch {
      // Skip inaccessible entries
    }
  }

  sessions.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  return sessions.slice(0, limit).map(({ sessionId, mtime }) => ({
    sessionId,
    modified: mtime.toISOString(),
  }));
}

/**
 * Finds the most recently modified Cursor Agent session for a project.
 */
export function getMostRecentCursorSession(projectPath: string): CliSessionEntry | null {
  const sessions = getCursorSessions(projectPath, 1);
  return sessions[0] ?? null;
}

// ---------------------------------------------------------------------------
// Unified dispatcher
// ---------------------------------------------------------------------------

/**
 * Unified session reader: dispatches to the correct per-CLI implementation
 * based on the cliId provided.
 *
 * Returns an empty array for CLIs that do not support filesystem session detection
 * (e.g., gh-copilot).
 */
export function getCliSessions(
  cliId: string,
  projectPath: string,
  limit = 20
): CliSessionEntry[] {
  switch (cliId) {
    case "claude":
      return getClaudeSessions(projectPath, limit);
    case "gemini":
      return getGeminiSessions(projectPath, limit);
    case "codex":
      return getCodexSessions(projectPath, limit);
    case "cursor-agent":
      return getCursorSessions(projectPath, limit);
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Model extraction
// ---------------------------------------------------------------------------

/**
 * Extracts the model ID from a JSONL session file by finding the first
 * assistant message and reading its `message.model` field.
 *
 * Returns null if the file doesn't exist, can't be parsed, or contains
 * no assistant messages with a model field.
 */
export function getSessionModel(jsonlPath: string): string | null {
  try {
    const content = fs.readFileSync(jsonlPath, "utf-8");
    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line) as {
          type?: string;
          message?: { model?: string };
        };
        if (obj.type === "assistant" && obj.message?.model) {
          return obj.message.model;
        }
      } catch {
        // Skip malformed lines
      }
    }
  } catch {
    // File doesn't exist or can't be read
  }
  return null;
}

/**
 * Resolves the active model for a running CLI session.
 *
 * For Claude Code: reads the session JSONL from ~/.claude/projects/<encoded-path>/<sessionId>.jsonl.
 * Returns null for terminal sessions, CLIs without JSONL support, or when no model is found.
 */
export function getActiveSessionModel(
  cliId: string,
  projectPath: string,
  sessionId?: string
): string | null {
  if (cliId === "terminal" || cliId === "gh-copilot") return null;

  if (cliId === "claude" && sessionId) {
    const projectDir = getClaudeProjectDir(projectPath);
    const jsonlPath = path.join(projectDir, `${sessionId}.jsonl`);
    return getSessionModel(jsonlPath);
  }

  return null;
}
