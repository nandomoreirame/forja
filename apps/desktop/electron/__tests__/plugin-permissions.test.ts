import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PluginPermissionGrant } from "../plugins/types.js";

let mockGrants: PluginPermissionGrant[] = [];

vi.mock("../config.js", () => ({
  getPluginPermissions: vi.fn(() => mockGrants),
  setPluginPermission: vi.fn((grant: PluginPermissionGrant) => {
    mockGrants = mockGrants.filter((g) => g.pluginName !== grant.pluginName);
    mockGrants.push(grant);
  }),
}));

describe("plugin-permissions", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGrants = [];
  });

  describe("getRequiredPermission", () => {
    it("maps known methods to permissions", async () => {
      const { getRequiredPermission } = await import("../plugins/plugin-permissions.js");
      expect(getRequiredPermission("git.status")).toBe("git.status");
      expect(getRequiredPermission("project.getActive")).toBe("project.active");
      expect(getRequiredPermission("fs.readFile")).toBe("fs.read");
      expect(getRequiredPermission("fs.writeFile")).toBe("fs.write");
      expect(getRequiredPermission("terminal.execute")).toBe("terminal.execute");
      expect(getRequiredPermission("theme.getCurrent")).toBe("theme.current");
      expect(getRequiredPermission("notifications.show")).toBe("notifications");
    });

    it("returns null for unknown methods", async () => {
      const { getRequiredPermission } = await import("../plugins/plugin-permissions.js");
      expect(getRequiredPermission("unknown.method")).toBeNull();
      expect(getRequiredPermission("hack.system")).toBeNull();
    });
  });

  describe("hasPermission", () => {
    it("returns false when no grants exist", async () => {
      const { hasPermission } = await import("../plugins/plugin-permissions.js");
      expect(hasPermission("test-plugin", "git.status")).toBe(false);
    });

    it("returns true when permission is granted", async () => {
      mockGrants = [{
        pluginName: "test-plugin",
        grantedPermissions: ["git.status", "git.log"],
        deniedPermissions: [],
        grantedAt: new Date().toISOString(),
      }];
      const { hasPermission } = await import("../plugins/plugin-permissions.js");
      expect(hasPermission("test-plugin", "git.status")).toBe(true);
      expect(hasPermission("test-plugin", "git.log")).toBe(true);
    });

    it("returns false when permission is not in granted list", async () => {
      mockGrants = [{
        pluginName: "test-plugin",
        grantedPermissions: ["git.status"],
        deniedPermissions: [],
        grantedAt: new Date().toISOString(),
      }];
      const { hasPermission } = await import("../plugins/plugin-permissions.js");
      expect(hasPermission("test-plugin", "fs.write")).toBe(false);
    });
  });

  describe("isPermissionDenied", () => {
    it("returns false when no grants exist", async () => {
      const { isPermissionDenied } = await import("../plugins/plugin-permissions.js");
      expect(isPermissionDenied("test-plugin", "git.status")).toBe(false);
    });

    it("returns true when permission is explicitly denied", async () => {
      mockGrants = [{
        pluginName: "test-plugin",
        grantedPermissions: [],
        deniedPermissions: ["fs.write"],
        grantedAt: new Date().toISOString(),
      }];
      const { isPermissionDenied } = await import("../plugins/plugin-permissions.js");
      expect(isPermissionDenied("test-plugin", "fs.write")).toBe(true);
    });
  });

  describe("hasAnyGrant", () => {
    it("returns false when no grants exist", async () => {
      const { hasAnyGrant } = await import("../plugins/plugin-permissions.js");
      expect(hasAnyGrant("test-plugin")).toBe(false);
    });

    it("returns true when plugin has a grant record", async () => {
      mockGrants = [{
        pluginName: "test-plugin",
        grantedPermissions: [],
        deniedPermissions: [],
        grantedAt: new Date().toISOString(),
      }];
      const { hasAnyGrant } = await import("../plugins/plugin-permissions.js");
      expect(hasAnyGrant("test-plugin")).toBe(true);
    });
  });

  describe("grantPermissions", () => {
    it("creates new grant for plugin", async () => {
      const config = await import("../config.js");
      const { grantPermissions } = await import("../plugins/plugin-permissions.js");
      grantPermissions("my-plugin", ["git.status", "git.log"]);
      expect(config.setPluginPermission).toHaveBeenCalledWith(
        expect.objectContaining({
          pluginName: "my-plugin",
          grantedPermissions: ["git.status", "git.log"],
          deniedPermissions: [],
        })
      );
    });

    it("merges with existing granted permissions", async () => {
      mockGrants = [{
        pluginName: "my-plugin",
        grantedPermissions: ["git.status"],
        deniedPermissions: [],
        grantedAt: new Date().toISOString(),
      }];
      const config = await import("../config.js");
      const { grantPermissions } = await import("../plugins/plugin-permissions.js");
      grantPermissions("my-plugin", ["git.log"]);
      expect(config.setPluginPermission).toHaveBeenCalledWith(
        expect.objectContaining({
          grantedPermissions: expect.arrayContaining(["git.status", "git.log"]),
        })
      );
    });

    it("removes from denied when granting", async () => {
      mockGrants = [{
        pluginName: "my-plugin",
        grantedPermissions: [],
        deniedPermissions: ["git.status", "fs.write"],
        grantedAt: new Date().toISOString(),
      }];
      const config = await import("../config.js");
      const { grantPermissions } = await import("../plugins/plugin-permissions.js");
      grantPermissions("my-plugin", ["git.status"]);
      expect(config.setPluginPermission).toHaveBeenCalledWith(
        expect.objectContaining({
          deniedPermissions: ["fs.write"],
        })
      );
    });
  });

  describe("denyPermissions", () => {
    it("creates deny record", async () => {
      const config = await import("../config.js");
      const { denyPermissions } = await import("../plugins/plugin-permissions.js");
      denyPermissions("my-plugin", ["fs.write"]);
      expect(config.setPluginPermission).toHaveBeenCalledWith(
        expect.objectContaining({
          pluginName: "my-plugin",
          grantedPermissions: [],
          deniedPermissions: ["fs.write"],
        })
      );
    });

    it("removes from granted when denying", async () => {
      mockGrants = [{
        pluginName: "my-plugin",
        grantedPermissions: ["git.status", "fs.write"],
        deniedPermissions: [],
        grantedAt: new Date().toISOString(),
      }];
      const config = await import("../config.js");
      const { denyPermissions } = await import("../plugins/plugin-permissions.js");
      denyPermissions("my-plugin", ["fs.write"]);
      expect(config.setPluginPermission).toHaveBeenCalledWith(
        expect.objectContaining({
          grantedPermissions: ["git.status"],
          deniedPermissions: ["fs.write"],
        })
      );
    });
  });
});
