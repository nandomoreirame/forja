import { describe, it, expect, beforeEach, vi } from "vitest";
import { Model, Actions, DockLocation } from "flexlayout-react";
import { useTilingLayoutStore } from "../tiling-layout";
import { useTerminalTabsStore } from "../terminal-tabs";
import { DEFAULT_LAYOUT, TABSET_IDS } from "@/lib/default-layout";
import type { BlockConfig } from "@/lib/block-registry";

describe("tiling-layout store", () => {
  beforeEach(() => {
    useTilingLayoutStore.getState().resetToDefault();
  });

  it("initializes with a valid model", () => {
    const { model } = useTilingLayoutStore.getState();
    expect(model).toBeDefined();
    expect(model.getRoot()).toBeDefined();
  });

  it("has default main tabset", () => {
    const { model } = useTilingLayoutStore.getState();
    expect(model.getNodeById(TABSET_IDS.main)).toBeDefined();
  });

  describe("addBlock", () => {
    it("adds a terminal block to main tabset", () => {
      const config: BlockConfig = {
        type: "terminal",
        sessionType: "claude",
      };
      useTilingLayoutStore.getState().addBlock(config);
      const { model } = useTilingLayoutStore.getState();
      const json = model.toJson();
      const allTabs = JSON.stringify(json);
      expect(allTabs).toContain("claude");
    });

    it("adds a file-preview block", () => {
      const config: BlockConfig = {
        type: "file-preview",
        filePath: "/src/index.ts",
      };
      useTilingLayoutStore.getState().addBlock(config);
      const { model } = useTilingLayoutStore.getState();
      const json = JSON.stringify(model.toJson());
      expect(json).toContain("file-preview");
    });

    it("adds block to a specific tabset", () => {
      const config: BlockConfig = { type: "agent-chat" };
      useTilingLayoutStore
        .getState()
        .addBlock(config, TABSET_IDS.main);
      const { model } = useTilingLayoutStore.getState();
      const json = JSON.stringify(model.toJson());
      expect(json).toContain("agent-chat");
    });

    it("falls back to another tabset when target tabset does not exist", () => {
      const config: BlockConfig = { type: "browser", url: "https://fallback.test" };
      useTilingLayoutStore.getState().addBlock(config, "nonexistent-tabset");
      const json = JSON.stringify(useTilingLayoutStore.getState().model.toJson());
      expect(json).toContain("https://fallback.test");
    });

    it("resets to default when no tabsets exist", () => {
      // Load an empty model with no tabsets at all
      const emptyLayout = {
        global: DEFAULT_LAYOUT.global,
        layout: { type: "row", weight: 100, children: [] },
      };
      useTilingLayoutStore.getState().loadFromJson(emptyLayout as any);

      // Now try to add a block — should recover by resetting to default
      const config: BlockConfig = { type: "marketplace" };
      useTilingLayoutStore.getState().addBlock(config, undefined, "block-marketplace");
      const json = JSON.stringify(useTilingLayoutStore.getState().model.toJson());
      expect(json).toContain("marketplace");
    });

    it("creates a split beside target tabset when dockLocation is RIGHT", () => {
      // Add a block to the main tabset first so it exists
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "terminal" },
        TABSET_IDS.main,
        "tab-terminal",
      );

      // Now add a file-preview block docked RIGHT of the main tabset
      useTilingLayoutStore.getState().addBlock(
        { type: "file-preview", filePath: "/src/index.ts" },
        TABSET_IDS.main,
        "block-file-preview",
        DockLocation.RIGHT,
      );

      const { model } = useTilingLayoutStore.getState();
      // The file-preview block should exist in the model
      expect(model.getNodeById("block-file-preview")).toBeDefined();

      // The file-preview should NOT be in the same tabset as the terminal
      const terminalNode = model.getNodeById("tab-terminal");
      const previewNode = model.getNodeById("block-file-preview");
      expect(terminalNode?.getParent()?.getId()).not.toBe(
        previewNode?.getParent()?.getId(),
      );
    });

    it("does not add duplicate blocks with the same ID", () => {
      const config: BlockConfig = { type: "marketplace" };
      useTilingLayoutStore.getState().addBlock(config, undefined, "block-marketplace");
      useTilingLayoutStore.getState().addBlock(config, undefined, "block-marketplace");
      const json = JSON.stringify(useTilingLayoutStore.getState().model.toJson());
      const matches = json.match(/block-marketplace/g);
      expect(matches?.length).toBe(1);
    });
  });

  describe("removeBlock", () => {
    it("removes a block by id", () => {
      const config: BlockConfig = {
        type: "browser",
        url: "https://example.com",
      };
      useTilingLayoutStore.getState().addBlock(config);

      const { model } = useTilingLayoutStore.getState();
      const json = model.toJson();
      const jsonStr = JSON.stringify(json);

      const idMatch = jsonStr.match(/"id":"(block-[^"]+)"/);
      expect(idMatch).toBeTruthy();

      if (idMatch) {
        useTilingLayoutStore.getState().removeBlock(idMatch[1]);
        const updated = JSON.stringify(
          useTilingLayoutStore.getState().model.toJson(),
        );
        expect(updated).not.toContain(idMatch[1]);
      }
    });
  });

  describe("getModelJson", () => {
    it("returns serializable JSON", () => {
      const json = useTilingLayoutStore.getState().getModelJson();
      expect(json).toBeDefined();
      expect(json.layout).toBeDefined();
      expect(typeof json).toBe("object");
    });
  });

  describe("per-project layout", () => {
    it("saves and restores layout for a project", () => {
      const projectPath = "/project-a";

      useTilingLayoutStore
        .getState()
        .addBlock({ type: "browser", url: "https://test.com" });
      useTilingLayoutStore.getState().saveLayoutForProject(projectPath);

      useTilingLayoutStore.getState().resetToDefault();
      const afterReset = JSON.stringify(
        useTilingLayoutStore.getState().model.toJson(),
      );
      expect(afterReset).not.toContain("https://test.com");

      useTilingLayoutStore.getState().restoreLayoutForProject(projectPath);
      const restored = JSON.stringify(
        useTilingLayoutStore.getState().model.toJson(),
      );
      expect(restored).toContain("https://test.com");
    });

    it("skips model replacement when saved layout matches current model", () => {
      const store = useTilingLayoutStore.getState();

      // Add a block, save, then restore the same project (JSON matches)
      store.addBlock({ type: "browser", url: "https://test.com" });
      store.saveLayoutForProject("/project-same");

      // Capture model reference before restore
      const modelBefore = useTilingLayoutStore.getState().model;

      // Restore the same project — should NOT create a new Model
      useTilingLayoutStore.getState().restoreLayoutForProject("/project-same");
      const modelAfter = useTilingLayoutStore.getState().model;

      // Same object reference = no unnecessary FlexLayout re-render
      expect(modelAfter).toBe(modelBefore);
    });

    it("falls back to default when no saved layout exists", () => {
      useTilingLayoutStore
        .getState()
        .restoreLayoutForProject("/nonexistent");
      const { model } = useTilingLayoutStore.getState();
      expect(model.getNodeById(TABSET_IDS.main)).toBeDefined();
    });

    it("preserves structural blocks (file-tree) and strips terminal blocks when no saved layout exists", () => {
      const store = useTilingLayoutStore.getState();

      // Add a file-tree block and two terminal blocks (simulating project A's layout)
      store.addBlock(
        { type: "file-tree", projectName: "ProjectA" },
        TABSET_IDS.main,
        "tab-file-tree",
      );
      store.addBlock(
        { type: "terminal", tabId: "tab-1", sessionType: "claude" },
        undefined,
        "tab-1",
      );
      store.addBlock(
        { type: "terminal", tabId: "tab-2", sessionType: "terminal" },
        undefined,
        "tab-2",
      );

      // Verify blocks exist before switch
      expect(useTilingLayoutStore.getState().hasBlock("tab-file-tree")).toBe(true);
      expect(useTilingLayoutStore.getState().hasBlock("tab-1")).toBe(true);
      expect(useTilingLayoutStore.getState().hasBlock("tab-2")).toBe(true);

      // Restore layout for a project with no saved state
      useTilingLayoutStore.getState().restoreLayoutForProject("/new-project");

      // File-tree block should be preserved
      expect(useTilingLayoutStore.getState().hasBlock("tab-file-tree")).toBe(true);

      // Terminal blocks should be stripped
      expect(useTilingLayoutStore.getState().hasBlock("tab-1")).toBe(false);
      expect(useTilingLayoutStore.getState().hasBlock("tab-2")).toBe(false);

      // tabset-main should still exist
      expect(useTilingLayoutStore.getState().model.getNodeById(TABSET_IDS.main)).toBeDefined();
    });
  });

  describe("resetToDefault", () => {
    it("resets model to default layout", () => {
      useTilingLayoutStore
        .getState()
        .addBlock({ type: "marketplace" });
      useTilingLayoutStore.getState().resetToDefault();

      const json = JSON.stringify(
        useTilingLayoutStore.getState().model.toJson(),
      );
      expect(json).not.toContain("marketplace");
      expect(json).toContain(TABSET_IDS.main);
    });
  });

  describe("loadFromJson", () => {
    it("loads a valid JSON model", () => {
      const json = useTilingLayoutStore.getState().getModelJson();
      useTilingLayoutStore.getState().addBlock({ type: "marketplace" });
      useTilingLayoutStore.getState().loadFromJson(json);

      const result = JSON.stringify(
        useTilingLayoutStore.getState().model.toJson(),
      );
      expect(result).not.toContain("marketplace");
    });

    it("falls back to default on invalid JSON", () => {
      useTilingLayoutStore
        .getState()
        .loadFromJson({} as never);
      const { model } = useTilingLayoutStore.getState();
      expect(model.getNodeById(TABSET_IDS.main)).toBeDefined();
    });
  });

  describe("file-preview block behaviour", () => {
    it("tab name includes filename with pipe separator and PREVIEW suffix", () => {
      useTilingLayoutStore.getState().addBlock(
        { type: "file-preview", filePath: "/src/index.ts" },
        TABSET_IDS.main,
        "block-file-preview",
      );
      const { model } = useTilingLayoutStore.getState();
      const node = model.getNodeById("block-file-preview");
      expect(node?.getName()).toBe("index.ts");
    });

    it("tab name is 'Preview' when no filePath is given", () => {
      useTilingLayoutStore.getState().addBlock(
        { type: "file-preview" },
        TABSET_IDS.main,
        "block-file-preview",
      );
      const { model } = useTilingLayoutStore.getState();
      const node = model.getNodeById("block-file-preview");
      expect(node?.getName()).toBe("Preview");
    });

    it("updateFilePreviewTabName updates the tab name", () => {
      // First add the block
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "terminal" },
        TABSET_IDS.main,
        "tab-terminal",
      );
      useTilingLayoutStore.getState().addBlock(
        { type: "file-preview", filePath: "/src/old-file.ts" },
        TABSET_IDS.main,
        "block-file-preview",
        DockLocation.RIGHT,
      );

      // Now update tab name for a new file
      useTilingLayoutStore.getState().updateFilePreviewTabName("/src/new-file.ts");

      const { model } = useTilingLayoutStore.getState();
      const node = model.getNodeById("block-file-preview");
      expect(node?.getName()).toBe("new-file.ts");
    });

    it("updateFilePreviewTabName is a no-op when block does not exist", () => {
      // Should not throw
      expect(() => {
        useTilingLayoutStore.getState().updateFilePreviewTabName("/src/file.ts");
      }).not.toThrow();
    });

    it("file-preview tabset gets minWidth=600 when docked RIGHT", () => {
      // Add terminal to main first
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "terminal" },
        TABSET_IDS.main,
        "tab-terminal",
      );
      // Add file-preview docked RIGHT (creates new tabset)
      useTilingLayoutStore.getState().addBlock(
        { type: "file-preview", filePath: "/src/index.ts" },
        TABSET_IDS.main,
        "block-file-preview",
        DockLocation.RIGHT,
      );

      const { model } = useTilingLayoutStore.getState();
      const previewNode = model.getNodeById("block-file-preview");
      const previewTabset = previewNode?.getParent();
      const attrMinWidth = (previewTabset as any).getAttrMinWidth?.() ?? 0;
      expect(attrMinWidth).toBeGreaterThanOrEqual(600);
    });

    it("file-preview tabset also gets minWidth=600 when added to CENTER (same tabset)", () => {
      // Add file-preview directly to main tabset (no split)
      useTilingLayoutStore.getState().addBlock(
        { type: "file-preview", filePath: "/src/index.ts" },
        TABSET_IDS.main,
        "block-file-preview",
      );

      const { model } = useTilingLayoutStore.getState();
      const previewNode = model.getNodeById("block-file-preview");
      const previewTabset = previewNode?.getParent();
      const attrMinWidth = (previewTabset as any).getAttrMinWidth?.() ?? 0;
      expect(attrMinWidth).toBeGreaterThanOrEqual(600);
    });
  });

  describe("file-tree block behaviour", () => {
    it("file-tree tabset gets minWidth=240", () => {
      // Add a terminal to main first
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "terminal" },
        TABSET_IDS.main,
        "tab-terminal",
      );
      // Add file-tree docked LEFT (creates new tabset)
      useTilingLayoutStore.getState().addBlock(
        { type: "file-tree" },
        TABSET_IDS.main,
        "block-file-tree",
        DockLocation.LEFT,
      );

      const { model } = useTilingLayoutStore.getState();
      const fileTreeNode = model.getNodeById("block-file-tree");
      const fileTreeTabset = fileTreeNode?.getParent();
      const attrMinWidth = (fileTreeTabset as any).getAttrMinWidth?.() ?? 0;
      expect(attrMinWidth).toBe(240);
    });

    it("file-tree tabset gets weight=1 for compact sizing", () => {
      // Add a terminal to main first
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "terminal" },
        TABSET_IDS.main,
        "tab-terminal",
      );
      // Add file-tree docked LEFT (creates new tabset)
      useTilingLayoutStore.getState().addBlock(
        { type: "file-tree", projectName: "forja" },
        TABSET_IDS.main,
        "tab-file-tree",
        DockLocation.LEFT,
      );

      const { model } = useTilingLayoutStore.getState();
      const fileTreeNode = model.getNodeById("tab-file-tree");
      const fileTreeTabset = fileTreeNode?.getParent();
      const weight = (fileTreeTabset as any).getWeight?.() ?? -1;
      expect(weight).toBe(1);
    });

    it("tab name shows project name when projectName is provided", () => {
      useTilingLayoutStore.getState().addBlock(
        { type: "file-tree", projectName: "forja" },
        TABSET_IDS.main,
        "tab-file-tree",
      );
      const { model } = useTilingLayoutStore.getState();
      const node = model.getNodeById("tab-file-tree");
      expect(node?.getName()).toBe("forja");
    });

    it("tab name falls back to 'Files' when no projectName is given", () => {
      useTilingLayoutStore.getState().addBlock(
        { type: "file-tree" },
        TABSET_IDS.main,
        "tab-file-tree",
      );
      const { model } = useTilingLayoutStore.getState();
      const node = model.getNodeById("tab-file-tree");
      expect(node?.getName()).toBe("Files");
    });

    it("updateFileTreeTabName updates the tab name", () => {
      useTilingLayoutStore.getState().addBlock(
        { type: "file-tree", projectName: "old-project" },
        TABSET_IDS.main,
        "tab-file-tree",
      );

      useTilingLayoutStore.getState().updateFileTreeTabName("new-project");

      const { model } = useTilingLayoutStore.getState();
      const node = model.getNodeById("tab-file-tree");
      expect(node?.getName()).toBe("new-project");
    });

    it("updateFileTreeTabName is a no-op when block does not exist", () => {
      expect(() => {
        useTilingLayoutStore.getState().updateFileTreeTabName("forja");
      }).not.toThrow();
    });

    it("file-tree always docks LEFT even when no dockLocation is passed", () => {
      // Add a terminal to main first so there is content
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "terminal" },
        TABSET_IDS.main,
        "tab-terminal",
      );
      // Add file-tree WITHOUT specifying dockLocation
      useTilingLayoutStore.getState().addBlock(
        { type: "file-tree", projectName: "forja" },
        undefined,
        "tab-file-tree",
      );

      const { model } = useTilingLayoutStore.getState();
      const terminalNode = model.getNodeById("tab-terminal");
      const fileTreeNode = model.getNodeById("tab-file-tree");
      // File-tree must be in a DIFFERENT tabset than the terminal
      expect(fileTreeNode?.getParent()?.getId()).not.toBe(
        terminalNode?.getParent()?.getId(),
      );
    });

    it("terminal block never lands in the file-tree tabset", () => {
      // Add file-tree docked LEFT first
      useTilingLayoutStore.getState().addBlock(
        { type: "file-tree", projectName: "forja" },
        TABSET_IDS.main,
        "tab-file-tree",
        DockLocation.LEFT,
      );
      // Now add a terminal block — should go to tabset-main, not file-tree tabset
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "claude" },
        undefined,
        "tab-claude",
      );

      const { model } = useTilingLayoutStore.getState();
      const fileTreeNode = model.getNodeById("tab-file-tree");
      const terminalNode = model.getNodeById("tab-claude");
      expect(terminalNode?.getParent()?.getId()).not.toBe(
        fileTreeNode?.getParent()?.getId(),
      );
      // Terminal should be in tabset-main
      expect(terminalNode?.getParent()?.getId()).toBe(TABSET_IDS.main);
    });

    it("file-preview block docks RIGHT of file-tree tabset, not in main tabset", () => {
      // Add a terminal to main first
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "terminal" },
        TABSET_IDS.main,
        "tab-terminal",
      );
      // Add file-tree docked LEFT (creates its own tabset)
      useTilingLayoutStore.getState().addBlock(
        { type: "file-tree", projectName: "test" },
        undefined,
        "tab-file-tree",
      );

      const { model: modelBefore } = useTilingLayoutStore.getState();
      const fileTreeNode = modelBefore.getNodeById("tab-file-tree");
      const fileTreeTabsetId = fileTreeNode?.getParent()?.getId();
      expect(fileTreeTabsetId).toBeDefined();

      // Add file-preview targeting the file-tree tabset with DockLocation.RIGHT
      useTilingLayoutStore.getState().addBlock(
        { type: "file-preview", filePath: "/src/index.ts" },
        fileTreeTabsetId!,
        "block-file-preview",
        DockLocation.RIGHT,
      );

      const { model } = useTilingLayoutStore.getState();
      const previewNode = model.getNodeById("block-file-preview");
      expect(previewNode).toBeDefined();

      // file-preview should NOT be in the main tabset
      const previewTabsetId = previewNode?.getParent()?.getId();
      expect(previewTabsetId).not.toBe(TABSET_IDS.main);

      // Check positional ordering in the root row:
      // Correct: [fileTree, filePreview, main] (preview is adjacent to file-tree)
      // Buggy:   [fileTree, main, preview]     (preview is after main)
      const json = model.toJson() as any;
      const rootChildren = json.layout.children;
      const childrenJson = rootChildren.map((c: any) => JSON.stringify(c));

      const fileTreeIdx = childrenJson.findIndex((s: string) => s.includes("tab-file-tree"));
      const previewIdx = childrenJson.findIndex((s: string) => s.includes("block-file-preview"));
      const mainIdx = childrenJson.findIndex((s: string) => s.includes(TABSET_IDS.main));

      // file-preview must come BEFORE main (adjacent to file-tree)
      expect(previewIdx).toBeGreaterThan(fileTreeIdx);
      expect(previewIdx).toBeLessThan(mainIdx);
    });

    it("terminal redirects to tabset-main when file-tree is already in tabset-main", () => {
      // Simulate legacy state: file-tree was added CENTER into tabset-main
      // We need to build a layout JSON where file-tree is in tabset-main
      const legacyLayout: any = {
        global: {
          tabEnableClose: true,
          tabSetEnableDeleteWhenEmpty: true,
        },
        layout: {
          type: "row",
          weight: 100,
          children: [
            {
              type: "tabset",
              weight: 100,
              id: TABSET_IDS.main,
              enableDeleteWhenEmpty: false,
              children: [
                { type: "tab", name: "forja", component: "file-tree", id: "tab-file-tree", config: { type: "file-tree", projectName: "forja" } },
              ],
            },
          ],
        },
      };
      useTilingLayoutStore.getState().loadFromJson(legacyLayout);

      // Now add a terminal — it should NOT share tabset with file-tree
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "claude" },
        undefined,
        "tab-claude",
      );

      const { model } = useTilingLayoutStore.getState();
      const fileTreeNode = model.getNodeById("tab-file-tree");
      const terminalNode = model.getNodeById("tab-claude");
      expect(terminalNode).toBeTruthy();
      expect(fileTreeNode).toBeTruthy();
      expect(terminalNode?.getParent()?.getId()).not.toBe(
        fileTreeNode?.getParent()?.getId(),
      );
    });

  });

  describe("plugin block behaviour", () => {
    it("disables drop and maximize on plugin block tabset and sets minWidth=400", () => {
      // Add a terminal to main first so docking RIGHT creates a new tabset
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "terminal" },
        TABSET_IDS.main,
        "tab-terminal",
      );
      useTilingLayoutStore.getState().addBlock(
        { type: "plugin", pluginName: "test-plugin" },
        TABSET_IDS.main,
        "plugin-test",
        DockLocation.RIGHT,
      );

      const node = useTilingLayoutStore.getState().model.getNodeById("plugin-test");
      expect(node).toBeTruthy();

      // Tab strip stays enabled so the plugin tab can be dragged
      const parentTabset = node!.getParent();
      expect((parentTabset as any).isEnableTabStrip()).toBe(true);
      expect((parentTabset as any).isEnableDrop()).toBe(false);
      expect((parentTabset as any).isEnableMaximize()).toBe(false);
      // Plugin tabset must have minWidth=400
      const attrMinWidth = (parentTabset as any).getAttrMinWidth?.() ?? 0;
      expect(attrMinWidth).toBeGreaterThanOrEqual(400);
    });

    it("applies plugin tabset attributes when added to CENTER", () => {
      useTilingLayoutStore.getState().addBlock(
        { type: "plugin", pluginName: "test-plugin" },
        TABSET_IDS.main,
        "plugin-center",
      );

      const node = useTilingLayoutStore.getState().model.getNodeById("plugin-center");
      expect(node).toBeTruthy();

      const parentTabset = node!.getParent();
      expect((parentTabset as any).isEnableTabStrip()).toBe(true);
      expect((parentTabset as any).isEnableDrop()).toBe(false);
      expect((parentTabset as any).isEnableMaximize()).toBe(false);
    });

    it("uses pluginDisplayName for tab name when provided", () => {
      useTilingLayoutStore.getState().addBlock(
        { type: "plugin", pluginName: "forja-plugin-pomodoro", pluginDisplayName: "Pomodoro Timer" },
        TABSET_IDS.main,
        "plugin-display",
      );

      const node = useTilingLayoutStore.getState().model.getNodeById("plugin-display");
      expect(node?.getName()).toBe("Pomodoro Timer");
    });

    it("falls back to pluginName when pluginDisplayName is not provided", () => {
      useTilingLayoutStore.getState().addBlock(
        { type: "plugin", pluginName: "my-plugin" },
        TABSET_IDS.main,
        "plugin-fallback",
      );

      const node = useTilingLayoutStore.getState().model.getNodeById("plugin-fallback");
      expect(node?.getName()).toBe("my-plugin");
    });

    it("second plugin goes into the same tabset as the first plugin", () => {
      // Add a terminal to main first
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "terminal" },
        TABSET_IDS.main,
        "tab-terminal",
      );
      // First plugin docked RIGHT
      useTilingLayoutStore.getState().addBlock(
        { type: "plugin", pluginName: "plugin-a" },
        TABSET_IDS.main,
        "plugin-a",
        DockLocation.RIGHT,
      );
      // Second plugin also docked RIGHT — should coalesce into first plugin's tabset
      useTilingLayoutStore.getState().addBlock(
        { type: "plugin", pluginName: "plugin-b" },
        TABSET_IDS.main,
        "plugin-b",
        DockLocation.RIGHT,
      );

      const { model } = useTilingLayoutStore.getState();
      const nodeA = model.getNodeById("plugin-a");
      const nodeB = model.getNodeById("plugin-b");
      expect(nodeA).toBeTruthy();
      expect(nodeB).toBeTruthy();
      // Both plugins must share the same parent tabset
      expect(nodeA!.getParent()?.getId()).toBe(nodeB!.getParent()?.getId());
    });

    it("plugin tabset preserves attributes when multiple plugins share it", () => {
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "terminal" },
        TABSET_IDS.main,
        "tab-terminal",
      );
      useTilingLayoutStore.getState().addBlock(
        { type: "plugin", pluginName: "plugin-a" },
        TABSET_IDS.main,
        "plugin-a",
        DockLocation.RIGHT,
      );
      useTilingLayoutStore.getState().addBlock(
        { type: "plugin", pluginName: "plugin-b" },
        TABSET_IDS.main,
        "plugin-b",
        DockLocation.RIGHT,
      );

      const { model } = useTilingLayoutStore.getState();
      const nodeB = model.getNodeById("plugin-b");
      const tabset = nodeB!.getParent();
      expect((tabset as any).isEnableDrop()).toBe(false);
      expect((tabset as any).isEnableMaximize()).toBe(false);
      const attrMinWidth = (tabset as any).getAttrMinWidth?.() ?? 0;
      expect(attrMinWidth).toBeGreaterThanOrEqual(400);
    });

    it("first plugin docks at the rightmost position in a restored layout without tabset-main", () => {
      // Layout: [file-tree | content] — no tabset-main
      const restoredLayout: any = {
        global: {
          tabEnableClose: true,
          tabSetEnableDeleteWhenEmpty: true,
        },
        layout: {
          type: "row",
          weight: 100,
          children: [
            {
              type: "tabset",
              weight: 30,
              id: "ts-filetree",
              children: [
                { type: "tab", name: "forja", component: "file-tree", id: "tab-file-tree", config: { type: "file-tree", projectName: "forja" } },
              ],
            },
            {
              type: "tabset",
              weight: 70,
              id: "ts-content",
              children: [
                { type: "tab", name: "Terminal", component: "terminal", id: "t1", config: { type: "terminal", sessionType: "terminal" } },
              ],
            },
          ],
        },
      };

      useTilingLayoutStore.getState().loadFromJson(restoredLayout);

      useTilingLayoutStore.getState().addBlock(
        { type: "plugin", pluginName: "pomodoro" },
        undefined,
        "block-plugin-pomodoro",
        DockLocation.RIGHT,
      );

      const { model } = useTilingLayoutStore.getState();
      const json = model.toJson() as any;
      const rootChildren = json.layout.children;
      // Plugin tabset should be the LAST child in the root row (rightmost position)
      const lastChild = rootChildren[rootChildren.length - 1];
      const lastChildJson = JSON.stringify(lastChild);
      expect(lastChildJson).toContain("block-plugin-pomodoro");
    });

    it("first plugin docks after file-preview when layout has file-tree, main, and preview", () => {
      // Build: file-tree LEFT, terminal in main, file-preview RIGHT of main
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "terminal" },
        TABSET_IDS.main,
        "tab-terminal",
      );
      useTilingLayoutStore.getState().addBlock(
        { type: "file-tree", projectName: "forja" },
        undefined,
        "tab-file-tree",
      );
      useTilingLayoutStore.getState().addBlock(
        { type: "file-preview", filePath: "/src/index.ts" },
        TABSET_IDS.main,
        "block-file-preview",
        DockLocation.RIGHT,
      );

      // Add plugin — should dock RIGHT of the rightmost tabset (file-preview's tabset)
      useTilingLayoutStore.getState().addBlock(
        { type: "plugin", pluginName: "pomodoro" },
        undefined,
        "block-plugin-pomodoro",
        DockLocation.RIGHT,
      );

      const { model } = useTilingLayoutStore.getState();
      const json = model.toJson() as any;
      const rootChildren = json.layout.children;
      // Plugin tabset should be the LAST child in the root row
      const lastChild = rootChildren[rootChildren.length - 1];
      const lastChildJson = JSON.stringify(lastChild);
      expect(lastChildJson).toContain("block-plugin-pomodoro");
    });

    it("enforceBlockMinWidths restores plugin tabset minWidth after loadFromJson", () => {
      // Build a layout JSON with a plugin tab but no minWidth on its tabset
      const layoutWithPlugin: any = {
        global: {
          tabEnableClose: true,
          tabSetEnableDeleteWhenEmpty: true,
        },
        layout: {
          type: "row",
          weight: 100,
          children: [
            {
              type: "tabset",
              weight: 50,
              id: TABSET_IDS.main,
              enableDeleteWhenEmpty: false,
              children: [
                { type: "tab", name: "Terminal", component: "terminal", id: "t1", config: { type: "terminal", sessionType: "terminal" } },
              ],
            },
            {
              type: "tabset",
              weight: 50,
              id: "plugin-tabset",
              children: [
                { type: "tab", name: "Plugin A", component: "plugin", id: "plugin-a", config: { type: "plugin", pluginName: "plugin-a" } },
              ],
            },
          ],
        },
      };

      useTilingLayoutStore.getState().loadFromJson(layoutWithPlugin);

      const { model } = useTilingLayoutStore.getState();
      const pluginNode = model.getNodeById("plugin-a");
      const pluginTabset = pluginNode?.getParent();
      const attrMinWidth = (pluginTabset as any).getAttrMinWidth?.() ?? 0;
      expect(attrMinWidth).toBeGreaterThanOrEqual(400);
    });
  });

  describe("marketplace block coalescing with plugins", () => {
    it("marketplace opens in the same tabset as an existing plugin", () => {
      useTilingLayoutStore.getState().addBlock(
        { type: "plugin", pluginName: "pomodoro" },
        undefined,
        "block-plugin-pomodoro",
        DockLocation.RIGHT,
      );

      useTilingLayoutStore.getState().addBlock(
        { type: "marketplace" },
        undefined,
        "block-marketplace",
      );

      const { model } = useTilingLayoutStore.getState();
      const pluginNode = model.getNodeById("block-plugin-pomodoro");
      const marketplaceNode = model.getNodeById("block-marketplace");

      expect(pluginNode).toBeDefined();
      expect(marketplaceNode).toBeDefined();
      expect(marketplaceNode?.getParent()?.getId()).toBe(
        pluginNode?.getParent()?.getId(),
      );
    });

    it("marketplace docks at the rightmost position when no plugins exist", () => {
      const restoredLayout: any = {
        global: { tabEnableClose: true, tabSetEnableDeleteWhenEmpty: true },
        layout: {
          type: "row",
          weight: 100,
          children: [
            {
              type: "tabset",
              weight: 30,
              id: "ts-filetree",
              children: [
                { type: "tab", name: "forja", component: "file-tree", id: "tab-file-tree", config: { type: "file-tree", projectName: "forja" } },
              ],
            },
            {
              type: "tabset",
              weight: 70,
              id: "ts-content",
              children: [
                { type: "tab", name: "Terminal", component: "terminal", id: "t1", config: { type: "terminal", sessionType: "terminal" } },
              ],
            },
          ],
        },
      };
      useTilingLayoutStore.getState().loadFromJson(restoredLayout);

      useTilingLayoutStore.getState().addBlock(
        { type: "marketplace" },
        undefined,
        "block-marketplace",
      );

      const { model } = useTilingLayoutStore.getState();
      const json = model.toJson() as any;
      const rootChildren = json.layout.children;
      const lastChild = rootChildren[rootChildren.length - 1];
      const lastChildJson = JSON.stringify(lastChild);
      expect(lastChildJson).toContain("block-marketplace");
    });

    it("plugin opens in the same tabset as an existing marketplace", () => {
      // Open marketplace first
      useTilingLayoutStore.getState().addBlock(
        { type: "marketplace" },
        undefined,
        "block-marketplace",
        DockLocation.RIGHT,
      );

      // Then open a plugin
      useTilingLayoutStore.getState().addBlock(
        { type: "plugin", pluginName: "pomodoro" },
        undefined,
        "block-plugin-pomodoro",
        DockLocation.RIGHT,
      );

      const { model } = useTilingLayoutStore.getState();
      const marketplaceNode = model.getNodeById("block-marketplace");
      const pluginNode = model.getNodeById("block-plugin-pomodoro");

      expect(marketplaceNode).toBeDefined();
      expect(pluginNode).toBeDefined();
      expect(pluginNode?.getParent()?.getId()).toBe(
        marketplaceNode?.getParent()?.getId(),
      );
    });

    it("marketplace tabset gets minWidth=400 and disables drop/maximize", () => {
      useTilingLayoutStore.getState().addBlock(
        { type: "marketplace" },
        undefined,
        "block-marketplace",
        DockLocation.RIGHT,
      );

      const { model } = useTilingLayoutStore.getState();
      const node = model.getNodeById("block-marketplace");
      const tabset = node?.getParent() as any;
      expect(tabset).toBeDefined();
      expect(tabset.getAttrMinWidth?.() ?? 0).toBeGreaterThanOrEqual(400);
      expect(tabset.isEnableDrop?.()).toBe(false);
      expect(tabset.isEnableMaximize?.()).toBe(false);
    });

    it("first plugin/marketplace tabset opens with a small weight to start at minWidth", () => {
      // Add a terminal first so there's a content tabset to split from
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "claude" },
        undefined,
        "t1",
      );

      // Open first plugin — creates a new RIGHT split
      useTilingLayoutStore.getState().addBlock(
        { type: "plugin", pluginName: "pomodoro" },
        undefined,
        "block-plugin-pomodoro",
        DockLocation.RIGHT,
      );

      const { model } = useTilingLayoutStore.getState();
      const pluginNode = model.getNodeById("block-plugin-pomodoro");
      const tabset = pluginNode?.getParent() as any;
      expect(tabset).toBeDefined();

      // The tabset should have a small weight so it opens at minWidth (400px)
      // rather than taking up 50% of the space
      const weight = tabset.getWeight?.();
      expect(weight).toBeDefined();
      expect(weight).toBeLessThanOrEqual(5);
    });

    it("subsequent plugins do not reset the tabset weight", () => {
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "claude" },
        undefined,
        "t1",
      );

      // First plugin — creates new split with small weight
      useTilingLayoutStore.getState().addBlock(
        { type: "plugin", pluginName: "pomodoro" },
        undefined,
        "block-plugin-pomodoro",
        DockLocation.RIGHT,
      );

      const { model: modelBefore } = useTilingLayoutStore.getState();
      const tabsetBefore = modelBefore.getNodeById("block-plugin-pomodoro")?.getParent() as any;
      const weightBefore = tabsetBefore?.getWeight?.();

      // Manually simulate user resizing the pane (flexlayout would update weight)
      const tabsetId = tabsetBefore?.getId();
      if (tabsetId) {
        modelBefore.doAction(
          Actions.updateNodeAttributes(tabsetId, { weight: 40 }),
        );
      }

      // Second plugin — joins existing tabset (CENTER), should NOT change weight
      useTilingLayoutStore.getState().addBlock(
        { type: "plugin", pluginName: "timer" },
        undefined,
        "block-plugin-timer",
        DockLocation.RIGHT,
      );

      const { model: modelAfter } = useTilingLayoutStore.getState();
      const tabsetAfter = modelAfter.getNodeById("block-plugin-timer")?.getParent() as any;
      const weightAfter = tabsetAfter?.getWeight?.();
      expect(weightAfter).toBe(40); // Preserved, not reset
    });
  });

  describe("center tabset routing", () => {
    it("terminal block avoids the plugin tabset when tabset-main is gone", () => {
      // Build a layout with only a plugin tabset (no tabset-main)
      const layoutWithPlugin: any = {
        global: {
          tabEnableClose: true,
          tabSetEnableDeleteWhenEmpty: true,
        },
        layout: {
          type: "row",
          weight: 100,
          children: [
            {
              type: "tabset",
              weight: 50,
              id: "tabset-plugins",
              children: [
                { type: "tab", name: "Pomodoro", component: "plugin", id: "plugin-1", config: { type: "plugin", pluginName: "pomodoro" } },
              ],
            },
            {
              type: "tabset",
              weight: 50,
              id: "tabset-content",
              enableDeleteWhenEmpty: false,
              children: [
                { type: "tab", name: "Claude", component: "terminal", id: "t1", config: { type: "terminal", sessionType: "claude" } },
              ],
            },
          ],
        },
      };
      useTilingLayoutStore.getState().loadFromJson(layoutWithPlugin);

      // Add a new terminal — should go to tabset-content, NOT tabset-plugins
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "gemini" },
        undefined,
        "tab-gemini",
      );

      const { model } = useTilingLayoutStore.getState();
      const terminalNode = model.getNodeById("tab-gemini");
      expect(terminalNode?.getParent()?.getId()).toBe("tabset-content");
    });

    it("browser block avoids the plugin tabset when tabset-main is gone", () => {
      const layout: any = {
        global: {
          tabEnableClose: true,
          tabSetEnableDeleteWhenEmpty: true,
        },
        layout: {
          type: "row",
          weight: 100,
          children: [
            {
              type: "tabset",
              weight: 50,
              id: "tabset-content",
              enableDeleteWhenEmpty: false,
              children: [
                { type: "tab", name: "Claude", component: "terminal", id: "t1", config: { type: "terminal", sessionType: "claude" } },
              ],
            },
            {
              type: "tabset",
              weight: 50,
              id: "tabset-plugins",
              children: [
                { type: "tab", name: "Pomodoro", component: "plugin", id: "plugin-1", config: { type: "plugin", pluginName: "pomodoro" } },
              ],
            },
          ],
        },
      };
      useTilingLayoutStore.getState().loadFromJson(layout);

      useTilingLayoutStore.getState().addBlock(
        { type: "browser", url: "https://example.com" },
        undefined,
        "browser-1",
      );

      const { model } = useTilingLayoutStore.getState();
      const browserNode = model.getNodeById("browser-1");
      expect(browserNode?.getParent()?.getId()).toBe("tabset-content");
    });

    it("browser block avoids the file-preview tabset when tabset-main is gone", () => {
      const layout: any = {
        global: {
          tabEnableClose: true,
          tabSetEnableDeleteWhenEmpty: true,
        },
        layout: {
          type: "row",
          weight: 100,
          children: [
            {
              type: "tabset",
              weight: 30,
              id: "tabset-preview",
              children: [
                { type: "tab", name: "Preview", component: "file-preview", id: "fp1", config: { type: "file-preview", filePath: "/a.ts" } },
              ],
            },
            {
              type: "tabset",
              weight: 70,
              id: "tabset-terms",
              enableDeleteWhenEmpty: false,
              children: [
                { type: "tab", name: "Terminal", component: "terminal", id: "t1", config: { type: "terminal", sessionType: "terminal" } },
              ],
            },
          ],
        },
      };
      useTilingLayoutStore.getState().loadFromJson(layout);

      useTilingLayoutStore.getState().addBlock(
        { type: "browser", url: "https://example.com" },
        undefined,
        "browser-1",
      );

      const { model } = useTilingLayoutStore.getState();
      const browserNode = model.getNodeById("browser-1");
      expect(browserNode?.getParent()?.getId()).toBe("tabset-terms");
    });

    it("multiple browsers coalesce into the same center tabset", () => {
      // Layout without tabset-main: file-tree (left), terminals (center), plugin (right)
      const layout: any = {
        global: {
          tabEnableClose: true,
          tabSetEnableDeleteWhenEmpty: true,
        },
        layout: {
          type: "row",
          weight: 100,
          children: [
            {
              type: "tabset",
              weight: 20,
              id: "tabset-files",
              children: [
                { type: "tab", name: "Files", component: "file-tree", id: "ft1", config: { type: "file-tree" } },
              ],
            },
            {
              type: "tabset",
              weight: 50,
              id: "tabset-center",
              enableDeleteWhenEmpty: false,
              children: [
                { type: "tab", name: "Claude", component: "terminal", id: "t1", config: { type: "terminal", sessionType: "claude" } },
              ],
            },
            {
              type: "tabset",
              weight: 30,
              id: "tabset-plugins",
              children: [
                { type: "tab", name: "Pomodoro", component: "plugin", id: "plugin-1", config: { type: "plugin", pluginName: "pomodoro" } },
              ],
            },
          ],
        },
      };
      useTilingLayoutStore.getState().loadFromJson(layout);

      // Add 4 browsers — all should go to tabset-center, not create separate panes
      useTilingLayoutStore.getState().addBlock(
        { type: "browser", url: "https://example.com" },
        undefined,
        "browser-1",
      );
      useTilingLayoutStore.getState().addBlock(
        { type: "browser", url: "https://example.com/2" },
        undefined,
        "browser-2",
      );
      useTilingLayoutStore.getState().addBlock(
        { type: "browser", url: "https://example.com/3" },
        undefined,
        "browser-3",
      );
      useTilingLayoutStore.getState().addBlock(
        { type: "browser", url: "https://example.com/4" },
        undefined,
        "browser-4",
      );

      const { model } = useTilingLayoutStore.getState();
      // All 4 browsers should be in the same tabset as the terminal
      expect(model.getNodeById("browser-1")?.getParent()?.getId()).toBe("tabset-center");
      expect(model.getNodeById("browser-2")?.getParent()?.getId()).toBe("tabset-center");
      expect(model.getNodeById("browser-3")?.getParent()?.getId()).toBe("tabset-center");
      expect(model.getNodeById("browser-4")?.getParent()?.getId()).toBe("tabset-center");
    });

    it("multiple terminals coalesce into the same center tabset", () => {
      const layout: any = {
        global: {
          tabEnableClose: true,
          tabSetEnableDeleteWhenEmpty: true,
        },
        layout: {
          type: "row",
          weight: 100,
          children: [
            {
              type: "tabset",
              weight: 20,
              id: "tabset-files",
              children: [
                { type: "tab", name: "Files", component: "file-tree", id: "ft1", config: { type: "file-tree" } },
              ],
            },
            {
              type: "tabset",
              weight: 50,
              id: "tabset-center",
              enableDeleteWhenEmpty: false,
              children: [
                { type: "tab", name: "Claude", component: "terminal", id: "t1", config: { type: "terminal", sessionType: "claude" } },
              ],
            },
            {
              type: "tabset",
              weight: 30,
              id: "tabset-plugins",
              children: [
                { type: "tab", name: "Pomodoro", component: "plugin", id: "plugin-1", config: { type: "plugin", pluginName: "pomodoro" } },
              ],
            },
          ],
        },
      };
      useTilingLayoutStore.getState().loadFromJson(layout);

      // Add 3 new terminals — all should go to tabset-center
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "gemini" },
        undefined,
        "t-gemini",
      );
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "codex" },
        undefined,
        "t-codex",
      );
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "terminal" },
        undefined,
        "t-term",
      );

      const { model } = useTilingLayoutStore.getState();
      expect(model.getNodeById("t-gemini")?.getParent()?.getId()).toBe("tabset-center");
      expect(model.getNodeById("t-codex")?.getParent()?.getId()).toBe("tabset-center");
      expect(model.getNodeById("t-term")?.getParent()?.getId()).toBe("tabset-center");
    });

    it("browsers coalesce when tabset-main contains file-tree (drag scenario)", () => {
      // Scenario: user dragged file-tree into tabset-main, or saved layout has it there
      const layout: any = {
        global: {
          tabEnableClose: true,
          tabSetEnableDeleteWhenEmpty: true,
        },
        layout: {
          type: "row",
          weight: 100,
          children: [
            {
              type: "tabset",
              weight: 20,
              id: TABSET_IDS.main,
              enableDeleteWhenEmpty: false,
              children: [
                { type: "tab", name: "Files", component: "file-tree", id: "ft1", config: { type: "file-tree" } },
              ],
            },
            {
              type: "tabset",
              weight: 50,
              id: "tabset-content",
              children: [
                { type: "tab", name: "Claude", component: "terminal", id: "t1", config: { type: "terminal", sessionType: "claude" } },
              ],
            },
            {
              type: "tabset",
              weight: 30,
              id: "tabset-plugins",
              children: [
                { type: "tab", name: "Pomodoro", component: "plugin", id: "plugin-1", config: { type: "plugin", pluginName: "pomodoro" } },
              ],
            },
          ],
        },
      };
      useTilingLayoutStore.getState().loadFromJson(layout);

      // Add 4 browsers — should all go to tabset-content (where the terminal is),
      // NOT create separate panes by splitting from tabset-main
      useTilingLayoutStore.getState().addBlock(
        { type: "browser", url: "https://example.com" },
        undefined,
        "browser-1",
      );
      useTilingLayoutStore.getState().addBlock(
        { type: "browser", url: "https://example.com/2" },
        undefined,
        "browser-2",
      );
      useTilingLayoutStore.getState().addBlock(
        { type: "browser", url: "https://example.com/3" },
        undefined,
        "browser-3",
      );
      useTilingLayoutStore.getState().addBlock(
        { type: "browser", url: "https://example.com/4" },
        undefined,
        "browser-4",
      );

      const { model } = useTilingLayoutStore.getState();
      // All browsers should be in tabset-content, not in separate panes
      expect(model.getNodeById("browser-1")?.getParent()?.getId()).toBe("tabset-content");
      expect(model.getNodeById("browser-2")?.getParent()?.getId()).toBe("tabset-content");
      expect(model.getNodeById("browser-3")?.getParent()?.getId()).toBe("tabset-content");
      expect(model.getNodeById("browser-4")?.getParent()?.getId()).toBe("tabset-content");
    });

    it("browsers coalesce when tabset-main is empty (squeezed pane)", () => {
      // Scenario: user moved everything out of tabset-main, it persists empty
      const layout: any = {
        global: {
          tabEnableClose: true,
          tabSetEnableDeleteWhenEmpty: true,
        },
        layout: {
          type: "row",
          weight: 100,
          children: [
            {
              type: "tabset",
              weight: 10,
              id: TABSET_IDS.main,
              enableDeleteWhenEmpty: false,
              children: [],
            },
            {
              type: "tabset",
              weight: 20,
              id: "tabset-files",
              children: [
                { type: "tab", name: "Files", component: "file-tree", id: "ft1", config: { type: "file-tree" } },
              ],
            },
            {
              type: "tabset",
              weight: 40,
              id: "tabset-content",
              children: [
                { type: "tab", name: "Claude", component: "terminal", id: "t1", config: { type: "terminal", sessionType: "claude" } },
              ],
            },
            {
              type: "tabset",
              weight: 30,
              id: "tabset-plugins",
              children: [
                { type: "tab", name: "Pomodoro", component: "plugin", id: "plugin-1", config: { type: "plugin", pluginName: "pomodoro" } },
              ],
            },
          ],
        },
      };
      useTilingLayoutStore.getState().loadFromJson(layout);

      // Add browsers — should go to tabset-content (where terminal is),
      // NOT to empty tabset-main
      useTilingLayoutStore.getState().addBlock(
        { type: "browser", url: "https://example.com" },
        undefined,
        "browser-1",
      );
      useTilingLayoutStore.getState().addBlock(
        { type: "browser", url: "https://example.com/2" },
        undefined,
        "browser-2",
      );

      const { model } = useTilingLayoutStore.getState();
      expect(model.getNodeById("browser-1")?.getParent()?.getId()).toBe("tabset-content");
      expect(model.getNodeById("browser-2")?.getParent()?.getId()).toBe("tabset-content");
    });
  });

  describe("ghost sessions prevention", () => {
    it("tabset-main has enableDeleteWhenEmpty=false so it persists when empty", () => {
      const { model } = useTilingLayoutStore.getState();
      const mainTabset = model.getNodeById(TABSET_IDS.main);
      expect(mainTabset).toBeDefined();
      // The main tabset should NOT be deleted when empty
      // Check via isEnableDeleteWhenEmpty on the TabSetNode
      const isDeleteEnabled = (mainTabset as any).isEnableDeleteWhenEmpty?.();
      expect(isDeleteEnabled).toBe(false);
    });

    it("non-main tabsets use global default (enableDeleteWhenEmpty=true)", () => {
      // Add a block docked RIGHT to create a secondary tabset
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "terminal" },
        TABSET_IDS.main,
        "tab-a",
      );
      useTilingLayoutStore.getState().addBlock(
        { type: "file-preview" },
        TABSET_IDS.main,
        "block-file-preview",
        DockLocation.RIGHT,
      );

      const { model } = useTilingLayoutStore.getState();
      const previewNode = model.getNodeById("block-file-preview");
      const secondaryTabset = previewNode?.getParent();

      // Secondary tabset should allow deletion when empty
      const isDeleteEnabled = (secondaryTabset as any).isEnableDeleteWhenEmpty?.();
      expect(isDeleteEnabled).toBe(true);
    });

    it("updateModel cleans up empty non-main tabsets after flexlayout tab close", () => {
      // Create a secondary tabset by docking RIGHT
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "terminal" },
        TABSET_IDS.main,
        "tab-main",
      );
      useTilingLayoutStore.getState().addBlock(
        { type: "browser", url: "https://example.com" },
        TABSET_IDS.main,
        "tab-secondary",
        DockLocation.RIGHT,
      );

      const { model } = useTilingLayoutStore.getState();
      const secondaryTabsetId = model.getNodeById("tab-secondary")?.getParent()?.getId();
      expect(secondaryTabsetId).toBeDefined();

      // Simulate flexlayout closing the tab natively (via its own UI X button)
      model.doAction(Actions.deleteTab("tab-secondary"));
      // This is what tiling-layout.tsx onModelChange calls:
      useTilingLayoutStore.getState().updateModel(model);

      // The empty secondary tabset should have been cleaned up
      const { model: after } = useTilingLayoutStore.getState();
      expect(after.getNodeById(secondaryTabsetId!)).toBeUndefined();
      expect(after.getNodeById(TABSET_IDS.main)).toBeDefined();
    });

    it("closeActiveTab cleans up empty non-main tabsets", () => {
      // Create a secondary tabset by docking RIGHT
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "terminal" },
        TABSET_IDS.main,
        "tab-main",
      );
      useTilingLayoutStore.getState().addBlock(
        { type: "browser", url: "https://example.com" },
        TABSET_IDS.main,
        "tab-secondary",
        DockLocation.RIGHT,
      );

      const { model } = useTilingLayoutStore.getState();
      const secondaryTabsetId = model.getNodeById("tab-secondary")?.getParent()?.getId();

      // Select the secondary tab so it becomes the active tab
      model.doAction(Actions.selectTab("tab-secondary"));
      useTilingLayoutStore.getState().updateModel(model);

      // Close the active tab via closeActiveTab
      useTilingLayoutStore.getState().closeActiveTab();

      const { model: after } = useTilingLayoutStore.getState();
      expect(after.getNodeById(secondaryTabsetId!)).toBeUndefined();
      expect(after.getNodeById(TABSET_IDS.main)).toBeDefined();
    });

    it("removeBlock cleans up empty non-main tabsets", () => {
      // Create a secondary tabset by docking RIGHT
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "terminal" },
        TABSET_IDS.main,
        "tab-main",
      );
      useTilingLayoutStore.getState().addBlock(
        { type: "browser", url: "https://example.com" },
        TABSET_IDS.main,
        "tab-secondary",
        DockLocation.RIGHT,
      );

      const { model: before } = useTilingLayoutStore.getState();
      const secondaryTabsetId = before.getNodeById("tab-secondary")?.getParent()?.getId();
      expect(secondaryTabsetId).toBeDefined();
      expect(secondaryTabsetId).not.toBe(TABSET_IDS.main);

      // Remove the only tab in the secondary tabset
      useTilingLayoutStore.getState().removeBlock("tab-secondary");

      // The empty secondary tabset should have been cleaned up
      const { model: after } = useTilingLayoutStore.getState();
      expect(after.getNodeById(secondaryTabsetId!)).toBeUndefined();
      // Main tabset should still exist
      expect(after.getNodeById(TABSET_IDS.main)).toBeDefined();
    });

    it("loadFromJson strips empty tabsets from restored layout", () => {
      // Build a layout JSON with an empty non-main tabset
      const layoutWithEmptyTabset: any = {
        global: {
          tabEnableClose: true,
          tabSetEnableDeleteWhenEmpty: true,
        },
        layout: {
          type: "row",
          weight: 100,
          children: [
            {
              type: "tabset",
              weight: 50,
              id: TABSET_IDS.main,
              enableDeleteWhenEmpty: false,
              children: [
                { type: "tab", name: "Terminal", component: "terminal", id: "t1", config: { type: "terminal", sessionType: "terminal" } },
              ],
            },
            {
              type: "tabset",
              weight: 50,
              id: "ghost-tabset",
              children: [],
            },
          ],
        },
      };

      useTilingLayoutStore.getState().loadFromJson(layoutWithEmptyTabset);

      const { model } = useTilingLayoutStore.getState();
      // The ghost tabset should have been removed
      expect(model.getNodeById("ghost-tabset")).toBeUndefined();
      // Main tabset and its tab should still exist
      expect(model.getNodeById(TABSET_IDS.main)).toBeDefined();
      expect(model.getNodeById("t1")).toBeDefined();
    });

    it("restoreLayoutForProject strips empty tabsets", () => {
      // Build and save a layout with ghost tabset
      const layoutWithGhost: any = {
        global: {
          tabEnableClose: true,
          tabSetEnableDeleteWhenEmpty: true,
        },
        layout: {
          type: "row",
          weight: 100,
          children: [
            {
              type: "tabset",
              weight: 50,
              id: TABSET_IDS.main,
              enableDeleteWhenEmpty: false,
              children: [
                { type: "tab", name: "Terminal", component: "terminal", id: "t1", config: { type: "terminal", sessionType: "terminal" } },
              ],
            },
            {
              type: "tabset",
              weight: 50,
              id: "ghost-tabset",
              children: [],
            },
          ],
        },
      };

      // Manually set layoutByProject
      useTilingLayoutStore.setState({
        layoutByProject: { "/project-ghost": layoutWithGhost },
      });

      useTilingLayoutStore.getState().restoreLayoutForProject("/project-ghost");

      const { model } = useTilingLayoutStore.getState();
      expect(model.getNodeById("ghost-tabset")).toBeUndefined();
      expect(model.getNodeById(TABSET_IDS.main)).toBeDefined();
    });
  });

  describe("hasBlockOfType", () => {
    it("returns true when a block of the given type exists", () => {
      useTilingLayoutStore.getState().addBlock(
        { type: "browser", url: "https://example.com" },
        TABSET_IDS.main,
        "browser-1",
      );
      expect(useTilingLayoutStore.getState().hasBlockOfType("browser")).toBe(true);
    });

    it("returns false when no block of the given type exists", () => {
      expect(useTilingLayoutStore.getState().hasBlockOfType("browser")).toBe(false);
    });

    it("returns true when multiple blocks of the same type exist", () => {
      useTilingLayoutStore.getState().addBlock(
        { type: "browser", url: "https://a.com" },
        TABSET_IDS.main,
        "browser-a",
      );
      useTilingLayoutStore.getState().addBlock(
        { type: "browser", url: "https://b.com" },
        TABSET_IDS.main,
        "browser-b",
      );
      expect(useTilingLayoutStore.getState().hasBlockOfType("browser")).toBe(true);
      // Remove one — should still be true
      useTilingLayoutStore.getState().removeBlock("browser-a");
      expect(useTilingLayoutStore.getState().hasBlockOfType("browser")).toBe(true);
      // Remove the other — now false
      useTilingLayoutStore.getState().removeBlock("browser-b");
      expect(useTilingLayoutStore.getState().hasBlockOfType("browser")).toBe(false);
    });
  });

  describe("renameBlock", () => {
    it("renames a tab node", () => {
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "claude" },
        TABSET_IDS.main,
        "tab-rename-test",
      );

      useTilingLayoutStore.getState().renameBlock("tab-rename-test", "My Name");

      const { model } = useTilingLayoutStore.getState();
      const node = model.getNodeById("tab-rename-test");
      expect(node?.getName()).toBe("My Name");
    });

    it("resets to default name when given empty string", () => {
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "claude" },
        TABSET_IDS.main,
        "tab-reset-name",
      );

      // First rename to custom name
      useTilingLayoutStore.getState().renameBlock("tab-reset-name", "Custom");
      expect(useTilingLayoutStore.getState().model.getNodeById("tab-reset-name")?.getName()).toBe("Custom");

      // Reset with empty string
      useTilingLayoutStore.getState().renameBlock("tab-reset-name", "");

      const { model } = useTilingLayoutStore.getState();
      const node = model.getNodeById("tab-reset-name");
      expect(node?.getName()).toBe("Claude");
    });

    it("is a no-op for nonexistent nodeId", () => {
      expect(() => {
        useTilingLayoutStore.getState().renameBlock("nonexistent", "Test");
      }).not.toThrow();
    });

    it("syncs customName to terminal-tabs store", () => {
      // Mock getCurrentWindow for terminal-tabs store
      vi.mock("@/lib/ipc", () => ({
        invoke: vi.fn(),
        listen: vi.fn(() => () => {}),
        getCurrentWindow: vi.fn(() => ({ label: "main" })),
      }));

      // Add a tab to the terminal-tabs store first
      useTerminalTabsStore.setState({
        tabs: [{ id: "tab-sync", name: "Claude", path: "/test", isRunning: true, sessionType: "claude" }],
        activeTabId: "tab-sync",
      });

      // Add a matching block in tiling layout
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "claude" },
        TABSET_IDS.main,
        "tab-sync",
      );

      useTilingLayoutStore.getState().renameBlock("tab-sync", "Renamed");

      const tab = useTerminalTabsStore.getState().tabs.find((t) => t.id === "tab-sync");
      expect(tab?.customName).toBe("Renamed");
    });
  });

  describe("selectTab", () => {
    it("selects a tab by nodeId", () => {
      // Add two tabs to main
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "terminal" },
        TABSET_IDS.main,
        "tab-a",
      );
      useTilingLayoutStore.getState().addBlock(
        { type: "browser", url: "http://localhost" },
        TABSET_IDS.main,
        "tab-b",
      );

      // Select the first tab (the second is selected by default after addBlock)
      useTilingLayoutStore.getState().selectTab("tab-a");

      const { model } = useTilingLayoutStore.getState();
      const mainTabset = model.getNodeById(TABSET_IDS.main) as any;
      const selectedNode = mainTabset?.getSelectedNode?.();
      expect(selectedNode?.getId()).toBe("tab-a");
    });

    it("is a no-op when nodeId does not exist", () => {
      expect(() => {
        useTilingLayoutStore.getState().selectTab("nonexistent");
      }).not.toThrow();
    });
  });

  describe("isModelEmpty", () => {
    it("returns true for model with no tabs", () => {
      const isEmpty = useTilingLayoutStore.getState().isModelEmpty();
      expect(isEmpty).toBe(true);
    });

    it("returns false for model with at least one tab", () => {
      useTilingLayoutStore.getState().addBlock({ type: "terminal", sessionType: "terminal" });
      const isEmpty = useTilingLayoutStore.getState().isModelEmpty();
      expect(isEmpty).toBe(false);
    });
  });

  describe("tabCount reactivity", () => {
    it("starts at 0 for default empty layout", () => {
      expect(useTilingLayoutStore.getState().tabCount).toBe(0);
    });

    it("increments when addBlock is called", () => {
      useTilingLayoutStore.getState().addBlock({ type: "terminal", sessionType: "terminal" });
      expect(useTilingLayoutStore.getState().tabCount).toBe(1);
    });

    it("increments for each added block", () => {
      useTilingLayoutStore.getState().addBlock({ type: "terminal", sessionType: "terminal" }, undefined, "t1");
      useTilingLayoutStore.getState().addBlock({ type: "browser", url: "http://localhost" }, undefined, "b1");
      expect(useTilingLayoutStore.getState().tabCount).toBe(2);
    });

    it("decrements when removeBlock is called", () => {
      useTilingLayoutStore.getState().addBlock({ type: "terminal", sessionType: "terminal" }, undefined, "t1");
      useTilingLayoutStore.getState().addBlock({ type: "browser", url: "http://localhost" }, undefined, "b1");
      useTilingLayoutStore.getState().removeBlock("t1");
      expect(useTilingLayoutStore.getState().tabCount).toBe(1);
    });

    it("resets to 0 when resetToDefault is called", () => {
      useTilingLayoutStore.getState().addBlock({ type: "terminal", sessionType: "terminal" });
      useTilingLayoutStore.getState().resetToDefault();
      expect(useTilingLayoutStore.getState().tabCount).toBe(0);
    });

    it("updates when updateModel is called", () => {
      useTilingLayoutStore.getState().addBlock({ type: "terminal", sessionType: "terminal" }, undefined, "t1");
      const { model } = useTilingLayoutStore.getState();
      // Simulate flexlayout removing a tab (mutating model in place)
      model.doAction(Actions.deleteTab("t1"));
      useTilingLayoutStore.getState().updateModel(model);
      expect(useTilingLayoutStore.getState().tabCount).toBe(0);
    });

    it("updates when loadFromJson is called", () => {
      useTilingLayoutStore.getState().addBlock({ type: "terminal", sessionType: "terminal" }, undefined, "t1");
      const json = useTilingLayoutStore.getState().getModelJson();
      useTilingLayoutStore.getState().resetToDefault();
      useTilingLayoutStore.getState().loadFromJson(json);
      expect(useTilingLayoutStore.getState().tabCount).toBe(1);
    });

    it("updates when restoreLayoutForProject is called", () => {
      useTilingLayoutStore.getState().addBlock({ type: "terminal", sessionType: "terminal" });
      useTilingLayoutStore.getState().saveLayoutForProject("/p1");
      useTilingLayoutStore.getState().resetToDefault();
      expect(useTilingLayoutStore.getState().tabCount).toBe(0);
      useTilingLayoutStore.getState().restoreLayoutForProject("/p1");
      expect(useTilingLayoutStore.getState().tabCount).toBe(1);
    });
  });

  describe("editingTabId", () => {
    it("initializes as null", () => {
      expect(useTilingLayoutStore.getState().editingTabId).toBeNull();
    });

    it("sets editingTabId", () => {
      useTilingLayoutStore.getState().setEditingTabId("tab-1");
      expect(useTilingLayoutStore.getState().editingTabId).toBe("tab-1");
    });

    it("clears editingTabId", () => {
      useTilingLayoutStore.getState().setEditingTabId("tab-1");
      useTilingLayoutStore.getState().setEditingTabId(null);
      expect(useTilingLayoutStore.getState().editingTabId).toBeNull();
    });
  });

  describe("getTabsetIds", () => {
    it("returns tabset-main for default layout", () => {
      const ids = useTilingLayoutStore.getState().getTabsetIds();
      expect(ids).toEqual([TABSET_IDS.main]);
    });

    it("returns multiple tabset IDs after splitting", () => {
      // Add a terminal and split to create a second tabset
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "claude" },
        TABSET_IDS.main,
        "term-1",
      );
      useTilingLayoutStore.getState().splitActiveTabset("vertical", "terminal");

      const ids = useTilingLayoutStore.getState().getTabsetIds();
      expect(ids.length).toBeGreaterThanOrEqual(2);
      expect(ids).toContain(TABSET_IDS.main);
    });
  });

  describe("cycleActiveTabset", () => {
    it("returns null with only one tabset", () => {
      const result = useTilingLayoutStore.getState().cycleActiveTabset("forward");
      expect(result).toBeNull();
    });

    it("cycles forward to next tabset", () => {
      // Create two tabsets
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "claude" },
        TABSET_IDS.main,
        "term-1",
      );
      useTilingLayoutStore.getState().splitActiveTabset("vertical", "terminal");

      const ids = useTilingLayoutStore.getState().getTabsetIds();
      expect(ids.length).toBeGreaterThanOrEqual(2);

      // Set first as active
      const { model } = useTilingLayoutStore.getState();
      model.doAction(Actions.setActiveTabset(ids[0]));

      const result = useTilingLayoutStore.getState().cycleActiveTabset("forward");
      expect(result).toBe(ids[1]);
    });

    it("cycles backward to previous tabset", () => {
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "claude" },
        TABSET_IDS.main,
        "term-1",
      );
      useTilingLayoutStore.getState().splitActiveTabset("vertical", "terminal");

      const ids = useTilingLayoutStore.getState().getTabsetIds();
      expect(ids.length).toBeGreaterThanOrEqual(2);

      // Set second as active
      const { model } = useTilingLayoutStore.getState();
      model.doAction(Actions.setActiveTabset(ids[1]));

      const result = useTilingLayoutStore.getState().cycleActiveTabset("backward");
      expect(result).toBe(ids[0]);
    });

    it("wraps around forward from last to first", () => {
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "claude" },
        TABSET_IDS.main,
        "term-1",
      );
      useTilingLayoutStore.getState().splitActiveTabset("vertical", "terminal");

      const ids = useTilingLayoutStore.getState().getTabsetIds();
      const lastId = ids[ids.length - 1];

      // Set last as active
      const { model } = useTilingLayoutStore.getState();
      model.doAction(Actions.setActiveTabset(lastId));

      const result = useTilingLayoutStore.getState().cycleActiveTabset("forward");
      expect(result).toBe(ids[0]);
    });

    it("wraps around backward from first to last", () => {
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "claude" },
        TABSET_IDS.main,
        "term-1",
      );
      useTilingLayoutStore.getState().splitActiveTabset("vertical", "terminal");

      const ids = useTilingLayoutStore.getState().getTabsetIds();

      // Set first as active
      const { model } = useTilingLayoutStore.getState();
      model.doAction(Actions.setActiveTabset(ids[0]));

      const result = useTilingLayoutStore.getState().cycleActiveTabset("backward");
      expect(result).toBe(ids[ids.length - 1]);
    });
  });

  describe("cycleGlobalTab", () => {
    it("returns null when there are no tabs at all", () => {
      const result = useTilingLayoutStore.getState().cycleGlobalTab("forward");
      expect(result).toBeNull();
    });

    it("returns null when there is only one tab globally", () => {
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "terminal" },
        TABSET_IDS.main,
        "tab-only",
      );
      const result = useTilingLayoutStore.getState().cycleGlobalTab("forward");
      expect(result).toBeNull();
    });

    it("cycles forward through tabs in the same tabset", () => {
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "claude" },
        TABSET_IDS.main,
        "tab-a",
      );
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "terminal" },
        TABSET_IDS.main,
        "tab-b",
      );
      // tab-b is selected (last added), forward wraps to tab-a
      const result = useTilingLayoutStore.getState().cycleGlobalTab("forward");
      expect(result).toBe("tab-a");
    });

    it("cycles forward across tabsets when at last tab of current tabset", () => {
      // Add tabs to main tabset
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "claude" },
        TABSET_IDS.main,
        "tab-a",
      );
      // Split to create a second tabset with a new tab
      useTilingLayoutStore.getState().splitActiveTabset("vertical", "terminal");

      // Collect all tab IDs across all tabsets
      const store = useTilingLayoutStore.getState();
      const tabsetIds = store.getTabsetIds();
      expect(tabsetIds.length).toBeGreaterThanOrEqual(2);

      // Select tab-a (first tabset), then cycle forward — should go to second tabset
      store.selectTab("tab-a");
      const result = useTilingLayoutStore.getState().cycleGlobalTab("forward");
      // Result should be a tab in the second tabset (not tab-a)
      expect(result).not.toBe("tab-a");
      expect(result).toBeTruthy();
    });

    it("cycles backward and wraps from first tab to last tab across tabsets", () => {
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "claude" },
        TABSET_IDS.main,
        "tab-a",
      );
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", sessionType: "terminal" },
        TABSET_IDS.main,
        "tab-b",
      );
      // Select tab-a (first tab globally), backward should wrap to tab-b (last tab)
      useTilingLayoutStore.getState().selectTab("tab-a");
      const result = useTilingLayoutStore.getState().cycleGlobalTab("backward");
      expect(result).toBe("tab-b");
    });
  });
});
