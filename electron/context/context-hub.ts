/**
 * Context Hub Service
 *
 * Manages the canonical source of truth at <project>/.forja/context/
 * Stores agents, skills, docs, and plans as markdown files with frontmatter.
 * Tracks all items in a .index.json manifest with SHA-256 fingerprints.
 */

import * as fs from "fs/promises";
import * as path from "path";
import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// Types (local, singular form — separate from tool-registry types)
// ---------------------------------------------------------------------------

/** Supported component types for the context hub */
export type HubComponentType = "skill" | "agent" | "doc" | "plan";

/** A single item tracked in the context index */
export interface HubIndexItem {
  type: HubComponentType;
  slug: string;
  /** Relative path from the context hub root */
  path: string;
  fingerprint: string;
  updatedAt: string;
  lastSyncAt?: string;
}

/** The canonical index stored at .forja/context/.index.json */
export interface HubIndex {
  version: number;
  items: HubIndexItem[];
  updatedAt: string;
}

// Re-export under the names expected by the task spec for external callers
export type ContextComponentType = HubComponentType;
export type ContextIndex = HubIndex;
export type ContextIndexItem = HubIndexItem;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONTEXT_DIR = ".forja/context";
const INDEX_FILE = ".index.json";
const SUBDIRS = ["docs", "agents", "skills", "plans"] as const;

const DEFAULT_INDEX: HubIndex = {
  version: 1,
  items: [],
  updatedAt: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function contextRoot(projectPath: string): string {
  return path.join(projectPath, CONTEXT_DIR);
}

function indexPath(projectPath: string): string {
  return path.join(contextRoot(projectPath), INDEX_FILE);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Ensures the .forja/context/ directory structure exists.
 * Creates subdirectories (docs, agents, skills, plans) and initialises
 * .index.json only if it is not already present.
 */
export async function ensureContextHub(projectPath: string): Promise<void> {
  // Create all subdirectories (recursive — idempotent)
  for (const subdir of SUBDIRS) {
    await fs.mkdir(path.join(contextRoot(projectPath), subdir), { recursive: true });
  }

  // Create .index.json only when absent
  const idxPath = indexPath(projectPath);
  try {
    await fs.access(idxPath);
    // File exists — do nothing
  } catch {
    // File does not exist — create with defaults
    const initial: HubIndex = { ...DEFAULT_INDEX, updatedAt: new Date().toISOString() };
    await fs.writeFile(idxPath, JSON.stringify(initial, null, 2), "utf-8");
  }
}

/**
 * Creates a new skill file at skills/<slug>/SKILL.md.
 * Returns the absolute path of the created file.
 * Throws if the skill already exists (unless force=true).
 */
export async function createSkill(
  projectPath: string,
  slug: string,
  options: { content?: string; force?: boolean } = {}
): Promise<string> {
  const { content, force = false } = options;

  // Guard: check index for existing item
  const index = await readIndex(projectPath);
  const existing = index.items.find((i) => i.type === "skill" && i.slug === slug);
  if (existing && !force) {
    throw new Error(`Skill "${slug}" already exists at ${existing.path}`);
  }

  const skillDir = path.join(contextRoot(projectPath), "skills", slug);
  await fs.mkdir(skillDir, { recursive: true });

  const body = content ?? `---\nname: ${slug}\ndescription: \n---\n`;
  const filePath = path.join(skillDir, "SKILL.md");
  await fs.writeFile(filePath, body, "utf-8");

  // Update the index
  const relativePath = `skills/${slug}/SKILL.md`;
  await updateIndex(projectPath, {
    type: "skill",
    slug,
    path: relativePath,
    content: body,
    updatedAt: new Date().toISOString(),
  });

  return filePath;
}

/**
 * Creates a new agent file at agents/<slug>.md.
 * Returns the absolute path of the created file.
 * Throws if the agent already exists (unless force=true).
 */
export async function createAgent(
  projectPath: string,
  slug: string,
  options: { content?: string; force?: boolean } = {}
): Promise<string> {
  const { content, force = false } = options;

  // Guard: check index for existing item
  const index = await readIndex(projectPath);
  const existing = index.items.find((i) => i.type === "agent" && i.slug === slug);
  if (existing && !force) {
    throw new Error(`Agent "${slug}" already exists at ${existing.path}`);
  }

  const agentsDir = path.join(contextRoot(projectPath), "agents");
  await fs.mkdir(agentsDir, { recursive: true });

  const body = content ?? `---\nname: ${slug}\ndescription: \nmodel: inherit\n---\n`;
  const filePath = path.join(agentsDir, `${slug}.md`);
  await fs.writeFile(filePath, body, "utf-8");

  // Update the index
  const relativePath = `agents/${slug}.md`;
  await updateIndex(projectPath, {
    type: "agent",
    slug,
    path: relativePath,
    content: body,
    updatedAt: new Date().toISOString(),
  });

  return filePath;
}

/**
 * Reads and parses .index.json.
 * Returns a default empty index when the file does not exist.
 */
export async function readIndex(projectPath: string): Promise<HubIndex> {
  try {
    const raw = await fs.readFile(indexPath(projectPath), "utf-8");
    return JSON.parse(raw) as HubIndex;
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === "ENOENT") {
      return { version: 1, items: [], updatedAt: new Date().toISOString() };
    }
    throw err;
  }
}

/**
 * Adds or updates an item in the index, then writes .index.json.
 * Upserts by type + slug — if a matching item exists it is replaced.
 */
export async function updateIndex(
  projectPath: string,
  item: Omit<HubIndexItem, "fingerprint" | "lastSyncAt"> & { content: string }
): Promise<void> {
  const { content, ...rest } = item;
  const fingerprint = computeFingerprint(content);

  const index = await readIndex(projectPath);

  const idx = index.items.findIndex((i) => i.type === rest.type && i.slug === rest.slug);
  const updated: HubIndexItem = { ...rest, fingerprint };

  if (idx >= 0) {
    index.items[idx] = updated;
  } else {
    index.items.push(updated);
  }

  index.updatedAt = new Date().toISOString();

  await fs.writeFile(indexPath(projectPath), JSON.stringify(index, null, 2), "utf-8");
}

/**
 * Returns a SHA-256 fingerprint of the given content string.
 * Format: "sha256:<hex-digest>"
 */
export function computeFingerprint(content: string): string {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

/**
 * Returns a summary of the current context hub status.
 */
export async function getContextStatus(projectPath: string): Promise<{
  initialized: boolean;
  counts: Record<HubComponentType, number>;
  lastUpdated: string | null;
}> {
  const index = await readIndex(projectPath);

  const counts: Record<HubComponentType, number> = {
    skill: 0,
    agent: 0,
    doc: 0,
    plan: 0,
  };

  for (const item of index.items) {
    if (item.type in counts) {
      counts[item.type]++;
    }
  }

  return {
    initialized: index.items.length > 0 || index.version > 0,
    counts,
    lastUpdated: index.updatedAt ?? null,
  };
}
