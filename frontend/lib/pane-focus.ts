import type { Model } from "flexlayout-react";
import { paneFocusRegistry } from "./pane-focus-registry";

/**
 * Focuses the active (selected) tab inside a given tabset.
 * Uses double-RAF so the browser has finished layout before focusing.
 */
export function focusActiveTabInTabset(model: Model, tabsetId: string): void {
  const tabsetNode = model.getNodeById(tabsetId);
  if (!tabsetNode) return;

  const selectedNode = (tabsetNode as any).getSelectedNode?.();
  if (!selectedNode) return;

  const nodeId = selectedNode.getId();

  // Double-RAF: wait for FlexLayout to finish its render cycle
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      paneFocusRegistry.focus(nodeId);
    });
  });
}
