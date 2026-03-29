import { describe, it, expect } from "vitest";
import { catppuccinMochaTheme, THEME_NAME } from "../monaco-theme";

describe("monaco-theme", () => {
  it("should export theme name constant", () => {
    expect(THEME_NAME).toBe("catppuccin-mocha");
  });

  it("should export a valid Monaco theme definition", () => {
    expect(catppuccinMochaTheme).toBeDefined();
    expect(catppuccinMochaTheme.base).toBe("vs-dark");
    expect(catppuccinMochaTheme.inherit).toBe(true);
    expect(catppuccinMochaTheme.rules).toBeInstanceOf(Array);
    expect(catppuccinMochaTheme.colors).toBeDefined();
  });

  it("should use Catppuccin Mocha background color", () => {
    expect(catppuccinMochaTheme.colors["editor.background"]).toBe("#1e1e2e");
  });

  it("should use Catppuccin Mocha text color", () => {
    expect(catppuccinMochaTheme.colors["editor.foreground"]).toBe("#cdd6f4");
  });

  it("should use Catppuccin Mocha selection color", () => {
    expect(catppuccinMochaTheme.colors["editor.selectionBackground"]).toBe("#585b7066");
  });

  it("should include diff editor colors", () => {
    expect(catppuccinMochaTheme.colors["diffEditor.insertedTextBackground"]).toBeDefined();
    expect(catppuccinMochaTheme.colors["diffEditor.removedTextBackground"]).toBeDefined();
  });

  it("should have token rules for common syntax elements", () => {
    const tokenTypes = catppuccinMochaTheme.rules.map((r) => r.token);
    expect(tokenTypes).toContain("comment");
    expect(tokenTypes).toContain("keyword");
    expect(tokenTypes).toContain("string");
    expect(tokenTypes).toContain("number");
    expect(tokenTypes).toContain("function");
  });
});
