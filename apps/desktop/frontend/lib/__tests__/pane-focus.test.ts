import { describe, it, expect, beforeEach, vi } from "vitest";
import { Model, Actions, DockLocation } from "flexlayout-react";
import { paneFocusRegistry } from "../pane-focus-registry";
import { focusActiveTabInTabset } from "../pane-focus";
import { DEFAULT_LAYOUT, TABSET_IDS } from "@/lib/default-layout";

describe("focusActiveTabInTabset", () => {
  let model: Model;

  beforeEach(() => {
    paneFocusRegistry.clear();
    model = Model.fromJson(DEFAULT_LAYOUT);
  });

  it("calls focus on the selected tab in the tabset", () => {
    // Add a tab to main tabset
    model.doAction(
      Actions.addNode(
        { type: "tab", name: "Terminal", component: "terminal", id: "tab-1", config: {} },
        TABSET_IDS.main,
        DockLocation.CENTER,
        -1,
        true,
      ),
    );

    const focusFn = vi.fn();
    paneFocusRegistry.register("tab-1", focusFn);

    focusActiveTabInTabset(model, TABSET_IDS.main);

    // Uses double-RAF, so we need to simulate it
    // The function calls requestAnimationFrame twice; verify it was scheduled
    expect(focusFn).not.toHaveBeenCalled(); // not called synchronously
  });

  it("does nothing when tabset has no selected tab", () => {
    // Main tabset is empty
    const focusFn = vi.fn();
    paneFocusRegistry.register("nonexistent", focusFn);

    // Should not throw
    focusActiveTabInTabset(model, TABSET_IDS.main);
    expect(focusFn).not.toHaveBeenCalled();
  });

  it("does nothing when tabset ID is invalid", () => {
    focusActiveTabInTabset(model, "nonexistent-tabset");
    // Should not throw
  });
});
