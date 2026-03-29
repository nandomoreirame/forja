import { describe, it, expect } from "vitest";
import {
  VALID_PERMISSIONS,
  PERMISSION_INFO,
  getPluginIcon,
} from "../plugin-types";
import type { PluginPermission } from "../plugin-types";

describe("plugin-types", () => {
  it("VALID_PERMISSIONS contains all 10 permissions", () => {
    expect(VALID_PERMISSIONS).toHaveLength(10);
    expect(VALID_PERMISSIONS).toContain("project.active");
    expect(VALID_PERMISSIONS).toContain("terminal.execute");
  });

  it("PERMISSION_INFO has entry for every valid permission", () => {
    for (const perm of VALID_PERMISSIONS) {
      expect(PERMISSION_INFO[perm]).toBeDefined();
      expect(PERMISSION_INFO[perm].label).toBeTruthy();
      expect(PERMISSION_INFO[perm].description).toBeTruthy();
      expect(["low", "medium", "high", "critical"]).toContain(
        PERMISSION_INFO[perm].risk,
      );
    }
  });

  it("getPluginIcon returns a component for known icons", () => {
    const icon = getPluginIcon("Timer");
    expect(icon).not.toBeNull();
    // Lucide React icons are forwardRef objects (typeof "object") or function components
    expect(["function", "object"]).toContain(typeof icon);
  });

  it("getPluginIcon returns null for unknown icons", () => {
    const icon = getPluginIcon("NonExistentIconXyz123");
    expect(icon).toBeNull();
  });

  it("getPluginIcon resolves common Lucide icons", () => {
    expect(getPluginIcon("Sparkles")).not.toBeNull();
    expect(getPluginIcon("Code")).not.toBeNull();
    expect(getPluginIcon("GitBranch")).not.toBeNull();
  });
});
