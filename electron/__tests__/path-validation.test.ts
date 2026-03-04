import { describe, it, expect } from "vitest";
import { assertPathWithinScope } from "../path-validation";

describe("assertPathWithinScope", () => {
  it("allows paths within project scope", () => {
    expect(assertPathWithinScope("/project", "src/main.ts")).toBe("/project/src/main.ts");
    expect(assertPathWithinScope("/project", "deep/nested/file.ts")).toBe("/project/deep/nested/file.ts");
  });

  it("allows the base path itself", () => {
    expect(assertPathWithinScope("/project", ".")).toBe("/project");
    expect(assertPathWithinScope("/project", "")).toBe("/project");
  });

  it("blocks path traversal via ../", () => {
    expect(() => assertPathWithinScope("/project", "../../../etc/passwd")).toThrow("Path traversal");
    expect(() => assertPathWithinScope("/project", "src/../../secret")).toThrow("Path traversal");
  });

  it("blocks absolute paths outside scope", () => {
    expect(() => assertPathWithinScope("/project", "/etc/passwd")).toThrow("Path traversal");
    expect(() => assertPathWithinScope("/project", "/home/user/.ssh/id_rsa")).toThrow("Path traversal");
  });

  it("normalizes and resolves symlink-like paths", () => {
    expect(() => assertPathWithinScope("/project", "src/../../../etc/shadow")).toThrow("Path traversal");
  });

  it("handles paths with trailing slash", () => {
    expect(assertPathWithinScope("/project/", "src/main.ts")).toBe("/project/src/main.ts");
  });
});
