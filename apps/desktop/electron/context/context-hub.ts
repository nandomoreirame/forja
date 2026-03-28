/**
 * Context Hub Service
 *
 * Manages the canonical source of truth at ~/.config/forja/context/
 * Stores agents, skills, docs, and plans as markdown files with frontmatter.
 * Tracks all items in a .index.json manifest with SHA-256 fingerprints.
 */

import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { createHash } from "crypto";
import { getForjaContextDir } from "../paths.js";

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

/** The canonical index stored at ~/.config/forja/context/.index.json */
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

function contextRoot(): string {
  return getForjaContextDir();
}

function indexPath(): string {
  return path.join(contextRoot(), INDEX_FILE);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the absolute path to the global context hub root.
 */
export function getContextHubRoot(): string {
  return contextRoot();
}

/**
 * Ensures the ~/.config/forja/context/ directory structure exists.
 * Creates subdirectories (docs, agents, skills, plans) and initialises
 * .index.json only if it is not already present.
 */
export async function ensureContextHub(): Promise<void> {
  // Create all subdirectories (recursive — idempotent)
  for (const subdir of SUBDIRS) {
    await fs.mkdir(path.join(contextRoot(), subdir), { recursive: true });
  }

  // Create .index.json only when absent
  const idxPath = indexPath();
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
  slug: string,
  options: { content?: string; force?: boolean } = {}
): Promise<string> {
  const { content, force = false } = options;

  // Guard: check index for existing item
  const index = await readIndex();
  const existing = index.items.find((i) => i.type === "skill" && i.slug === slug);
  if (existing && !force) {
    throw new Error(`Skill "${slug}" already exists at ${existing.path}`);
  }

  const skillDir = path.join(contextRoot(), "skills", slug);
  await fs.mkdir(skillDir, { recursive: true });

  const body = content ?? `---\nname: ${slug}\ndescription: \n---\n`;
  const filePath = path.join(skillDir, "SKILL.md");
  await fs.writeFile(filePath, body, "utf-8");

  // Update the index
  const relativePath = `skills/${slug}/SKILL.md`;
  await updateIndex({
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
  slug: string,
  options: { content?: string; force?: boolean } = {}
): Promise<string> {
  const { content, force = false } = options;

  // Guard: check index for existing item
  const index = await readIndex();
  const existing = index.items.find((i) => i.type === "agent" && i.slug === slug);
  if (existing && !force) {
    throw new Error(`Agent "${slug}" already exists at ${existing.path}`);
  }

  const agentsDir = path.join(contextRoot(), "agents");
  await fs.mkdir(agentsDir, { recursive: true });

  const body = content ?? `---\nname: ${slug}\ndescription: \nmodel: inherit\n---\n`;
  const filePath = path.join(agentsDir, `${slug}.md`);
  await fs.writeFile(filePath, body, "utf-8");

  // Update the index
  const relativePath = `agents/${slug}.md`;
  await updateIndex({
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
export async function readIndex(): Promise<HubIndex> {
  try {
    const raw = await fs.readFile(indexPath(), "utf-8");
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
  item: Omit<HubIndexItem, "fingerprint" | "lastSyncAt"> & { content: string }
): Promise<void> {
  const { content, ...rest } = item;
  const fingerprint = computeFingerprint(content);

  const index = await readIndex();

  const idx = index.items.findIndex((i) => i.type === rest.type && i.slug === rest.slug);
  const updated: HubIndexItem = { ...rest, fingerprint };

  if (idx >= 0) {
    index.items[idx] = updated;
  } else {
    index.items.push(updated);
  }

  index.updatedAt = new Date().toISOString();

  await fs.writeFile(indexPath(), JSON.stringify(index, null, 2), "utf-8");
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
export async function getContextStatus(): Promise<{
  initialized: boolean;
  counts: Record<HubComponentType, number>;
  lastUpdated: string | null;
}> {
  const index = await readIndex();

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

// ---------------------------------------------------------------------------
// CRUD API
// ---------------------------------------------------------------------------

/**
 * Lists all items from the index, optionally filtered by type.
 */
export async function listItems(type?: string): Promise<HubIndexItem[]> {
  const index = await readIndex();
  if (!type) return index.items;
  return index.items.filter((i) => i.type === type);
}

/**
 * Reads the file content of a context item by type and slug.
 * Throws if the item is not found in the index.
 */
export async function readItem(type: string, slug: string): Promise<string> {
  const index = await readIndex();
  const item = index.items.find((i) => i.type === type && i.slug === slug);
  if (!item) {
    throw new Error(`Item "${type}/${slug}" not found in context hub`);
  }

  const filePath = path.join(contextRoot(), item.path);
  return fs.readFile(filePath, "utf-8");
}

/**
 * Writes (creates or updates) a context item file and updates the index.
 * Returns the absolute path of the written file.
 */
export async function writeItem(type: string, slug: string, content: string): Promise<string> {
  let relativePath: string;
  let filePath: string;

  if (type === "skill") {
    relativePath = `skills/${slug}/SKILL.md`;
    filePath = path.join(contextRoot(), relativePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
  } else if (type === "agent") {
    relativePath = `agents/${slug}.md`;
    filePath = path.join(contextRoot(), relativePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
  } else {
    // doc, plan
    const dir = type === "doc" ? "docs" : "plans";
    relativePath = `${dir}/${slug}.md`;
    filePath = path.join(contextRoot(), relativePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
  }

  await fs.writeFile(filePath, content, "utf-8");

  await updateIndex({
    type: type as HubComponentType,
    slug,
    path: relativePath,
    content,
    updatedAt: new Date().toISOString(),
  });

  return filePath;
}

/**
 * Deletes a context item from disk and removes it from the index.
 * Skills delete the entire directory; other types delete the single file.
 * Throws if the item is not found in the index.
 */
/**
 * Imports a .md file from disk into the context hub.
 * Derives a slug from the filename (lowercase, hyphens for spaces).
 * Reuses writeItem for storage and index update.
 */
export async function importItem(
  type: string,
  sourceFilePath: string,
): Promise<string> {
  if (!sourceFilePath.endsWith(".md")) {
    throw new Error("Only .md files can be imported");
  }

  const content = await fs.readFile(sourceFilePath, "utf-8");

  const baseName = path.basename(sourceFilePath, ".md");
  const slug = baseName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  return writeItem(type, slug, content);
}

/**
 * Deletes a context item from disk and removes it from the index.
 * Skills delete the entire directory; other types delete the single file.
 * Throws if the item is not found in the index.
 */
export async function deleteItem(type: string, slug: string): Promise<void> {
  const index = await readIndex();
  const itemIdx = index.items.findIndex((i) => i.type === type && i.slug === slug);
  if (itemIdx < 0) {
    throw new Error(`Item "${type}/${slug}" not found in context hub`);
  }

  const item = index.items[itemIdx];

  if (type === "skill") {
    // Delete entire skill directory
    const skillDir = path.join(contextRoot(), "skills", slug);
    await fs.rm(skillDir, { recursive: true });
  } else {
    // Delete single file
    const filePath = path.join(contextRoot(), item.path);
    await fs.unlink(filePath);
  }

  // Remove from index
  index.items.splice(itemIdx, 1);
  index.updatedAt = new Date().toISOString();
  await fs.writeFile(indexPath(), JSON.stringify(index, null, 2), "utf-8");
}
