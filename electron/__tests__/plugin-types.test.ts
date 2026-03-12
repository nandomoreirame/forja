import { describe, it, expect } from "vitest";
import { validateManifest, VALID_PERMISSIONS, satisfiesMinVersion } from "../plugins/types.js";

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
