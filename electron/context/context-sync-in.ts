/**
 * Context Sync Inbound Service
 *
 * Imports (syncs) docs, agents, and skills FROM each installed AI CLI's
 * config directory INTO the context hub at <project>/.forja/context/.
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
import { readIndex, updateIndex, computeFingerprint } from "./context-hub.js";
import type { HubComponentType } from "./context-hub.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONTEXT_DIR = ".forja/context";
const SYNC_LOG = ".sync-log.jsonl";

// Map plural component names to singular hub types
const COMPONENT_TO_HUB: Record<string, HubComponentType> = {
  skills: "skill",
  agents: "agent",
  docs: "doc",
  plans: "plan",
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface SyncInboundOptions {
  /** How to handle pre-existing hub items. Defaults to "skip". */
  strategy?: MergeStrategy;
  /** Limit import to these tool IDs. Defaults to all registered tools. */
  toolIds?: string[];
  /** Limit import to these component types. Defaults to docs, agents, skills. */
  components?: ContextComponentType[];
}

/**
 * Imports components from installed AI CLI config directories into the
 * canonical context hub at <project>/.forja/context/.
 *
 * @param projectPath  Absolute path to the project root.
 * @param options      Optional filters and merge strategy.
 * @returns            A SyncSummary describing every action taken.
 */
export async function syncInbound(
  projectPath: string,
  options: SyncInboundOptions = {}
): Promise<SyncSummary> {
  const { strategy = "skip", toolIds, components } = options;
  const home = os.homedir();
  const results: SyncResult[] = [];

  // Read the current canonical index
  const index = await readIndex(projectPath);

  const targetToolIds = toolIds ?? getAllToolIds();
  const targetComponents: ContextComponentType[] =
    components ?? ["docs", "agents", "skills"];

  for (const component of targetComponents) {
    // Plans are never imported from external tools
    if (component === "plans") continue;

    const hubType = COMPONENT_TO_HUB[component];
    if (!hubType) continue;

    for (const toolId of targetToolIds) {
      const tool = getToolById(toolId);
      if (!tool) continue;

      // Check if tool supports this component
      const sourceDir = resolveExportTarget(toolId, component, home);
      if (!sourceDir) continue;

      if (component === "docs") {
        const docResults = await importDocs(
          projectPath,
          tool,
          sourceDir,
          index,
          hubType,
          strategy
        );
        results.push(...docResults);
      } else if (component === "agents") {
        const agentResults = await importAgents(
          projectPath,
          sourceDir,
          toolId,
          component,
          index,
          hubType,
          strategy
        );
        results.push(...agentResults);
      } else if (component === "skills") {
        const skillResults = await importSkills(
          projectPath,
          sourceDir,
          toolId,
          component,
          index,
          hubType,
          strategy
        );
        results.push(...skillResults);
      }
    }
  }

  const summary: SyncSummary = {
    timestamp: new Date().toISOString(),
    direction: "inbound",
    results,
  };

  await appendSyncLog(projectPath, summary);

  return summary;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface IndexLike {
  items: Array<{ type: string; slug: string }>;
}

/**
 * Imports docs from a single CLI tool into the hub.
 *
 * - single-file mode (e.g. claude CLAUDE.md): import as a single doc with
 *   slug derived from the tool id.
 * - directory mode (e.g. cursor .cursor/rules/): import each file as a
 *   separate doc.
 */
async function importDocs(
  projectPath: string,
  tool: NonNullable<ReturnType<typeof getToolById>>,
  sourceDir: string,
  index: IndexLike,
  hubType: HubComponentType,
  strategy: MergeStrategy
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  if (tool.docsMode === "single-file") {
    const filename = tool.docsFilename ?? "DOCS.md";
    const sourcePath = path.join(sourceDir, filename);

    if (!(await fileExists(sourcePath))) return results;

    const slug = tool.id;
    const hubPath = path.join(projectPath, CONTEXT_DIR, "docs", `${slug}.md`);
    const existing = index.items.find((i) => i.type === hubType && i.slug === slug);

    const result = await importFile(
      sourcePath,
      hubPath,
      tool.id,
      "docs",
      !!existing,
      strategy
    );
    results.push(result);

    if (result.action === "created" || result.action === "overwritten" || result.action === "renamed") {
      const content = await safeReadFile(sourcePath);
      if (content !== null) {
        await updateIndex(projectPath, {
          type: hubType,
          slug,
          path: `docs/${slug}.md`,
          content,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  } else {
    // Directory mode: import each file
    if (!(await dirExists(sourceDir))) return results;

    const entries = await safeReaddir(sourceDir);
    for (const entry of entries) {
      if (!entry.endsWith(".md")) continue;

      const slug = path.basename(entry, ".md");
      const sourcePath = path.join(sourceDir, entry);
      const hubPath = path.join(projectPath, CONTEXT_DIR, "docs", `${slug}.md`);
      const existing = index.items.find((i) => i.type === hubType && i.slug === slug);

      const result = await importFile(
        sourcePath,
        hubPath,
        tool.id,
        "docs",
        !!existing,
        strategy
      );
      results.push(result);

      if (result.action === "created" || result.action === "overwritten" || result.action === "renamed") {
        const content = await safeReadFile(sourcePath);
        if (content !== null) {
          await updateIndex(projectPath, {
            type: hubType,
            slug,
            path: `docs/${slug}.md`,
            content,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  return results;
}

/**
 * Imports agent .md files from a CLI tool directory into the hub.
 */
async function importAgents(
  projectPath: string,
  sourceDir: string,
  toolId: string,
  component: ContextComponentType,
  index: IndexLike,
  hubType: HubComponentType,
  strategy: MergeStrategy
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  if (!(await dirExists(sourceDir))) return results;

  const entries = await safeReaddir(sourceDir);
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;

    const slug = path.basename(entry, ".md");
    const sourcePath = path.join(sourceDir, entry);
    const hubPath = path.join(projectPath, CONTEXT_DIR, "agents", `${slug}.md`);
    const existing = index.items.find((i) => i.type === hubType && i.slug === slug);

    const result = await importFile(
      sourcePath,
      hubPath,
      toolId,
      component,
      !!existing,
      strategy
    );
    results.push(result);

    if (result.action === "created" || result.action === "overwritten" || result.action === "renamed") {
      const content = await safeReadFile(sourcePath);
      if (content !== null) {
        await updateIndex(projectPath, {
          type: hubType,
          slug,
          path: `agents/${slug}.md`,
          content,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  return results;
}

/**
 * Imports skill directories from a CLI tool directory into the hub.
 */
async function importSkills(
  projectPath: string,
  sourceDir: string,
  toolId: string,
  component: ContextComponentType,
  index: IndexLike,
  hubType: HubComponentType,
  strategy: MergeStrategy
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  if (!(await dirExists(sourceDir))) return results;

  const entries = await safeReaddir(sourceDir);
  for (const entry of entries) {
    const entryPath = path.join(sourceDir, entry);
    const stat = await safeStat(entryPath);
    if (!stat || !stat.isDirectory()) continue;

    const slug = entry;
    const hubSkillDir = path.join(projectPath, CONTEXT_DIR, "skills", slug);
    const existing = index.items.find((i) => i.type === hubType && i.slug === slug);

    const result = await importDir(
      entryPath,
      hubSkillDir,
      toolId,
      component,
      !!existing,
      strategy
    );
    results.push(result);

    if (result.action === "created" || result.action === "overwritten") {
      // Try to read skill content for index
      const skillFile = path.join(entryPath, "SKILL.md");
      const content = await safeReadFile(skillFile);
      if (content !== null) {
        await updateIndex(projectPath, {
          type: hubType,
          slug,
          path: `skills/${slug}/SKILL.md`,
          content,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  return results;
}

/**
 * Imports a single file into the hub, applying the merge strategy.
 */
async function importFile(
  sourcePath: string,
  hubPath: string,
  toolId: string,
  component: ContextComponentType,
  existsInHub: boolean,
  strategy: MergeStrategy
): Promise<SyncResult> {
  if (existsInHub && strategy === "skip") {
    return { tool: toolId, component, action: "skipped", path: hubPath };
  }

  try {
    const content = await fs.readFile(sourcePath, "utf-8");
    await fs.mkdir(path.dirname(hubPath), { recursive: true });

    if (existsInHub && strategy === "rename") {
      const ext = path.extname(hubPath);
      const base = hubPath.slice(0, -ext.length);
      const renamedPath = `${base}.${toolId}${ext}`;
      await fs.writeFile(renamedPath, content, "utf-8");
      return { tool: toolId, component, action: "renamed", path: renamedPath };
    }

    await fs.writeFile(hubPath, content, "utf-8");
    return {
      tool: toolId,
      component,
      action: existsInHub ? "overwritten" : "created",
      path: hubPath,
    };
  } catch (err) {
    return {
      tool: toolId,
      component,
      action: "error",
      path: hubPath,
      error: (err as Error).message,
    };
  }
}

/**
 * Imports a directory (e.g. a skill folder) into the hub.
 */
async function importDir(
  sourceDir: string,
  hubDir: string,
  toolId: string,
  component: ContextComponentType,
  existsInHub: boolean,
  strategy: MergeStrategy
): Promise<SyncResult> {
  if (existsInHub && strategy === "skip") {
    return { tool: toolId, component, action: "skipped", path: hubDir };
  }

  try {
    await fs.mkdir(hubDir, { recursive: true });
    await fs.cp(sourceDir, hubDir, { recursive: true });

    return {
      tool: toolId,
      component,
      action: existsInHub ? "overwritten" : "created",
      path: hubDir,
    };
  } catch (err) {
    return {
      tool: toolId,
      component,
      action: "error",
      path: hubDir,
      error: (err as Error).message,
    };
  }
}

/**
 * Appends a JSON line to the project's sync log.
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

async function safeReadFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

async function safeReaddir(dirPath: string): Promise<string[]> {
  try {
    return (await fs.readdir(dirPath)) as string[];
  } catch {
    return [];
  }
}

async function safeStat(filePath: string): Promise<Awaited<ReturnType<typeof fs.stat>> | null> {
  try {
    return await fs.stat(filePath);
  } catch {
    return null;
  }
}
