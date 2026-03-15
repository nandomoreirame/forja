import { describe, it, expect } from "vitest";
import {
  validateManifest,
  validateRegistryData,
  VALID_PERMISSIONS,
  satisfiesMinVersion,
} from "../plugins/types.js";
import type { RegistryData } from "../plugins/types.js";

describe("validateManifest", () => {
  const validManifest = {
    name: "hello-world",
    version: "1.0.0",
    displayName: "Hello World",
    description: "A sample plugin",
    author: "test",
    icon: "Sparkles",
    entry: "index.html",
    permissions: ["project.active", "theme.current"],
  };

  it("accepts a valid manifest", () => {
    const result = validateManifest(validManifest);
    expect(result.valid).toBe(true);
    expect(result.manifest).toEqual(validManifest);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects manifest missing required fields", () => {
    const result = validateManifest({ name: "test" });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects manifest with invalid permission", () => {
    const result = validateManifest({ ...validManifest, permissions: ["hack.system"] });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid permission: "hack.system"');
  });

  it("rejects manifest with non-kebab-case name", () => {
    const result = validateManifest({ ...validManifest, name: "Hello World" });
    expect(result.valid).toBe(false);
  });

  it("rejects manifest with invalid semver version", () => {
    const result = validateManifest({ ...validManifest, version: "not-a-version" });
    expect(result.valid).toBe(false);
  });

  it("accepts manifest with optional minForjaVersion", () => {
    const result = validateManifest({ ...validManifest, minForjaVersion: "1.6.0" });
    expect(result.valid).toBe(true);
    expect(result.manifest?.minForjaVersion).toBe("1.6.0");
  });

  it("accepts manifest with scope 'global'", () => {
    const result = validateManifest({ ...validManifest, scope: "global" });
    expect(result.valid).toBe(true);
    expect(result.manifest?.scope).toBe("global");
  });

  it("accepts manifest with scope 'project'", () => {
    const result = validateManifest({ ...validManifest, scope: "project" });
    expect(result.valid).toBe(true);
    expect(result.manifest?.scope).toBe("project");
  });

  it("accepts manifest without scope (defaults to project)", () => {
    const result = validateManifest(validManifest);
    expect(result.valid).toBe(true);
    // scope is optional, missing means "project"
  });

  it("rejects manifest with invalid scope value", () => {
    const result = validateManifest({ ...validManifest, scope: "invalid" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid scope: "invalid" (must be "global" or "project")');
  });
});

describe("VALID_PERMISSIONS", () => {
  it("contains all expected permissions", () => {
    expect(VALID_PERMISSIONS).toContain("project.active");
    expect(VALID_PERMISSIONS).toContain("git.status");
    expect(VALID_PERMISSIONS).toContain("git.log");
    expect(VALID_PERMISSIONS).toContain("git.diff");
    expect(VALID_PERMISSIONS).toContain("fs.read");
    expect(VALID_PERMISSIONS).toContain("fs.write");
    expect(VALID_PERMISSIONS).toContain("terminal.output");
    expect(VALID_PERMISSIONS).toContain("terminal.execute");
    expect(VALID_PERMISSIONS).toContain("theme.current");
    expect(VALID_PERMISSIONS).toContain("notifications");
  });
});

describe("validateRegistryData", () => {
  const validRegistry: RegistryData = {
    version: 1,
    plugins: [
      {
        name: "git-graph",
        displayName: "Git Graph",
        description: "Visualize git history",
        author: "nandomoreira",
        icon: "GitBranch",
        version: "1.2.0",
        downloadUrl:
          "https://github.com/forja-plugins/git-graph/releases/download/v1.2.0/git-graph-1.2.0.tar.gz",
        sha256: "",
        tags: ["git", "visualization"],
        downloads: 1420,
        permissions: ["project.active", "git.status"],
      },
    ],
  };

  it("accepts valid registry data", () => {
    const result = validateRegistryData(validRegistry);
    expect(result.valid).toBe(true);
    expect(result.data).toEqual(validRegistry);
  });

  it("rejects non-object input", () => {
    const result = validateRegistryData(null);
    expect(result.valid).toBe(false);
  });

  it("rejects missing version field", () => {
    const result = validateRegistryData({ ...validRegistry, version: undefined });
    expect(result.valid).toBe(false);
  });

  it("rejects missing plugins array", () => {
    const result = validateRegistryData({ ...validRegistry, plugins: "not-array" });
    expect(result.valid).toBe(false);
  });

  it("rejects plugin with invalid name format", () => {
    const badPlugin = { ...validRegistry.plugins[0], name: "Bad Name" };
    const result = validateRegistryData({ ...validRegistry, plugins: [badPlugin] });
    expect(result.valid).toBe(false);
  });

  it("rejects plugin with invalid version", () => {
    const badPlugin = { ...validRegistry.plugins[0], version: "bad" };
    const result = validateRegistryData({ ...validRegistry, plugins: [badPlugin] });
    expect(result.valid).toBe(false);
  });

  it("rejects plugin with invalid permission", () => {
    const badPlugin = { ...validRegistry.plugins[0], permissions: ["hack.system"] };
    const result = validateRegistryData({ ...validRegistry, plugins: [badPlugin] });
    expect(result.valid).toBe(false);
  });

  it("accepts registry with empty plugins array", () => {
    const result = validateRegistryData({ ...validRegistry, plugins: [] });
    expect(result.valid).toBe(true);
  });

  it("accepts plugin with optional minForjaVersion", () => {
    const plugin = { ...validRegistry.plugins[0], minForjaVersion: "1.5.0" };
    const result = validateRegistryData({ ...validRegistry, plugins: [plugin] });
    expect(result.valid).toBe(true);
  });
});

describe("satisfiesMinVersion", () => {
  it("returns true when current >= required", () => {
    expect(satisfiesMinVersion("1.6.0", "1.5.0")).toBe(true);
    expect(satisfiesMinVersion("1.5.0", "1.5.0")).toBe(true);
    expect(satisfiesMinVersion("2.0.0", "1.9.9")).toBe(true);
  });

  it("returns false when current < required", () => {
    expect(satisfiesMinVersion("1.4.9", "1.5.0")).toBe(false);
  });
});
