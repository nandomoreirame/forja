import { describe, it, expect } from "vitest";
import { WORKSPACE_ICON_MAP, getWorkspaceIcon, WORKSPACE_ICON_LIST } from "../workspace-icons";
import type { WorkspaceIcon } from "@/stores/workspace";

describe("workspace-icons", () => {
  describe("WORKSPACE_ICON_MAP", () => {
    it("contains all 14 icon keys", () => {
      const keys = Object.keys(WORKSPACE_ICON_MAP);
      expect(keys).toHaveLength(14);
    });

    it("maps all expected workspace icon names", () => {
      const expected: WorkspaceIcon[] = [
        "waves", "mountain", "star", "heart", "bolt", "cloud",
        "moon", "layers", "rocket", "beaker", "link", "trending",
        "graduation", "coffee",
      ];
      for (const key of expected) {
        expect(WORKSPACE_ICON_MAP).toHaveProperty(key);
      }
    });

    it("each value is a React component (non-null, non-undefined)", () => {
      for (const [, component] of Object.entries(WORKSPACE_ICON_MAP)) {
        expect(component).toBeTruthy();
      }
    });
  });

  describe("getWorkspaceIcon", () => {
    it("returns the correct component for a known icon key", () => {
      const layers = getWorkspaceIcon("layers");
      expect(layers).toBeTruthy();
      expect(layers).toBe(WORKSPACE_ICON_MAP["layers"]);
    });

    it("returns Layers as fallback for unknown icon key", () => {
      const fallback = getWorkspaceIcon("unknown" as WorkspaceIcon);
      expect(fallback).toBe(WORKSPACE_ICON_MAP["layers"]);
    });
  });

  describe("WORKSPACE_ICON_LIST", () => {
    it("contains all 14 icons", () => {
      expect(WORKSPACE_ICON_LIST).toHaveLength(14);
    });

    it("contains all expected icon names", () => {
      expect(WORKSPACE_ICON_LIST).toContain("waves");
      expect(WORKSPACE_ICON_LIST).toContain("coffee");
      expect(WORKSPACE_ICON_LIST).toContain("rocket");
    });
  });
});
