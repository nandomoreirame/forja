/**
 * Context Sync Outbound Service
 *
 * Exports (syncs) docs, agents, and skills FROM the context hub
 * AT <project>/.forja/context/ TO each installed AI CLI's config directory.
 */

import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import type { ContextComponentType, MergeStrategy, SyncResult, SyncSummary } from "./types.js";
import {
  getAllToolIds,
  getToolById,
  resolveExportTarget,
} from "./tool-registry.js";
import { readIndex } from "./context-hub.js";
import type { HubComponentType } from "./context-hub.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONTEXT_DIR = ".forja/context";
const SYNC_LOG = ".sync-log.jsonl";

// Map hub singular types to plural component types used by the tool registry
const HUB_TO_COMPONENT: Record<HubComponentType, ContextComponentType> = {
  skill: "skills",
  agent: "agents",
  doc: "docs",
  plan: "plans",
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface SyncOutboundOptions {
  /** How to handle pre-existing target files. Defaults to "skip". */
  strategy?: MergeStrategy;
  /** Limit export to these tool IDs. Defaults to all registered tools. */
  toolIds?: string[];
  /** Limit export to these component types. Defaults to docs, agents, skills. */
  components?: ContextComponentType[];
}

/**
 * Exports all hub components to the config directories of each installed AI CLI.
 *
 * @param projectPath  Absolute path to the project root.
 * @param options      Optional filters and merge strategy.
 * @returns            A SyncSummary describing every action taken.
 */
export async function syncOutbound(
  projectPath: string,
  options: SyncOutboundOptions = {}
): Promise<SyncSummary> {
  const { strategy = "skip", toolIds, components } = options;
  const home = os.homedir();
  const results: SyncResult[] = [];

  // Read the canonical index from the context hub
  const index = await readIndex(projectPath);

  // Determine which tools to export to
  const targetToolIds = toolIds ?? getAllToolIds();

  // Determine which components to export (plans are never exported outbound)
  const targetComponents: ContextComponentType[] =
    components ?? ["docs", "agents", "skills"];

  for (const component of targetComponents) {
    // Plans are never exported to external tools
    if (component === "plans") continue;

    // Map plural component name back to singular hub type for index filtering
    const hubType = Object.entries(HUB_TO_COMPONENT).find(
      ([, v]) => v === component
    )?.[0] as HubComponentType | undefined;

    const items = hubType
      ? index.items.filter((item) => item.type === hubType)
      : [];

    for (const toolId of targetToolIds) {
      const tool = getToolById(toolId);
      if (!tool) continue;

      // resolveExportTarget returns null when the tool doesn't support this component
      const targetDir = resolveExportTarget(toolId, component, home);
      if (!targetDir) continue;

      if (component === "docs") {
        const docResults = await exportDocs(
          projectPath,
          tool,
          targetDir,
          items,
          strategy
        );
        results.push(...docResults);
      } else if (component === "agents") {
        for (const item of items) {
          const sourcePath = path.join(
            projectPath,
            CONTEXT_DIR,
            "agents",
            `${item.slug}.md`
          );
          const targetPath = path.join(targetDir, `${item.slug}.md`);
          const result = await copyWithStrategy(
            sourcePath,
            targetPath,
            tool.id,
            component,
            strategy
          );
          results.push(result);
        }
      } else if (component === "skills") {
        for (const item of items) {
          const sourceDir = path.join(
            projectPath,
            CONTEXT_DIR,
            "skills",
            item.slug
          );
          const targetSkillDir = path.join(targetDir, item.slug);
          const result = await copyDirWithStrategy(
            sourceDir,
            targetSkillDir,
            tool.id,
            component,
            strategy
          );
          results.push(result);
        }
      }
    }
  }

  const summary: SyncSummary = {
    timestamp: new Date().toISOString(),
    direction: "outbound",
    results,
  };

  // Append a single JSON line to the sync log for audit purposes
  await appendSyncLog(projectPath, summary);

  return summary;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Exports documentation items to the target tool's docs location.
 *
 * - single-file mode (e.g. claude → CLAUDE.md): concatenate all doc content
 *   into one file.
 * - directory mode (e.g. cursor → .cursor/rules/): copy each doc file
 *   individually.
 */
async function exportDocs(
  projectPath: string,
  tool: ReturnType<typeof getToolById> & object,
  targetDir: string,
  items: Array<{ slug: string; path: string }>,
  strategy: MergeStrategy
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  if (tool.docsMode === "single-file") {
    // Concatenate all doc files into a single target file
    const filename = tool.docsFilename ?? "DOCS.md";
    const targetPath = path.join(targetDir, filename);

    // Collect content from all doc files
    const sections: string[] = [];
    for (const item of items) {
      const sourcePath = path.join(projectPath, CONTEXT_DIR, "docs", `${item.slug}.md`);
      try {
        const content = await fs.readFile(sourcePath, "utf-8");
        sections.push(content);
      } catch {
        // Source file missing — skip silently
      }
    }

    const combined = sections.join("\n\n---\n\n");
    const result = await writeWithStrategy(targetPath, combined, tool.id, "docs", strategy);
    results.push(result);
  } else {
    // Directory mode: copy each doc file individually
    await fs.mkdir(targetDir, { recursive: true });
    for (const item of items) {
      const sourcePath = path.join(projectPath, CONTEXT_DIR, "docs", `${item.slug}.md`);
      const targetPath = path.join(targetDir, `${item.slug}.md`);
      const result = await copyWithStrategy(
        sourcePath,
        targetPath,
        tool.id,
        "docs",
        strategy
      );
      results.push(result);
    }
  }

  return results;
}

/**
 * Copies a single file to the target path, applying the merge strategy when
 * the target already exists.
 */
async function copyWithStrategy(
  sourcePath: string,
  targetPath: string,
  toolId: string,
  component: ContextComponentType,
  strategy: MergeStrategy
): Promise<SyncResult> {
  const targetExists = await fileExists(targetPath);

  if (targetExists && strategy === "skip") {
    return { tool: toolId, component, action: "skipped", path: targetPath };
  }

  try {
    // Read source and write to target
    const content = await fs.readFile(sourcePath, "utf-8");
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, content, "utf-8");

    return {
      tool: toolId,
      component,
      action: targetExists ? "overwritten" : "created",
      path: targetPath,
    };
  } catch (err) {
    return {
      tool: toolId,
      component,
      action: "error",
      path: targetPath,
      error: (err as Error).message,
    };
  }
}

/**
 * Writes content to a target path, applying the merge strategy when the
 * target already exists. Used for single-file doc exports.
 */
async function writeWithStrategy(
  targetPath: string,
  content: string,
  toolId: string,
  component: ContextComponentType,
  strategy: MergeStrategy
): Promise<SyncResult> {
  const targetExists = await fileExists(targetPath);

  if (targetExists && strategy === "skip") {
    return { tool: toolId, component, action: "skipped", path: targetPath };
  }

  try {
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, content, "utf-8");

    return {
      tool: toolId,
      component,
      action: targetExists ? "overwritten" : "created",
      path: targetPath,
    };
  } catch (err) {
    return {
      tool: toolId,
      component,
      action: "error",
      path: targetPath,
      error: (err as Error).message,
    };
  }
}

/**
 * Copies an entire directory (e.g. a skill directory) to the target location,
 * applying the merge strategy to determine whether to skip or overwrite.
 *
 * For skills the target is the skill directory itself (e.g. ~/.claude/skills/tdd).
 */
async function copyDirWithStrategy(
  sourceDir: string,
  targetDir: string,
  toolId: string,
  component: ContextComponentType,
  strategy: MergeStrategy
): Promise<SyncResult> {
  const targetExists = await dirExists(targetDir);

  if (targetExists && strategy === "skip") {
    return { tool: toolId, component, action: "skipped", path: targetDir };
  }

  try {
    await fs.mkdir(targetDir, { recursive: true });
    await fs.cp(sourceDir, targetDir, { recursive: true });

    return {
      tool: toolId,
      component,
      action: targetExists ? "overwritten" : "created",
      path: targetDir,
    };
  } catch (err) {
    return {
      tool: toolId,
      component,
      action: "error",
      path: targetDir,
      error: (err as Error).message,
    };
  }
}

/**
 * Appends a JSON line (JSONL) entry to the project's sync log file at
 * <project>/.forja/context/.sync-log.jsonl.
 */
async function appendSyncLog(
  projectPath: string,
  summary: SyncSummary
): Promise<void> {
  const logPath = path.join(projectPath, CONTEXT_DIR, SYNC_LOG);
  const line = JSON.stringify(summary) + "\n";
  await fs.appendFile(logPath, line, "utf-8");
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function dirExists(dirPath: string): Promise<boolean> {
  try {
    await fs.access(dirPath);
    return true;
  } catch {
    return false;
  }
}
