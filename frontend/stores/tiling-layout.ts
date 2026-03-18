import { create } from "zustand";
import { Model, Actions, DockLocation, type IJsonModel } from "flexlayout-react";
import { DEFAULT_LAYOUT, TABSET_IDS } from "@/lib/default-layout";
import type { BlockConfig } from "@/lib/block-registry";
import { useTerminalTabsStore } from "./terminal-tabs";

interface TilingLayoutState {
  model: Model;
  tabCount: number;
  layoutByProject: Record<string, IJsonModel>;
  /** The node ID of the tab currently being renamed (inline-edit active), or null. */
  editingTabId: string | null;

  updateModel: (model: Model) => void;
  getModelJson: () => IJsonModel;
  saveLayoutForProject: (projectPath: string) => void;
  restoreLayoutForProject: (projectPath: string, validTerminalIds?: Set<string>) => void;
  addBlock: (config: BlockConfig, targetTabsetId?: string, nodeId?: string, dockLocation?: DockLocation) => void;
  removeBlock: (nodeId: string) => void;
  hasBlock: (nodeId: string) => boolean;
  hasBlockOfType: (blockType: string) => boolean;
  resetToDefault: () => void;
  loadFromJson: (json: IJsonModel) => void;
  splitActiveTabset: (direction: "horizontal" | "vertical", sessionType?: string) => void;
  closeActiveTab: () => void;
  selectTab: (nodeId: string) => void;
  isModelEmpty: () => boolean;
  /** Updates the tab name of the file-preview block to reflect the current file. */
  updateFilePreviewTabName: (filePath: string) => void;
  /** Updates the tab name of the file-tree block to reflect the current project. */
  updateFileTreeTabName: (projectName: string) => void;
  /** Renames a block (tab) node. Empty string resets to the default generated name. */
  renameBlock: (nodeId: string, name: string) => void;
  /** Sets (or clears) the node ID of the tab being renamed. */
  setEditingTabId: (id: string | null) => void;
  /** Returns all tabset IDs in depth-first (left-to-right visual) order. */
  getTabsetIds: () => string[];
  /** Cycles active tabset forward/backward with wrap-around. Returns the new active tabset ID or null if only 1 tabset. */
  cycleActiveTabset: (direction: "forward" | "backward") => string | null;
  /** Cycles through ALL tabs across ALL tabsets globally (like Chrome's Ctrl+Tab). Returns the new tab ID or null. */
  cycleGlobalTab: (direction: "forward" | "backward") => string | null;
}

let tabCounter = 0;

function nextBlockId(): string {
  tabCounter += 1;
  return `block-${Date.now().toString(36)}-${tabCounter}`;
}

/**
 * Finds a valid tabset ID in the model, preferring the given ID.
 * Falls back to the active tabset or any tabset.
 * Returns null if no valid tabset exists.
 */
function findValidTabset(model: Model, preferredId: string): string | null {
  // Preferred tabset exists
  if (model.getNodeById(preferredId)) return preferredId;

  // Try active tabset
  const activeTabset = model.getActiveTabset();
  if (activeTabset) {
    return activeTabset.getId();
  }

  // Find any tabset
  let fallbackId: string | null = null;
  model.visitNodes((node) => {
    if (!fallbackId && node.getType() === "tabset") {
      fallbackId = node.getId();
    }
  });

  return fallbackId;
}

/** Block types that live in dedicated side panes (not the center area). */
const SIDE_PANE_BLOCK_TYPES = new Set(["file-tree", "file-preview", "plugin", "marketplace", "agent-chat"]);

/** Block types considered "center" content (terminals, browsers). */
const CENTER_CONTENT_TYPES = new Set(["terminal", "browser"]);

/**
 * Finds a tabset suitable for "center" content (terminals, browsers).
 * Prefers a tabset that already contains center content, then falls back to
 * the preferred ID if it's not a side pane, then to the active tabset, and
 * finally to any non-side tabset.
 */
function findCenterTabset(model: Model, preferredId: string): string | null {
  // Classify tabsets by their content
  const sideTabsets = new Set<string>();
  let centerContentTabsetId: string | null = null;

  model.visitNodes((node) => {
    if (node.getType() !== "tab") return;
    const component = (node as any).getComponent?.();
    if (component && SIDE_PANE_BLOCK_TYPES.has(component)) {
      const parentId = node.getParent()?.getId();
      if (parentId) sideTabsets.add(parentId);
    }
    if (!centerContentTabsetId && component && CENTER_CONTENT_TYPES.has(component)) {
      const parentId = node.getParent()?.getId();
      if (parentId) centerContentTabsetId = parentId;
    }
  });

  // 1. Prefer a tabset that already has center content (terminal/browser)
  if (centerContentTabsetId && !sideTabsets.has(centerContentTabsetId)) {
    return centerContentTabsetId;
  }

  // 2. Preferred tabset exists and is not a side pane — use it
  if (model.getNodeById(preferredId) && !sideTabsets.has(preferredId)) {
    return preferredId;
  }

  // 3. Try active tabset if it's not a side pane
  const activeTabset = model.getActiveTabset();
  if (activeTabset && !sideTabsets.has(activeTabset.getId())) {
    return activeTabset.getId();
  }

  // 4. Find any non-side tabset
  let fallbackId: string | null = null;
  model.visitNodes((node) => {
    if (!fallbackId && node.getType() === "tabset" && !sideTabsets.has(node.getId())) {
      fallbackId = node.getId();
    }
  });

  // Last resort — use any tabset
  return fallbackId ?? findValidTabset(model, preferredId);
}

function countTabs(model: Model): number {
  let count = 0;
  model.visitNodes((node) => {
    if (node.getType() === "tab") count++;
  });
  return count;
}

/**
 * Actively removes empty tabsets (except tabset-main) from the model.
 * This prevents ghost sessions that persist after tab removal or layout restore.
 */
function removeEmptyTabsets(model: Model): void {
  const emptyTabsetIds: string[] = [];
  model.visitNodes((node) => {
    if (
      node.getType() === "tabset" &&
      node.getId() !== TABSET_IDS.main &&
      (node as any).getChildren().length === 0
    ) {
      emptyTabsetIds.push(node.getId());
    }
  });
  for (const id of emptyTabsetIds) {
    model.doAction(Actions.deleteTabset(id));
  }
}

/**
 * Un-maximizes any tabset that is maximized but has no children.
 * This prevents a stale persisted layout where tabset-main was saved
 * maximized and empty from blocking the entire UI.
 */
function unmaximizeEmptyTabsets(model: Model): void {
  model.visitNodes((node) => {
    if (
      node.getType() === "tabset" &&
      (node as any).isMaximized?.() &&
      (node as any).getChildren().length === 0
    ) {
      model.doAction(Actions.maximizeToggle(node.getId()));
    }
  });
}

/**
 * Strips empty tabsets (except tabset-main) from a layout JSON *before*
 * Model.fromJson(). This handles the case where deleteTabset action is a
 * no-op on freshly-parsed models with undefined enableDeleteWhenEmpty.
 */
function stripEmptyTabsetsFromJson(json: IJsonModel): IJsonModel {
  function filterChildren(children: any[]): any[] {
    return children
      .map((child) => {
        if (child.children) {
          return { ...child, children: filterChildren(child.children) };
        }
        return child;
      })
      .filter((child) => {
        if (
          child.type === "tabset" &&
          child.id !== TABSET_IDS.main &&
          (!child.children || child.children.length === 0)
        ) {
          return false;
        }
        // Also remove empty rows that lost all their children after filtering
        if (
          child.type === "row" &&
          child.children &&
          child.children.length === 0
        ) {
          return false;
        }
        return true;
      });
  }

  return {
    ...json,
    layout: {
      ...json.layout,
      children: filterChildren((json.layout as any).children ?? []),
    },
  };
}

/**
 * Strips project-specific blocks (terminal, browser) from a layout JSON,
 * preserving structural blocks (file-tree, file-preview, plugin, etc.).
 * Used when switching to a project with no saved layout — the structural
 * panes remain while project-specific content is cleared.
 */
const PROJECT_SPECIFIC_BLOCK_TYPES = new Set(["terminal", "browser"]);

export function stripProjectBlocksFromJson(json: IJsonModel): IJsonModel {
  function filterChildren(children: any[]): any[] {
    return children
      .map((child) => {
        if (child.children) {
          return { ...child, children: filterChildren(child.children) };
        }
        return child;
      })
      .filter((child) => {
        // Remove project-specific tab blocks
        if (child.type === "tab" && PROJECT_SPECIFIC_BLOCK_TYPES.has(child.component)) {
          return false;
        }
        return true;
      });
  }

  return {
    ...json,
    layout: {
      ...json.layout,
      children: filterChildren((json.layout as any).children ?? []),
    },
  };
}

/**
 * Strips terminal/browser blocks whose node ID is NOT in the given valid set.
 * Used during project switch to remove stale blocks from a cached layout
 * BEFORE creating the FlexLayout model, preventing a visible flash.
 */
function stripOrphanTerminalBlocksFromJson(
  json: IJsonModel,
  validIds: Set<string>,
): IJsonModel {
  function filterChildren(children: any[]): any[] {
    return children
      .map((child) => {
        if (child.children) {
          return { ...child, children: filterChildren(child.children) };
        }
        return child;
      })
      .filter((child) => {
        if (
          child.type === "tab" &&
          PROJECT_SPECIFIC_BLOCK_TYPES.has(child.component) &&
          !validIds.has(child.id)
        ) {
          return false;
        }
        return true;
      });
  }

  return {
    ...json,
    layout: {
      ...json.layout,
      children: filterChildren((json.layout as any).children ?? []),
    },
  };
}

/** Minimum width (px) for a tabset that holds a plugin block. */
const PLUGIN_TABSET_MIN_WIDTH = 400;

/** Minimum width (px) for a tabset that holds a file-preview block. */
const FILE_PREVIEW_TABSET_MIN_WIDTH = 600;

/** Minimum width (px) for a tabset that holds a file-tree block. */
const FILE_TREE_TABSET_MIN_WIDTH = 240;

/** Minimum width (px) for a tabset that holds the agent-chat block. */
const AGENT_CHAT_TABSET_MIN_WIDTH = 400;

/** Fixed node ID for the file-preview block. */
const FILE_PREVIEW_NODE_ID = "block-file-preview";

/** Fixed node ID for the file-tree block. */
const FILE_TREE_NODE_ID = "tab-file-tree";

/**
 * Re-applies minimum widths to tabsets that contain file-tree or file-preview
 * blocks. This is necessary after loading a model from persisted JSON, which
 * may have stale or missing minWidth values.
 */
function enforceBlockMinWidths(model: Model): void {
  const BLOCK_MIN_WIDTHS: Record<string, number> = {
    "file-tree": FILE_TREE_TABSET_MIN_WIDTH,
    "file-preview": FILE_PREVIEW_TABSET_MIN_WIDTH,
    "plugin": PLUGIN_TABSET_MIN_WIDTH,
    "marketplace": PLUGIN_TABSET_MIN_WIDTH,
    "agent-chat": AGENT_CHAT_TABSET_MIN_WIDTH,
  };

  model.visitNodes((node) => {
    if (node.getType() !== "tab") return;
    const component = (node as any).getComponent?.();
    const minWidth = BLOCK_MIN_WIDTHS[component];
    if (!minWidth) return;

    const parentTabsetId = node.getParent()?.getId();
    if (!parentTabsetId) return;

    const currentMin = (node.getParent() as any).getAttrMinWidth?.() ?? 0;
    if (currentMin < minWidth) {
      model.doAction(
        Actions.updateNodeAttributes(parentTabsetId, { minWidth }),
      );
    }
  });
}

/**
 * Finds the tabset that contains a file-tree tab.
 * Returns the tabset ID or null if none exists.
 */
function findFileTreeTabset(model: Model): string | null {
  let fileTreeTabsetId: string | null = null;
  model.visitNodes((node) => {
    if (fileTreeTabsetId) return;
    if (
      node.getType() === "tab" &&
      (node as any).getComponent?.() === "file-tree"
    ) {
      fileTreeTabsetId = node.getParent()?.getId() ?? null;
    }
  });
  return fileTreeTabsetId;
}

/**
 * Finds the rightmost tabset in the model, optionally excluding a specific tabset.
 * "Rightmost" is defined as the last tabset visited in a depth-first traversal,
 * which corresponds to the visually rightmost (or bottom-most) tabset.
 */
function findRightmostTabset(model: Model, excludeId?: string | null): string | null {
  let rightmostId: string | null = null;
  model.visitNodes((node) => {
    if (node.getType() === "tabset" && node.getId() !== excludeId) {
      rightmostId = node.getId();
    }
  });
  return rightmostId;
}

/**
 * Finds a tabset that already contains at least one plugin or marketplace tab.
 * Plugin and marketplace blocks share the same side pane on the right.
 * Returns the tabset ID or null if none exists.
 */
function findSidePaneTabset(model: Model): string | null {
  let sidePaneTabsetId: string | null = null;
  model.visitNodes((node) => {
    if (sidePaneTabsetId) return;
    if (node.getType() !== "tab") return;
    const component = (node as any).getComponent?.();
    if (component === "plugin" || component === "marketplace") {
      sidePaneTabsetId = node.getParent()?.getId() ?? null;
    }
  });
  return sidePaneTabsetId;
}

export function buildTabName(config: BlockConfig): string {
  switch (config.type) {
    case "terminal":
      return config.sessionType
        ? config.sessionType.charAt(0).toUpperCase() +
            config.sessionType.slice(1)
        : "Terminal";
    case "file-preview": {
      const basename = config.filePath
        ? config.filePath.split("/").pop() ?? "Preview"
        : "Preview";
      return basename;
    }
    case "browser":
      return "Browser";
    case "plugin":
      return config.pluginDisplayName ?? config.pluginName ?? "Plugin";
    case "file-tree":
      return config.projectName ?? "Files";
    case "agent-chat":
      return "AI Assistant";
    case "marketplace":
      return "Marketplace";
  }
}

export const useTilingLayoutStore = create<TilingLayoutState>((set, get) => ({
  model: Model.fromJson(DEFAULT_LAYOUT),
  tabCount: 0,
  layoutByProject: {},
  editingTabId: null,

  updateModel: (model) => {
    removeEmptyTabsets(model);
    set({ model, tabCount: countTabs(model) });
  },

  getModelJson: () => get().model.toJson() as IJsonModel,

  saveLayoutForProject: (projectPath) => {
    const json = get().model.toJson() as IJsonModel;
    set((state) => ({
      layoutByProject: {
        ...state.layoutByProject,
        [projectPath]: json,
      },
    }));
  },

  restoreLayoutForProject: (projectPath, validTerminalIds) => {
    const saved = get().layoutByProject[projectPath];
    if (saved) {
      // Strip orphan terminal/browser blocks from cached layout BEFORE
      // building the model so they never render (prevents visible flash).
      const sanitized = validTerminalIds
        ? stripOrphanTerminalBlocksFromJson(saved, validTerminalIds)
        : saved;

      // Skip model replacement when the sanitized layout matches the current
      // model's JSON — avoids a full FlexLayout re-render (and flicker)
      // when switching back to a project whose layout hasn't changed.
      const currentJson = get().model.toJson();
      if (JSON.stringify(currentJson) === JSON.stringify(sanitized)) return;

      try {
        const cleaned = stripEmptyTabsetsFromJson(sanitized);
        const model = Model.fromJson(cleaned);
        removeEmptyTabsets(model);
        unmaximizeEmptyTabsets(model);
        enforceBlockMinWidths(model);
        set({ model, tabCount: countTabs(model) });
      } catch {
        set({ model: Model.fromJson(DEFAULT_LAYOUT), tabCount: 0 });
      }
    } else {
      // No saved layout for this project — keep structural blocks (file-tree,
      // file-preview, plugin, etc.) but strip terminal/browser blocks that
      // belong to the previous project.
      const currentJson = get().model.toJson() as IJsonModel;
      const stripped = stripProjectBlocksFromJson(currentJson);
      try {
        const cleaned = stripEmptyTabsetsFromJson(stripped);
        const model = Model.fromJson(cleaned);
        removeEmptyTabsets(model);
        unmaximizeEmptyTabsets(model);
        enforceBlockMinWidths(model);
        set({ model, tabCount: countTabs(model) });
      } catch {
        set({ model: Model.fromJson(DEFAULT_LAYOUT), tabCount: 0 });
      }
    }
  },

  addBlock: (config, targetTabsetId, nodeId, dockLocation) => {
    let { model } = get();
    const tabsetId = targetTabsetId ?? TABSET_IDS.main;
    const id = nodeId ?? nextBlockId();

    // Avoid duplicate blocks with the same ID
    if (model.getNodeById(id)) return;

    // For center-area content (terminals, browsers), avoid side-pane tabsets.
    // Other block types (file-tree, plugin, etc.) have their own routing below.
    const useCenter = config.type === "terminal" || config.type === "browser";
    let resolvedTabsetId = useCenter
      ? findCenterTabset(model, tabsetId)
      : findValidTabset(model, tabsetId);

    if (!resolvedTabsetId) {
      // No valid tabset found — reset to default layout
      model = Model.fromJson(DEFAULT_LAYOUT);
      resolvedTabsetId = TABSET_IDS.main;
    }

    let resolvedDockLocation = dockLocation ?? DockLocation.CENTER;

    // File-tree always docks LEFT in its own pane
    if (config.type === "file-tree") {
      const existingFileTreeTabset = findFileTreeTabset(model);
      if (existingFileTreeTabset) {
        resolvedTabsetId = existingFileTreeTabset;
        resolvedDockLocation = DockLocation.CENTER;
      } else {
        resolvedDockLocation = DockLocation.LEFT;
      }
    }

    // Prevent non-file-tree blocks from landing in the file-tree tabset
    if (config.type !== "file-tree" && config.type !== "file-preview") {
      const fileTreeTabsetId = findFileTreeTabset(model);
      if (fileTreeTabsetId && resolvedTabsetId === fileTreeTabsetId) {
        const mainTabset = findValidTabset(model, TABSET_IDS.main);
        if (mainTabset && mainTabset !== fileTreeTabsetId) {
          resolvedTabsetId = mainTabset;
        } else {
          // tabset-main IS the file-tree tabset (legacy) — split RIGHT
          resolvedDockLocation = DockLocation.RIGHT;
        }
      }
    }

    // Coalesce plugin and marketplace blocks into a single shared right-side tabset
    let isNewSidePaneTabset = false;
    if (config.type === "plugin" || config.type === "marketplace") {
      const existingSidePaneTabset = findSidePaneTabset(model);
      if (existingSidePaneTabset) {
        resolvedTabsetId = existingSidePaneTabset;
        resolvedDockLocation = DockLocation.CENTER;
      } else {
        isNewSidePaneTabset = true;
        // First side-pane block — dock RIGHT of the rightmost non-file-tree tabset
        const rightmostId = findRightmostTabset(model, findFileTreeTabset(model));
        if (rightmostId) {
          resolvedTabsetId = rightmostId;
        }
        resolvedDockLocation = DockLocation.RIGHT;
      }
    }

    model.doAction(
      Actions.addNode(
        {
          type: "tab",
          name: buildTabName(config),
          component: config.type,
          id,
          config,
        },
        resolvedTabsetId,
        resolvedDockLocation,
        -1,
        true,
      ),
    );

    // Apply minWidth to the tabset that holds the file-preview block so that
    // the pane never becomes too narrow to be useful.
    if (config.type === "file-preview") {
      const previewNode = model.getNodeById(id);
      const parentTabsetId = previewNode?.getParent()?.getId();
      if (parentTabsetId) {
        model.doAction(
          Actions.updateNodeAttributes(parentTabsetId, {
            minWidth: FILE_PREVIEW_TABSET_MIN_WIDTH,
          }),
        );
      }
    }

    // Plugin/marketplace tabset: keep tab strip for drag, but disable drop and maximize
    if (config.type === "plugin" || config.type === "marketplace") {
      const node = model.getNodeById(id);
      const parentTabsetId = node?.getParent()?.getId();
      if (parentTabsetId) {
        const attrs: Record<string, unknown> = {
          enableDrop: false,
          enableMaximize: false,
          minWidth: PLUGIN_TABSET_MIN_WIDTH,
        };
        // When creating the tabset for the first time, use a small weight so
        // the pane opens at exactly minWidth (400px) instead of 50% of the space.
        if (isNewSidePaneTabset) {
          attrs.weight = 1;
        }
        model.doAction(
          Actions.updateNodeAttributes(parentTabsetId, attrs),
        );
      }
    }

    // Apply minWidth and compact weight to file-tree tabset
    if (config.type === "file-tree") {
      const node = model.getNodeById(id);
      const parentTabsetId = node?.getParent()?.getId();
      if (parentTabsetId) {
        model.doAction(
          Actions.updateNodeAttributes(parentTabsetId, {
            minWidth: FILE_TREE_TABSET_MIN_WIDTH,
            weight: 1,
          }),
        );
      }
    }

    // Agent-chat: open in a compact left pane (minWidth 400, small weight)
    if (config.type === "agent-chat") {
      const node = model.getNodeById(id);
      const parentTabsetId = node?.getParent()?.getId();
      if (parentTabsetId) {
        model.doAction(
          Actions.updateNodeAttributes(parentTabsetId, {
            minWidth: AGENT_CHAT_TABSET_MIN_WIDTH,
            weight: 1,
          }),
        );
      }
    }

    removeEmptyTabsets(model);
    set({ model, tabCount: countTabs(model) });
  },

  removeBlock: (nodeId) => {
    const { model } = get();
    if (!model.getNodeById(nodeId)) return;
    model.doAction(Actions.deleteTab(nodeId));
    removeEmptyTabsets(model);
    set({ model, tabCount: countTabs(model) });
  },

  hasBlock: (nodeId) => {
    return !!get().model.getNodeById(nodeId);
  },

  hasBlockOfType: (blockType) => {
    let found = false;
    get().model.visitNodes((node) => {
      if (!found && node.getType() === "tab" && (node as any).getComponent?.() === blockType) {
        found = true;
      }
    });
    return found;
  },

  resetToDefault: () => {
    set({ model: Model.fromJson(DEFAULT_LAYOUT), tabCount: 0 });
  },

  loadFromJson: (json) => {
    try {
      const cleaned = stripEmptyTabsetsFromJson(json);
      const model = Model.fromJson(cleaned);
      removeEmptyTabsets(model);
      unmaximizeEmptyTabsets(model);
      enforceBlockMinWidths(model);
      set({ model, tabCount: countTabs(model) });
    } catch {
      set({ model: Model.fromJson(DEFAULT_LAYOUT), tabCount: 0 });
    }
  },

  splitActiveTabset: (direction, sessionType) => {
    const { model } = get();
    const activeTabset = model.getActiveTabset();
    if (!activeTabset) return;

    const id = nextBlockId();
    const type = sessionType ?? "terminal";
    const location = direction === "vertical" ? DockLocation.RIGHT : DockLocation.BOTTOM;

    model.doAction(
      Actions.addNode(
        {
          type: "tab",
          name: type.charAt(0).toUpperCase() + type.slice(1),
          component: "terminal",
          id,
          config: { type: "terminal", sessionType: type },
        },
        activeTabset.getId(),
        location,
        -1,
        true,
      ),
    );

    set({ model, tabCount: countTabs(model) });
  },

  closeActiveTab: () => {
    const { model } = get();
    const activeTabset = model.getActiveTabset();
    if (!activeTabset) return;

    const selectedNode = activeTabset.getSelectedNode();
    if (!selectedNode) return;

    model.doAction(Actions.deleteTab(selectedNode.getId()));
    removeEmptyTabsets(model);
    set({ model, tabCount: countTabs(model) });
  },

  selectTab: (nodeId) => {
    const { model } = get();
    if (!model.getNodeById(nodeId)) return;
    model.doAction(Actions.selectTab(nodeId));
    set({ model });
  },

  isModelEmpty: () => get().tabCount === 0,

  updateFilePreviewTabName: (filePath: string) => {
    const { model } = get();
    if (!model.getNodeById(FILE_PREVIEW_NODE_ID)) return;

    const basename = filePath.split("/").pop() ?? "Preview";
    const newName = basename;

    model.doAction(
      Actions.updateNodeAttributes(FILE_PREVIEW_NODE_ID, { name: newName }),
    );

    set({ model });
  },

  updateFileTreeTabName: (projectName: string) => {
    const { model } = get();
    if (!model.getNodeById(FILE_TREE_NODE_ID)) return;

    model.doAction(
      Actions.updateNodeAttributes(FILE_TREE_NODE_ID, { name: projectName }),
    );

    set({ model });
  },

  renameBlock: (nodeId: string, name: string) => {
    const { model } = get();
    const node = model.getNodeById(nodeId);
    if (!node) return;

    const trimmed = name.trim();
    let newName: string;

    if (trimmed) {
      newName = trimmed;
    } else {
      // Reset to default name from the block config
      const config = (node as any).getConfig?.() as BlockConfig | undefined;
      newName = config ? buildTabName(config) : "Tab";
    }

    model.doAction(
      Actions.updateNodeAttributes(nodeId, { name: newName }),
    );

    // Sync to terminal-tabs store if this is a terminal tab
    if (useTerminalTabsStore.getState().hasTab(nodeId)) {
      useTerminalTabsStore.getState().renameTab(nodeId, name);
    }

    set({ model });
  },

  setEditingTabId: (id) => set({ editingTabId: id }),

  getTabsetIds: () => {
    const ids: string[] = [];
    get().model.visitNodes((node) => {
      if (node.getType() === "tabset") {
        ids.push(node.getId());
      }
    });
    return ids;
  },

  cycleActiveTabset: (direction) => {
    const { model } = get();
    const ids = get().getTabsetIds();
    if (ids.length <= 1) return null;

    const activeTabset = model.getActiveTabset();
    const activeId = activeTabset?.getId() ?? ids[0];
    const currentIndex = ids.indexOf(activeId);
    const idx = currentIndex === -1 ? 0 : currentIndex;

    const nextIndex =
      direction === "forward"
        ? (idx + 1) % ids.length
        : (idx - 1 + ids.length) % ids.length;

    const nextId = ids[nextIndex];
    model.doAction(Actions.setActiveTabset(nextId));
    set({ model });
    return nextId;
  },

  cycleGlobalTab: (direction) => {
    const { model } = get();

    // Collect all tab IDs across all tabsets in depth-first (visual) order
    const allTabIds: string[] = [];
    let currentSelectedId: string | null = null;

    model.visitNodes((node) => {
      if (node.getType() === "tab") {
        allTabIds.push(node.getId());
      }
    });

    if (allTabIds.length <= 1) return null;

    // Find the currently selected tab in the active tabset
    const activeTabset = model.getActiveTabset();
    if (activeTabset) {
      const selectedNode = activeTabset.getSelectedNode();
      currentSelectedId = selectedNode?.getId() ?? null;
    }

    const currentIndex = currentSelectedId ? allTabIds.indexOf(currentSelectedId) : 0;
    const idx = currentIndex === -1 ? 0 : currentIndex;

    const nextIndex =
      direction === "forward"
        ? (idx + 1) % allTabIds.length
        : (idx - 1 + allTabIds.length) % allTabIds.length;

    const nextTabId = allTabIds[nextIndex];
    model.doAction(Actions.selectTab(nextTabId));

    // Also activate the parent tabset so the border follows
    const nextNode = model.getNodeById(nextTabId);
    const parentTabsetId = nextNode?.getParent()?.getId();
    if (parentTabsetId) {
      model.doAction(Actions.setActiveTabset(parentTabsetId));
    }

    set({ model });
    return nextTabId;
  },
}));
