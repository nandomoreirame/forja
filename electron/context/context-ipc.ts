/**
 * Context Hub IPC Handlers
 *
 * Returns an array of [channel, handler] tuples that can be registered
 * with ipcMain.handle() in the Electron main process.
 */

import { ensureContextHub, createSkill, createAgent, getContextStatus } from "./context-hub.js";
import { syncOutbound } from "./context-sync-out.js";
import { syncInbound } from "./context-sync-in.js";
import type { MergeStrategy, ContextComponentType } from "./types.js";

// ---------------------------------------------------------------------------
// Argument types
// ---------------------------------------------------------------------------

interface InitArgs {
  projectPath?: string;
}

interface StatusArgs {
  projectPath?: string;
}

interface SyncArgs {
  projectPath?: string;
  strategy?: MergeStrategy;
  toolIds?: string[];
  components?: ContextComponentType[];
}

interface CreateItemArgs {
  projectPath?: string;
  slug?: string;
  content?: string;
  force?: boolean;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

type IpcHandler = (_event: unknown, args: unknown) => Promise<unknown>;

/**
 * Creates all context hub IPC handlers.
 *
 * Returns an array of [channel, handler] tuples suitable for
 * ipcMain.handle() registration.
 */
export function createContextHandlers(): Array<[string, IpcHandler]> {
  return [
    ["context:init", handleInit],
    ["context:status", handleStatus],
    ["context:sync_out", handleSyncOut],
    ["context:sync_in", handleSyncIn],
    ["context:create_skill", handleCreateSkill],
    ["context:create_agent", handleCreateAgent],
  ];
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleInit(_event: unknown, args: unknown): Promise<void> {
  const { projectPath } = (args ?? {}) as InitArgs;
  if (!projectPath) throw new Error("projectPath is required");
  await ensureContextHub(projectPath);
}

async function handleStatus(_event: unknown, args: unknown): Promise<unknown> {
  const { projectPath } = (args ?? {}) as StatusArgs;
  if (!projectPath) throw new Error("projectPath is required");
  return getContextStatus(projectPath);
}

async function handleSyncOut(_event: unknown, args: unknown): Promise<unknown> {
  const { projectPath, strategy, toolIds, components } = (args ?? {}) as SyncArgs;
  if (!projectPath) throw new Error("projectPath is required");
  return syncOutbound(projectPath, { strategy, toolIds, components });
}

async function handleSyncIn(_event: unknown, args: unknown): Promise<unknown> {
  const { projectPath, strategy, toolIds, components } = (args ?? {}) as SyncArgs;
  if (!projectPath) throw new Error("projectPath is required");
  return syncInbound(projectPath, { strategy, toolIds, components });
}

async function handleCreateSkill(_event: unknown, args: unknown): Promise<string> {
  const { projectPath, slug, content, force = false } = (args ?? {}) as CreateItemArgs;
  if (!projectPath) throw new Error("projectPath is required");
  if (!slug) throw new Error("slug is required");
  return createSkill(projectPath, slug, { content, force });
}

async function handleCreateAgent(_event: unknown, args: unknown): Promise<string> {
  const { projectPath, slug, content, force = false } = (args ?? {}) as CreateItemArgs;
  if (!projectPath) throw new Error("projectPath is required");
  if (!slug) throw new Error("slug is required");
  return createAgent(projectPath, slug, { content, force });
}
