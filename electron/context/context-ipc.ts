/**
 * Context Hub IPC Handlers
 *
 * Returns an array of [channel, handler] tuples that can be registered
 * with ipcMain.handle() in the Electron main process.
 */

import {
  ensureContextHub,
  createSkill,
  createAgent,
  getContextStatus,
  listItems,
  readItem,
  writeItem,
  deleteItem,
  importItem,
} from "./context-hub.js";
import { syncOutbound } from "./context-sync-out.js";
import { syncInbound } from "./context-sync-in.js";
import type { MergeStrategy, ContextComponentType } from "./types.js";

// ---------------------------------------------------------------------------
// Argument types
// ---------------------------------------------------------------------------

interface SyncArgs {
  strategy?: MergeStrategy;
  toolIds?: string[];
  components?: ContextComponentType[];
}

interface CreateItemArgs {
  slug?: string;
  content?: string;
  force?: boolean;
}

interface ListItemsArgs {
  type?: string;
}

interface ReadItemArgs {
  type?: string;
  slug?: string;
}

interface WriteItemArgs {
  type?: string;
  slug?: string;
  content?: string;
}

interface DeleteItemArgs {
  type?: string;
  slug?: string;
}

interface ImportItemArgs {
  type?: string;
  filePath?: string;
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
    ["context:list_items", handleListItems],
    ["context:read_item", handleReadItem],
    ["context:write_item", handleWriteItem],
    ["context:delete_item", handleDeleteItem],
    ["context:import_item", handleImportItem],
  ];
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleInit(): Promise<void> {
  await ensureContextHub();
}

async function handleStatus(): Promise<unknown> {
  return getContextStatus();
}

async function handleSyncOut(_event: unknown, args: unknown): Promise<unknown> {
  const { strategy, toolIds, components } = (args ?? {}) as SyncArgs;
  return syncOutbound({ strategy, toolIds, components });
}

async function handleSyncIn(_event: unknown, args: unknown): Promise<unknown> {
  const { strategy, toolIds, components } = (args ?? {}) as SyncArgs;
  return syncInbound({ strategy, toolIds, components });
}

async function handleCreateSkill(_event: unknown, args: unknown): Promise<string> {
  const { slug, content, force = false } = (args ?? {}) as CreateItemArgs;
  if (!slug) throw new Error("slug is required");
  return createSkill(slug, { content, force });
}

async function handleCreateAgent(_event: unknown, args: unknown): Promise<string> {
  const { slug, content, force = false } = (args ?? {}) as CreateItemArgs;
  if (!slug) throw new Error("slug is required");
  return createAgent(slug, { content, force });
}

async function handleListItems(_event: unknown, args: unknown): Promise<unknown> {
  const { type } = (args ?? {}) as ListItemsArgs;
  return listItems(type);
}

async function handleReadItem(_event: unknown, args: unknown): Promise<unknown> {
  const { type, slug } = (args ?? {}) as ReadItemArgs;
  if (!type || !slug) throw new Error("type and slug are required");
  return readItem(type, slug);
}

async function handleWriteItem(_event: unknown, args: unknown): Promise<unknown> {
  const { type, slug, content } = (args ?? {}) as WriteItemArgs;
  if (!type || !slug || content === undefined) throw new Error("type, slug, and content are required");
  return writeItem(type, slug, content);
}

async function handleDeleteItem(_event: unknown, args: unknown): Promise<void> {
  const { type, slug } = (args ?? {}) as DeleteItemArgs;
  if (!type || !slug) throw new Error("type and slug are required");
  await deleteItem(type, slug);
}

async function handleImportItem(_event: unknown, args: unknown): Promise<unknown> {
  const { type, filePath } = (args ?? {}) as ImportItemArgs;
  if (!type || !filePath) throw new Error("type and filePath are required");
  return importItem(type, filePath);
}
