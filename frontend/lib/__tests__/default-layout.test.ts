import { describe, it, expect } from "vitest";
import { Model } from "flexlayout-react";
import { DEFAULT_LAYOUT, TABSET_IDS } from "../default-layout";

describe("default-layout", () => {
  it("creates a valid flexlayout Model from the default JSON", () => {
    const model = Model.fromJson(DEFAULT_LAYOUT);
    expect(model).toBeDefined();
    expect(model.getRoot()).toBeDefined();
  });

  it("has global settings with correct defaults", () => {
    expect(DEFAULT_LAYOUT.global?.tabEnableClose).toBe(true);
    expect(DEFAULT_LAYOUT.global?.tabEnableRename).toBe(false);
    expect(DEFAULT_LAYOUT.global?.tabSetEnableMaximize).toBe(true);
    expect(DEFAULT_LAYOUT.global?.splitterSize).toBe(4);
    expect(DEFAULT_LAYOUT.global?.tabSetMinWidth).toBe(400);
    expect(DEFAULT_LAYOUT.global?.tabSetMinHeight).toBe(100);
  });

  it("has no tab children (empty tabset-main only)", () => {
    const model = Model.fromJson(DEFAULT_LAYOUT);
    let tabCount = 0;
    model.visitNodes((node) => {
      if (node.getType() === "tab") tabCount++;
    });
    expect(tabCount).toBe(0);
  });

  it("contains main tabset", () => {
    const model = Model.fromJson(DEFAULT_LAYOUT);
    const mainTabset = model.getNodeById(TABSET_IDS.main);
    expect(mainTabset).toBeDefined();
  });

  it("does not have a sidebar tabset ID", () => {
    expect(TABSET_IDS).not.toHaveProperty("sidebar");
  });

  it("exports TABSET_IDS with correct values", () => {
    expect(TABSET_IDS.main).toBe("tabset-main");
  });
});
