import { describe, it, expect } from "vitest";
import { WORKSPACE_COLOR_MAP, getWorkspaceColor, WORKSPACE_COLOR_LIST } from "../workspace-colors";
import type { WorkspaceColor } from "@/stores/workspace";

describe("workspace-colors", () => {
  describe("WORKSPACE_COLOR_MAP", () => {
    it("contains all 7 color keys", () => {
      const keys = Object.keys(WORKSPACE_COLOR_MAP);
      expect(keys).toHaveLength(7);
    });

    it("maps all expected workspace color names", () => {
      const expected: WorkspaceColor[] = [
        "green", "teal", "blue", "mauve", "red", "peach", "yellow",
      ];
      for (const color of expected) {
        expect(WORKSPACE_COLOR_MAP).toHaveProperty(color);
      }
    });

    it("maps correct hex values for each color", () => {
      expect(WORKSPACE_COLOR_MAP.green).toBe("#a6e3a1");
      expect(WORKSPACE_COLOR_MAP.teal).toBe("#94e2d5");
      expect(WORKSPACE_COLOR_MAP.blue).toBe("#89b4fa");
      expect(WORKSPACE_COLOR_MAP.mauve).toBe("#cba6f7");
      expect(WORKSPACE_COLOR_MAP.red).toBe("#f38ba8");
      expect(WORKSPACE_COLOR_MAP.peach).toBe("#fab387");
      expect(WORKSPACE_COLOR_MAP.yellow).toBe("#f9e2af");
    });

    it("each value is a hex color string", () => {
      for (const [, hex] of Object.entries(WORKSPACE_COLOR_MAP)) {
        expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
      }
    });
  });

  describe("getWorkspaceColor", () => {
    it("returns the correct hex for a known color key", () => {
      expect(getWorkspaceColor("mauve")).toBe("#cba6f7");
      expect(getWorkspaceColor("blue")).toBe("#89b4fa");
    });

    it("returns mauve as fallback for unknown color key", () => {
      const fallback = getWorkspaceColor("unknown" as WorkspaceColor);
      expect(fallback).toBe("#cba6f7");
    });
  });

  describe("WORKSPACE_COLOR_LIST", () => {
    it("contains all 7 colors", () => {
      expect(WORKSPACE_COLOR_LIST).toHaveLength(7);
    });

    it("contains all expected color names", () => {
      expect(WORKSPACE_COLOR_LIST).toContain("mauve");
      expect(WORKSPACE_COLOR_LIST).toContain("green");
      expect(WORKSPACE_COLOR_LIST).toContain("yellow");
    });
  });
});
