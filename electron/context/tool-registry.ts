import path from "path";
import type { ContextComponentType, ToolCapabilities, ToolDefinition } from "./types.js";

export const TOOL_REGISTRY: Record<string, ToolDefinition> = {
  claude: {
    id: "claude",
    displayName: "Claude Code",
    capabilities: {
      docs: true,
      agents: true,
      skills: true,
    },
    paths: {
      docs: ".claude",
      agents: ".claude/agents",
      skills: ".claude/skills",
    },
    detectionFiles: ["CLAUDE.md"],
    docsMode: "single-file",
    docsFilename: "CLAUDE.md",
  },
  codex: {
    id: "codex",
    displayName: "Codex CLI",
    capabilities: {
      docs: true,
      agents: false,
      skills: true,
    },
    paths: {
      docs: ".codex/instructions",
      skills: ".codex/skills",
    },
    detectionFiles: [".codex/instructions"],
    docsMode: "directory",
  },
  gemini: {
    id: "gemini",
    displayName: "Gemini CLI",
    capabilities: {
      docs: false,
      agents: true,
      skills: true,
    },
    paths: {
      agents: ".gemini/agents",
      skills: ".gemini/skills",
    },
    detectionFiles: [".gemini"],
    docsMode: "directory",
  },
  "cursor-agent": {
    id: "cursor-agent",
    displayName: "Cursor Agent",
    capabilities: {
      docs: true,
      agents: true,
      skills: false,
    },
    paths: {
      docs: ".cursor/rules",
      agents: ".cursor/agents",
    },
    detectionFiles: [".cursor/rules"],
    docsMode: "directory",
  },
  "gh-copilot": {
    id: "gh-copilot",
    displayName: "GitHub Copilot",
    capabilities: {
      docs: true,
      agents: true,
      skills: false,
    },
    paths: {
      docs: ".github",
      agents: ".github/agents",
    },
    detectionFiles: [".github/copilot-instructions.md"],
    docsMode: "single-file",
    docsFilename: "copilot-instructions.md",
  },
  windsurf: {
    id: "windsurf",
    displayName: "Windsurf",
    capabilities: {
      docs: true,
      agents: false,
      skills: false,
    },
    paths: {
      docs: ".windsurf/rules",
    },
    detectionFiles: [".windsurf/rules"],
    docsMode: "directory",
  },
  aider: {
    id: "aider",
    displayName: "Aider",
    capabilities: {
      docs: true,
      agents: false,
      skills: false,
    },
    paths: {
      docs: ".",
    },
    detectionFiles: ["CONVENTIONS.md"],
    docsMode: "single-file",
    docsFilename: "CONVENTIONS.md",
  },
};

/**
 * Returns a ToolDefinition by its ID, or undefined if not found.
 */
export function getToolById(id: string): ToolDefinition | undefined {
  return TOOL_REGISTRY[id];
}

/**
 * Returns all tools that have a given capability enabled.
 */
export function getToolsWithCapability(cap: keyof ToolCapabilities): ToolDefinition[] {
  return Object.values(TOOL_REGISTRY).filter((tool) => tool.capabilities[cap]);
}

/**
 * Resolves the absolute export target path for a given tool, component type, and home directory.
 * Returns null if the tool doesn't support the component type, or if component is "plans".
 */
export function resolveExportTarget(
  toolId: string,
  component: ContextComponentType,
  homedir: string
): string | null {
  // No tool supports plans externally
  if (component === "plans") {
    return null;
  }

  const tool = getToolById(toolId);
  if (!tool) {
    return null;
  }

  if (component === "docs") {
    if (!tool.capabilities.docs || !tool.paths.docs) {
      return null;
    }
    return path.join(homedir, tool.paths.docs);
  }

  if (component === "agents") {
    if (!tool.capabilities.agents || !tool.paths.agents) {
      return null;
    }
    return path.join(homedir, tool.paths.agents);
  }

  if (component === "skills") {
    if (!tool.capabilities.skills || !tool.paths.skills) {
      return null;
    }
    return path.join(homedir, tool.paths.skills);
  }

  return null;
}

/**
 * Returns all registered tool IDs.
 */
export function getAllToolIds(): string[] {
  return Object.keys(TOOL_REGISTRY);
}
