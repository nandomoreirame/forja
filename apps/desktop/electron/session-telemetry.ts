import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { encodeProjectPath } from "./cli-sessions.js";

export interface SessionTelemetry {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheWriteTokens: number;
  totalCacheReadTokens: number;
  /** Context window usage from the LAST API call (input + cache tokens). */
  lastContextTokens: number;
  /** Context window percentage (0-100). Null when context size is unknown. */
  contextPct: number | null;
  model: string | null;
  lastTool: string | null;
  messageCount: number;
}

interface UsageRecord {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

interface AssistantMessage {
  type?: string;
  message?: {
    model?: string;
    usage?: UsageRecord;
    content?: Array<{ type?: string; name?: string }>;
  };
}

// Claude pricing per 1M tokens (USD)
const PRICING: Record<
  string,
  { input: number; output: number; cacheWrite: number; cacheRead: number }
> = {
  opus: { input: 15.0, output: 75.0, cacheWrite: 18.75, cacheRead: 1.5 },
  sonnet: { input: 3.0, output: 15.0, cacheWrite: 3.75, cacheRead: 0.3 },
  haiku: { input: 0.8, output: 4.0, cacheWrite: 1.0, cacheRead: 0.08 },
};

// Context window sizes per model family.
// Opus 4.6 defaults to 1M context; Sonnet/Haiku use 200k.
const CONTEXT_WINDOW: Record<string, number> = {
  opus: 1_048_576,
  sonnet: 200_000,
  haiku: 200_000,
};

/**
 * Returns context window size for a model.
 * Opus 4.6 always uses 1M context window.
 */
export function getContextWindowSize(model: string | null): number {
  const family = getModelFamily(model);
  if (!family) return 200_000;
  return CONTEXT_WINDOW[family] ?? 200_000;
}

function getModelFamily(model: string | null): string | null {
  if (!model) return null;
  const lower = model.toLowerCase();
  if (lower.includes("opus")) return "opus";
  if (lower.includes("sonnet")) return "sonnet";
  if (lower.includes("haiku")) return "haiku";
  return null;
}

export function parseSessionUsage(lines: string[]): SessionTelemetry {
  const result: SessionTelemetry = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCacheWriteTokens: 0,
    totalCacheReadTokens: 0,
    lastContextTokens: 0,
    contextPct: null,
    model: null,
    lastTool: null,
    messageCount: 0,
  };

  for (const line of lines) {
    if (!line.trim()) continue;
    let obj: AssistantMessage;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }

    if (obj.type !== "assistant" || !obj.message) continue;

    const { model, usage, content } = obj.message;
    if (model) result.model = model;

    if (usage) {
      result.totalInputTokens += usage.input_tokens ?? 0;
      result.totalOutputTokens += usage.output_tokens ?? 0;
      result.totalCacheWriteTokens += usage.cache_creation_input_tokens ?? 0;
      result.totalCacheReadTokens += usage.cache_read_input_tokens ?? 0;
      result.messageCount += 1;

      // Track last API call's context window usage (overwrites each time)
      result.lastContextTokens =
        (usage.input_tokens ?? 0) +
        (usage.cache_creation_input_tokens ?? 0) +
        (usage.cache_read_input_tokens ?? 0);
    }

    if (content && Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "tool_use" && block.name) {
          result.lastTool = block.name;
        }
      }
    }
  }

  // Calculate context window percentage from last message
  if (result.lastContextTokens > 0 && result.model) {
    const windowSize = getContextWindowSize(result.model);
    result.contextPct = Math.min(100, Math.round((result.lastContextTokens / windowSize) * 100));
  }

  return result;
}

export function calculateCost(telemetry: SessionTelemetry): number {
  const family = getModelFamily(telemetry.model);
  if (!family || !PRICING[family]) return 0;
  const p = PRICING[family];
  const M = 1_000_000;

  return (
    (telemetry.totalInputTokens / M) * p.input +
    (telemetry.totalOutputTokens / M) * p.output +
    (telemetry.totalCacheWriteTokens / M) * p.cacheWrite +
    (telemetry.totalCacheReadTokens / M) * p.cacheRead
  );
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}k`;
  }
  return `${tokens}`;
}

/**
 * Reads a JSONL file and returns parsed telemetry.
 * Reads the full file content — suitable for periodic polling (not streaming).
 */
export function readSessionTelemetry(jsonlPath: string): SessionTelemetry | null {
  try {
    const content = fs.readFileSync(jsonlPath, "utf-8");
    const lines = content.split("\n");
    return parseSessionUsage(lines);
  } catch {
    return null;
  }
}

/**
 * Resolves telemetry for a specific CLI session.
 * Currently supports Claude Code only (JSONL-based).
 */
export function getSessionTelemetry(
  cliId: string,
  projectPath: string,
  sessionId: string
): (SessionTelemetry & { costUsd: number }) | null {
  if (cliId !== "claude" || !sessionId) return null;

  const projectDir = path.join(
    os.homedir(),
    ".claude",
    "projects",
    encodeProjectPath(projectPath)
  );
  const jsonlPath = path.join(projectDir, `${sessionId}.jsonl`);

  const telemetry = readSessionTelemetry(jsonlPath);
  if (!telemetry) return null;

  return { ...telemetry, costUsd: calculateCost(telemetry) };
}
