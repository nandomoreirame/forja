import { describe, it, expect } from "vitest";
import {
  ALL_BLOCK_TYPES,
  getBlockLabel,
  getBlockIcon,
  isValidBlockType,
  type BlockType,
  type BlockConfig,
} from "../block-registry";

describe("block-registry", () => {
  describe("ALL_BLOCK_TYPES", () => {
    it("contains all expected block types", () => {
      expect(ALL_BLOCK_TYPES).toEqual([
        "terminal",
        "file-preview",
        "browser",
        "plugin",
        "file-tree",
        "agent-chat",
        "marketplace",
      ]);
    });
  });

  describe("getBlockLabel", () => {
    it("returns correct label for each block type", () => {
      expect(getBlockLabel("terminal")).toBe("Terminal");
      expect(getBlockLabel("file-preview")).toBe("Preview");
      expect(getBlockLabel("browser")).toBe("Browser");
      expect(getBlockLabel("plugin")).toBe("Plugin");
      expect(getBlockLabel("file-tree")).toBe("Files");
      expect(getBlockLabel("agent-chat")).toBe("AI Assistant");
      expect(getBlockLabel("marketplace")).toBe("Marketplace");
    });
  });

  describe("getBlockIcon", () => {
    it("returns correct icon for each block type", () => {
      expect(getBlockIcon("terminal")).toBe("terminal");
      expect(getBlockIcon("file-preview")).toBe("file-text");
      expect(getBlockIcon("browser")).toBe("globe");
      expect(getBlockIcon("plugin")).toBe("puzzle");
      expect(getBlockIcon("file-tree")).toBe("folder-tree");
      expect(getBlockIcon("agent-chat")).toBe("message-circle");
      expect(getBlockIcon("marketplace")).toBe("store");
    });
  });

  describe("isValidBlockType", () => {
    it("returns true for valid block types", () => {
      for (const type of ALL_BLOCK_TYPES) {
        expect(isValidBlockType(type)).toBe(true);
      }
    });

    it("returns false for invalid block types", () => {
      expect(isValidBlockType("invalid")).toBe(false);
      expect(isValidBlockType("")).toBe(false);
      expect(isValidBlockType("Terminal")).toBe(false);
    });
  });

  describe("BlockConfig type", () => {
    it("creates valid terminal config", () => {
      const config: BlockConfig = {
        type: "terminal",
        tabId: "tab-1",
        sessionType: "claude",
      };
      expect(config.type).toBe("terminal");
      expect(config.tabId).toBe("tab-1");
    });

    it("creates valid file-preview config", () => {
      const config: BlockConfig = {
        type: "file-preview",
        filePath: "/path/to/file.ts",
      };
      expect(config.type).toBe("file-preview");
      expect(config.filePath).toBe("/path/to/file.ts");
    });

    it("creates valid browser config", () => {
      const config: BlockConfig = {
        type: "browser",
        url: "https://example.com",
      };
      expect(config.type).toBe("browser");
      expect(config.url).toBe("https://example.com");
    });

    it("creates valid plugin config", () => {
      const config: BlockConfig = {
        type: "plugin",
        pluginName: "my-plugin",
      };
      expect(config.type).toBe("plugin");
      expect(config.pluginName).toBe("my-plugin");
    });
  });
});
