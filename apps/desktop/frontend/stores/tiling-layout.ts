import { create } from "zustand";
import { Model, Actions, DockLocation, TabNode, type IJsonModel } from "flexlayout-react";
import { DEFAULT_LAYOUT, TABSET_IDS } from "@/lib/default-layout";
import type { BlockConfig } from "@/lib/block-registry";
import { useTerminalTabsStore } from "./terminal-tabs";
import { useUserSettingsStore } from "./user-settings";

interface TilingLayoutState {
  model: Model;
  tabCount: number;
  /** The node ID of the tab currently being renamed (inline-edit active), or null. */
  editingTabId: string | null;

  updateModel: (model: Model) => void;
  getModelJson: () => IJsonModel;
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
  /**
   * Navigates to the nearest visible tabset in the given direction (left, right, up, down)
   * relative to the currently active tabset. Uses the tabset's visual rect position.
   * Returns the selected tab ID in the target tabset, or null if no adjacent tabset exists.
   */
  navigateToAdjacentTabset: (direction: "left" | "right" | "up" | "down") => string | null;
  /** Returns which directions have adjacent tabsets relative to the active tabset. */
  getAdjacentDirections: () => Record<"left" | "right" | "up" | "down", boolean>;
  /** Updates the config of a tab node (e.g., browser URL). */
  updateBlockConfig: (nodeId: string, config: Record<string, unknown>) => void;
  /** Closes all tabs in the given tabset and removes it from the layout. */
  closeTabset: (tabsetId: string) => void;
  /** Reconciles tabCount with the actual number of tabs in the model. */
  syncTabCount: () => void;
  /** Updates the global tabSetEnableMaximize attribute on the live model. */
  setTabSetEnableMaximize: (enabled: boolean) => void;
}

/**
 * Remembers the weight FRACTION (0-1) of side-pane tabsets relative to
 * their parent row when closed. On re-open, the fraction is used to
 * restore the exact visual proportion by adjusting only the new pane
 * and its dock target sibling, leaving other siblings untouched.
 */
const savedPaneWeightFractions = new Map<string, number>();
const DEFAULT_SIDE_PANE_FRACTION = 0.15;

/**
 * Saves the weight fraction of a side-pane tabset before it is removed.
 */
function savePaneWeightFraction(
  model: Model,
  nodeId: string,
  blockType: string,
): void {
  const node = model.getNodeById(nodeId);
  if (!node) return;
  const tabset = node.getParent();
  if (!tabset) return;
  const row = tabset.getParent();
  if (!row) return;

  const children: any[] = (row as any).getChildren?.() ?? [];
  if (children.length < 2) return;

  const tabsetWeight: number = (tabset as any).getWeight?.() ?? 1;
  const totalWeight = children.reduce(
    (sum: number, c: any) => sum + ((c as any).getWeight?.() ?? 1),
    0,
  );
  if (totalWeight > 0) {
    savedPaneWeightFractions.set(blockType, tabsetWeight / totalWeight);
  }
}

/**
 * Restores the saved weight fraction of a side-pane tabset after it has
 * been re-added via a dock (LEFT/RIGHT split).
 *
 * Only adjusts the NEW tabset and the DOCK TARGET (the tabset that was
 * split). Other siblings in the row are left untouched.
 *
 * @param dockTargetWeightBefore The dock target's weight BEFORE addNode.
 */
function restorePaneWeightFraction(
  model: Model,
  nodeId: string,
  blockType: string,
  dockTargetWeightBefore: number,
): void {
  const node = model.getNodeById(nodeId);
  if (!node) return;
  const newTabset = node.getParent();
  if (!newTabset) return;
  const row = newTabset.getParent();
  if (!row) return;

  const children: any[] = (row as any).getChildren?.() ?? [];
  if (children.length < 2) return;

  const fraction =
    savedPaneWeightFractions.get(blockType) ?? DEFAULT_SIDE_PANE_FRACTION;

  // Total weight of the row (after the split).
  const totalWeight = children.reduce(
    (sum: number, c: any) => sum + ((c as any).getWeight?.() ?? 1),
    0,
  );

  // Desired weight for the new pane.
  const desiredWeight = Math.max(fraction * totalWeight, 1);

  // The dock target gave up its weight for the split. Restore it to
  // (originalWeight - desiredWeight) so all other panes stay put.
  const dockTargetNewWeight = Math.max(dockTargetWeightBefore - desiredWeight, 1);

  // Set new pane weight.
  model.doAction(
    Actions.updateNodeAttributes(newTabset.getId(), { weight: desiredWeight }),
  );

  // Find the dock target: the sibling whose current weight + newTabset
  // weight ≈ dockTargetWeightBefore (they share the original weight).
  const newTabsetWeight: number = (newTabset as any).getWeight?.() ?? 1;
  const expectedSibWeight = dockTargetWeightBefore - newTabsetWeight;
  let bestSibling: any = null;
  let bestDelta = Infinity;
  for (const child of children) {
    if (child === newTabset) continue;
    const w: number = (child as any).getWeight?.() ?? 0;
    const delta = Math.abs(w - expectedSibWeight);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestSibling = child;
    }
  }

  if (bestSibling) {
    model.doAction(
      Actions.updateNodeAttributes(bestSibling.getId(), {
        weight: dockTargetNewWeight,
      }),
    );
  }
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

  // 1. Preferred tabset already has center content — use it directly
  if (preferredId && !sideTabsets.has(preferredId) && model.getNodeById(preferredId)) {
    // Check if preferred tabset has center content
    let preferredHasCenter = false;
    const prefNode = model.getNodeById(preferredId);
    if (prefNode) {
      const children = (prefNode as any).getChildren?.() ?? [];
      for (const child of children) {
        const comp = (child as any).getComponent?.();
        if (comp && CENTER_CONTENT_TYPES.has(comp)) {
          preferredHasCenter = true;
          break;
        }
      }
    }
    if (preferredHasCenter) return preferredId;
  }

  // 2. Coalesce: tabset that already has center content (terminal/browser)
  if (centerContentTabsetId && !sideTabsets.has(centerContentTabsetId)) {
    return centerContentTabsetId;
  }

  // 3. Preferred tabset exists and is not a side pane (e.g. empty active tabset)
  if (model.getNodeById(preferredId) && !sideTabsets.has(preferredId)) {
    return preferredId;
  }

  // 4. Try active tabset if it's not a side pane
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

/**
 * Represents a node in the FlexLayout JSON model tree.
 * Used for recursive traversal of `IJsonModel.layout.children`.
 */
interface LayoutNode {
  type: string;
  id?: string;
  component?: string;
  children?: LayoutNode[];
  [key: string]: unknown;
}

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
 * Strips file-preview tab blocks from a layout JSON, and removes any
 * tabsets that only contained file-preview blocks (plus empty rows left
 * behind). Used when restoring a persisted layout to prevent the
 * file-preview self-reinforcing restore cycle: restore → auto-load → save
 * → restore. File-preview state is ephemeral and should not survive across
 * app restarts or project/workspace switches.
 */
export function stripFilePreviewBlocksFromJson(json: IJsonModel): IJsonModel {
  function isFilePreviewTab(node: LayoutNode): boolean {
    return node.type === "tab" && node.component === "file-preview";
  }

  function hadOnlyFilePreviewChildren(originalChildren: LayoutNode[]): boolean {
    return (
      originalChildren.length > 0 && originalChildren.every((c) => isFilePreviewTab(c))
    );
  }

  function filterChildren(children: LayoutNode[]): LayoutNode[] {
    return children
      .filter((child) => {
        // Remove file-preview tab blocks
        if (isFilePreviewTab(child)) {
          return false;
        }
        // Remove tabsets that exclusively held file-preview blocks
        // (check original children before recursion strips them)
        if (child.type === "tabset" && hadOnlyFilePreviewChildren(child.children ?? [])) {
          return false;
        }
        return true;
      })
      .map((child): LayoutNode | null => {
        if (child.children) {
          const filtered = filterChildren(child.children);
          // Remove rows that became empty after stripping
          if (child.type === "row" && filtered.length === 0) {
            return null;
          }
          return { ...child, children: filtered };
        }
        return child;
      })
      .filter((child): child is LayoutNode => child !== null);
  }

  const layoutNode = json.layout as unknown as LayoutNode;
  return {
    ...json,
    layout: {
      ...json.layout,
      children: filterChildren(layoutNode.children ?? []),
    },
  };
}

/**
 * Strips terminal blocks whose node ID is NOT in the given valid set.
 * Used during project switch to remove stale terminal blocks from a cached
 * layout BEFORE creating the FlexLayout model, preventing a visible flash.
 *
 * Browser blocks are NOT stripped here — they are layout-managed and don't
 * have entries in the terminal tabs store, so they would always appear
 * "orphaned". They are only stripped by stripProjectBlocksFromJson() when
 * switching to a project with no saved layout at all.
 */
export function stripOrphanTerminalBlocksFromJson(
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
          child.component === "terminal" &&
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

/**
 * Syncs terminal-tabs store when a tab is removed from the FlexLayout model
 * outside of FlexLayout's own action pipeline (e.g. store methods that call
 * model.doAction directly).  Without this, the terminal-tabs store retains
 * stale entries and the persisted config.json never drops closed tabs.
 */
function syncTerminalTabRemoval(nodeId: string): void {
  const tabsStore = useTerminalTabsStore.getState();
  if (tabsStore.hasTab(nodeId)) {
    tabsStore.removeTab(nodeId);
  }
}

export const useTilingLayoutStore = create<TilingLayoutState>((set, get) => ({
  model: Model.fromJson(DEFAULT_LAYOUT),
  tabCount: 0,
  editingTabId: null,

  updateModel: (model) => {
    removeEmptyTabsets(model);
    set({ model, tabCount: countTabs(model) });
  },

  getModelJson: () => get().model.toJson() as IJsonModel,

  addBlock: (config, targetTabsetId, nodeId, dockLocation) => {
    let { model } = get();
    const activeTabsetId = model.getActiveTabset()?.getId();
    const tabsetId = targetTabsetId ?? activeTabsetId ?? TABSET_IDS.main;
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

    // Capture the dock target's weight BEFORE the split so we can
    // redistribute only the split portion when restoring pane proportions.
    const isSidePaneDock =
      resolvedDockLocation !== DockLocation.CENTER &&
      SIDE_PANE_BLOCK_TYPES.has(config.type);
    let dockTargetWeightBefore = 0;
    if (isSidePaneDock) {
      const targetNode = model.getNodeById(resolvedTabsetId);
      dockTargetWeightBefore = (targetNode as any)?.getWeight?.() ?? 100;
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

    // File-tree tabset: disable maximize + minWidth + restore proportions
    if (config.type === "file-tree") {
      const treeNode = model.getNodeById(id);
      const parentTabsetId = treeNode?.getParent()?.getId();
      if (parentTabsetId) {
        model.doAction(
          Actions.updateNodeAttributes(parentTabsetId, {
            enableMaximize: false,
            minWidth: FILE_TREE_TABSET_MIN_WIDTH,
          }),
        );
      }
      if (isSidePaneDock) {
        restorePaneWeightFraction(model, id, "file-tree", dockTargetWeightBefore);
      }
    }

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

    // Plugin/marketplace tabset: keep tab strip for drag, but disable drop
    if (config.type === "plugin" || config.type === "marketplace") {
      const node = model.getNodeById(id);
      const parentTabsetId = node?.getParent()?.getId();
      if (parentTabsetId) {
        model.doAction(
          Actions.updateNodeAttributes(parentTabsetId, {
            enableDrop: false,
            minWidth: PLUGIN_TABSET_MIN_WIDTH,
          }),
        );
      }
      if (isNewSidePaneTabset && isSidePaneDock) {
        restorePaneWeightFraction(model, id, config.type, dockTargetWeightBefore);
      }
    }

    // Agent-chat: open in a compact left pane (minWidth 400)
    if (config.type === "agent-chat") {
      const node = model.getNodeById(id);
      const parentTabsetId = node?.getParent()?.getId();
      if (parentTabsetId) {
        model.doAction(
          Actions.updateNodeAttributes(parentTabsetId, {
            minWidth: AGENT_CHAT_TABSET_MIN_WIDTH,
          }),
        );
      }
      if (isSidePaneDock) {
        restorePaneWeightFraction(model, id, "agent-chat", dockTargetWeightBefore);
      }
    }

    removeEmptyTabsets(model);
    set({ model, tabCount: countTabs(model) });
  },

  removeBlock: (nodeId) => {
    const { model } = get();
    const node = model.getNodeById(nodeId);
    if (!node) return;

    // Save weight fraction for side-pane blocks before removal.
    const component = (node as any).getComponent?.() as string | undefined;
    if (component && SIDE_PANE_BLOCK_TYPES.has(component)) {
      savePaneWeightFraction(model, nodeId, component);
    }

    // Before deletion, snapshot all sibling weights in the same row so we
    // can absorb the freed weight into the correct sibling and keep other
    // panes' visual proportions stable.
    const tabset = node.getParent();
    const row = tabset?.getParent();
    const removedWeight: number = (tabset as any)?.getWeight?.() ?? 0;
    const siblingsBefore: { id: string; weight: number; isSidePane: boolean }[] = [];
    if (row) {
      const rowChildren: any[] = (row as any).getChildren?.() ?? [];
      for (const child of rowChildren) {
        if (child === tabset) continue;
        const childId: string = child.getId();
        // Check if this sibling contains only side-pane blocks
        const childChildren: any[] = child.getChildren?.() ?? [];
        const hasSidePane = childChildren.some(
          (cc: any) => cc.getComponent && SIDE_PANE_BLOCK_TYPES.has(cc.getComponent()),
        );
        siblingsBefore.push({
          id: childId,
          weight: (child as any).getWeight?.() ?? 1,
          isSidePane: hasSidePane,
        });
      }
    }

    model.doAction(Actions.deleteTab(nodeId));
    removeEmptyTabsets(model);

    // Absorb the freed weight into a non-side-pane sibling (center content)
    // so that other side panes' absolute weights and visual proportions
    // are preserved.
    if (removedWeight > 0 && siblingsBefore.length > 0) {
      // Prefer a center-content sibling to absorb the weight
      const absorber =
        siblingsBefore.find((s) => !s.isSidePane && model.getNodeById(s.id)) ??
        siblingsBefore.find((s) => model.getNodeById(s.id));
      if (absorber) {
        model.doAction(
          Actions.updateNodeAttributes(absorber.id, {
            weight: absorber.weight + removedWeight,
          }),
        );
      }
    }

    set({ model, tabCount: countTabs(model) });
    syncTerminalTabRemoval(nodeId);
  },

  closeTabset: (tabsetId) => {
    const { model } = get();
    const tabsetNode = model.getNodeById(tabsetId);
    if (!tabsetNode || tabsetNode.getType() !== "tabset") return;

    // Save weight fractions for side-pane blocks before closing.
    const children = (tabsetNode as any).getChildren() as { getId: () => string; getComponent?: () => string }[];
    for (const child of children) {
      const comp = child.getComponent?.();
      if (comp && SIDE_PANE_BLOCK_TYPES.has(comp)) {
        savePaneWeightFraction(model, child.getId(), comp);
        break;
      }
    }

    // Snapshot siblings for weight absorption (same logic as removeBlock).
    const row = tabsetNode.getParent();
    const removedWeight: number = (tabsetNode as any).getWeight?.() ?? 0;
    const siblingsBefore: { id: string; weight: number; isSidePane: boolean }[] = [];
    if (row) {
      const rowChildren: any[] = (row as any).getChildren?.() ?? [];
      for (const child of rowChildren) {
        if (child === tabsetNode) continue;
        const cChildren: any[] = child.getChildren?.() ?? [];
        const hasSidePane = cChildren.some(
          (cc: any) => cc.getComponent && SIDE_PANE_BLOCK_TYPES.has(cc.getComponent()),
        );
        siblingsBefore.push({
          id: child.getId(),
          weight: (child as any).getWeight?.() ?? 1,
          isSidePane: hasSidePane,
        });
      }
    }

    const childIds = children.map((c) => c.getId());
    for (const child of [...children]) {
      model.doAction(Actions.deleteTab(child.getId()));
    }

    // Force-delete the tabset (including tabset-main)
    if (model.getNodeById(tabsetId)) {
      model.doAction(Actions.deleteTabset(tabsetId));
    }

    // Absorb freed weight into a non-side-pane sibling.
    if (removedWeight > 0 && siblingsBefore.length > 0) {
      const absorber =
        siblingsBefore.find((s) => !s.isSidePane && model.getNodeById(s.id)) ??
        siblingsBefore.find((s) => model.getNodeById(s.id));
      if (absorber) {
        model.doAction(
          Actions.updateNodeAttributes(absorber.id, {
            weight: absorber.weight + removedWeight,
          }),
        );
      }
    }

    set({ model, tabCount: countTabs(model) });

    for (const id of childIds) {
      syncTerminalTabRemoval(id);
    }
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
      // Enforce tabSetEnableMaximize from user settings on restored layouts
      const enableMaximize = useUserSettingsStore.getState().settings.ui.tabSetEnableMaximize;
      if (cleaned.global) {
        cleaned.global.tabSetEnableMaximize = enableMaximize;
      } else {
        cleaned.global = { tabSetEnableMaximize: enableMaximize };
      }
      const model = Model.fromJson(cleaned);
      removeEmptyTabsets(model);
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
    if (!selectedNode) {
      get().closeTabset(activeTabset.getId());
      return;
    }

    const nodeId = selectedNode.getId();
    model.doAction(Actions.deleteTab(nodeId));
    removeEmptyTabsets(model);
    set({ model, tabCount: countTabs(model) });
    syncTerminalTabRemoval(nodeId);

    // If no active tabset remains (or only file-tree), focus the file-tree
    const newActiveTabset = model.getActiveTabset();
    if (!newActiveTabset || !newActiveTabset.getSelectedNode()) {
      const fileTreeNode = model.getNodeById("tab-file-tree");
      if (fileTreeNode) {
        model.doAction(Actions.selectTab("tab-file-tree"));
        set({ model });
      }
    }
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
    const node = model.getNodeById(FILE_PREVIEW_NODE_ID);
    if (!node) return;

    const basename = filePath.split("/").pop() ?? "Preview";
    // Skip if name hasn't changed to avoid unnecessary re-render
    if ((node as TabNode).getName() === basename) return;

    model.doAction(
      Actions.updateNodeAttributes(FILE_PREVIEW_NODE_ID, { name: basename }),
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

    // customName is presentation only; tab identity stays in terminal-tabs.
    if (useTerminalTabsStore.getState().hasTab(nodeId)) {
      useTerminalTabsStore.getState().renameTab(nodeId, name);
    }

    set({ model });
  },

  updateBlockConfig: (nodeId, config) => {
    const { model } = get();
    if (!model.getNodeById(nodeId)) return;
    model.doAction(Actions.updateNodeAttributes(nodeId, { config }));
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

  navigateToAdjacentTabset: (direction) => {
    const { model } = get();

    // Collect all tabset IDs and their rects
    const tabsets: { id: string; cx: number; cy: number }[] = [];
    model.visitNodes((node) => {
      if (node.getType() === "tabset") {
        const rect = node.getRect();
        tabsets.push({
          id: node.getId(),
          cx: rect.x + rect.width / 2,
          cy: rect.y + rect.height / 2,
        });
      }
    });

    if (tabsets.length <= 1) return null;

    const activeTabset = model.getActiveTabset();
    if (!activeTabset) return null;

    const activeId = activeTabset.getId();
    const active = tabsets.find((t) => t.id === activeId);
    if (!active) return null;

    // Filter candidates in the requested direction
    let candidates: typeof tabsets;
    switch (direction) {
      case "right":
        candidates = tabsets.filter((t) => t.cx > active.cx);
        break;
      case "left":
        candidates = tabsets.filter((t) => t.cx < active.cx);
        break;
      case "down":
        candidates = tabsets.filter((t) => t.cy > active.cy);
        break;
      case "up":
        candidates = tabsets.filter((t) => t.cy < active.cy);
        break;
    }

    if (candidates.length === 0) return null;

    // Pick the closest candidate
    const target = candidates.reduce((closest, current) => {
      const dClosest =
        Math.abs(closest.cx - active.cx) + Math.abs(closest.cy - active.cy);
      const dCurrent =
        Math.abs(current.cx - active.cx) + Math.abs(current.cy - active.cy);
      return dCurrent < dClosest ? current : closest;
    });

    // Activate the target tabset and return its selected tab ID
    model.doAction(Actions.setActiveTabset(target.id));
    set({ model });

    const targetNode = model.getNodeById(target.id);
    const selectedNode = (targetNode as any)?.getSelectedNode?.();
    return selectedNode?.getId() ?? null;
  },

  getAdjacentDirections: () => {
    const result = { left: false, right: false, up: false, down: false };
    const { model } = get();

    const tabsets: { id: string; cx: number; cy: number }[] = [];
    model.visitNodes((node) => {
      if (node.getType() === "tabset") {
        const rect = node.getRect();
        tabsets.push({
          id: node.getId(),
          cx: rect.x + rect.width / 2,
          cy: rect.y + rect.height / 2,
        });
      }
    });

    if (tabsets.length <= 1) return result;

    const activeTabset = model.getActiveTabset();
    if (!activeTabset) return result;

    const activeId = activeTabset.getId();
    const active = tabsets.find((t) => t.id === activeId);
    if (!active) return result;

    result.right = tabsets.some((t) => t.cx > active.cx);
    result.left = tabsets.some((t) => t.cx < active.cx);
    result.down = tabsets.some((t) => t.cy > active.cy);
    result.up = tabsets.some((t) => t.cy < active.cy);

    return result;
  },

  syncTabCount: () => {
    const { model, tabCount } = get();
    const actual = countTabs(model);
    if (actual !== tabCount) {
      set({ tabCount: actual });
    }
  },

  setTabSetEnableMaximize: (enabled) => {
    const { model } = get();
    const json = model.toJson() as IJsonModel;
    if (json.global) {
      json.global.tabSetEnableMaximize = enabled;
    } else {
      json.global = { tabSetEnableMaximize: enabled };
    }
    const rebuilt = Model.fromJson(json);
    set({ model: rebuilt });
  },
}));
