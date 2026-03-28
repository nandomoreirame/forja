/**
 * Chat Context Commands Parser
 *
 * Parses slash commands from chat input and maps them to context hub actions.
 *
 * Supported commands:
 *   /context init
 *   /context status
 *   /context sync out [--strategy <s>] [--tools <t1,t2>]
 *   /context sync in  [--strategy <s>] [--tools <t1,t2>]
 *   /skill create <slug>
 *   /agent create <slug>
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContextCommand {
  type: "context" | "skill" | "agent";
  action: string;
  slug?: string;
  options?: {
    strategy?: string;
    toolIds?: string[];
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses a chat message and returns a ContextCommand if it matches a known
 * slash command pattern. Returns null for non-command messages.
 */
export function parseContextCommand(input: string): ContextCommand | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return null;

  const lower = trimmed.toLowerCase();
  const parts = lower.split(/\s+/);

  if (parts[0] === "/context") {
    return parseContextSubcommand(parts.slice(1), trimmed);
  }

  if (parts[0] === "/skill") {
    return parseItemCommand("skill", parts.slice(1), trimmed);
  }

  if (parts[0] === "/agent") {
    return parseItemCommand("agent", parts.slice(1), trimmed);
  }

  return null;
}

// ---------------------------------------------------------------------------
// Internal parsers
// ---------------------------------------------------------------------------

function parseContextSubcommand(
  parts: string[],
  _raw: string
): ContextCommand | null {
  if (parts.length === 0) return null;

  if (parts[0] === "init") {
    return { type: "context", action: "init" };
  }

  if (parts[0] === "status") {
    return { type: "context", action: "status" };
  }

  if (parts[0] === "sync") {
    const direction = parts[1];
    if (direction === "out") {
      const options = parseOptions(parts.slice(2));
      return {
        type: "context",
        action: "sync_out",
        ...(options ? { options } : {}),
      };
    }
    if (direction === "in") {
      const options = parseOptions(parts.slice(2));
      return {
        type: "context",
        action: "sync_in",
        ...(options ? { options } : {}),
      };
    }
  }

  return null;
}

function parseItemCommand(
  type: "skill" | "agent",
  parts: string[],
  raw: string
): ContextCommand | null {
  if (parts.length < 2 || parts[0] !== "create") return null;

  // Get the slug from the original (non-lowered) input to preserve case
  const rawParts = raw.trim().split(/\s+/);
  const slug = rawParts[2]; // e.g. "/skill create my-Slug" -> "my-Slug"

  return { type, action: "create", slug };
}

function parseOptions(
  parts: string[]
): { strategy?: string; toolIds?: string[] } | undefined {
  if (parts.length === 0) return undefined;

  const result: { strategy?: string; toolIds?: string[] } = {};
  let hasOption = false;

  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === "--strategy" && i + 1 < parts.length) {
      result.strategy = parts[i + 1];
      hasOption = true;
      i++;
    } else if (parts[i] === "--tools" && i + 1 < parts.length) {
      result.toolIds = parts[i + 1].split(",").filter(Boolean);
      hasOption = true;
      i++;
    }
  }

  return hasOption ? result : undefined;
}
