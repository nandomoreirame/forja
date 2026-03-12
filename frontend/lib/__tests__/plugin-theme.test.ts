import { describe, it, expect } from "vitest";
import { buildPluginThemeCSS, buildPluginThemePayload, PLUGIN_CSS_VAR_MAP } from "../plugin-theme";
import type { ThemeDefinition } from "@/themes/schema";

const MOCK_THEME: ThemeDefinition = {
  id: "test-theme",
  name: "Test Theme",
  type: "dark",
  colors: {
    base: "#1e1e2e",
    mantle: "#181825",
    surface: "#313244",
    overlay: "#45475a",
    highlight: "#585b70",
    text: "#cdd6f4",
    subtext: "#a6adc8",
    muted: "#6c7086",
    accent: "#cba6f7",
    accentHover: "#b48bf0",
    accentSubtle: "#9370db",
    success: "#a6e3a1",
    warning: "#f9e2af",
    error: "#f38ba8",
    info: "#89b4fa",
  },
  terminal: {
    black: "#45475a",
    red: "#f38ba8",
    green: "#a6e3a1",
    yellow: "#f9e2af",
    blue: "#89b4fa",
    magenta: "#f5c2e7",
    cyan: "#94e2d5",
    white: "#bac2de",
    brightBlack: "#585b70",
    brightRed: "#f38ba8",
    brightGreen: "#a6e3a1",
    brightYellow: "#f9e2af",
    brightBlue: "#89b4fa",
    brightMagenta: "#f5c2e7",
    brightCyan: "#94e2d5",
    brightWhite: "#a6adc8",
  },
};

describe("PLUGIN_CSS_VAR_MAP", () => {
  it("contains all expected CSS variable mappings", () => {
    const keys = Object.keys(PLUGIN_CSS_VAR_MAP);
    expect(keys).toContain("--forja-bg-base");
    expect(keys).toContain("--forja-bg-mantle");
    expect(keys).toContain("--forja-bg-surface");
    expect(keys).toContain("--forja-bg-overlay");
    expect(keys).toContain("--forja-bg-highlight");
    expect(keys).toContain("--forja-text");
    expect(keys).toContain("--forja-text-sub");
    expect(keys).toContain("--forja-text-muted");
    expect(keys).toContain("--forja-accent");
    expect(keys).toContain("--forja-accent-hover");
    expect(keys).toContain("--forja-accent-subtle");
    expect(keys).toContain("--forja-success");
    expect(keys).toContain("--forja-warning");
    expect(keys).toContain("--forja-error");
    expect(keys).toContain("--forja-info");
    expect(keys).toContain("--forja-red");
    expect(keys).toContain("--forja-green");
    expect(keys).toContain("--forja-yellow");
    expect(keys).toContain("--forja-blue");
    expect(keys).toContain("--forja-magenta");
    expect(keys).toContain("--forja-cyan");
  });

  it("all keys are prefixed with --forja-", () => {
    for (const key of Object.keys(PLUGIN_CSS_VAR_MAP)) {
      expect(key.startsWith("--forja-")).toBe(true);
    }
  });

  it("all values are functions that return strings from a theme", () => {
    for (const getter of Object.values(PLUGIN_CSS_VAR_MAP)) {
      expect(typeof getter).toBe("function");
      const result = getter(MOCK_THEME);
      expect(typeof result).toBe("string");
      expect(result).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe("buildPluginThemeCSS", () => {
  it("returns a :root block with --forja-* CSS variables", () => {
    const css = buildPluginThemeCSS(MOCK_THEME);
    expect(css).toContain(":root{");
    expect(css).toContain("--forja-bg-base:#1e1e2e");
    expect(css).toContain("--forja-text:#cdd6f4");
    expect(css).toContain("--forja-accent:#cba6f7");
    expect(css).toContain("--forja-error:#f38ba8");
    expect(css).toContain("--forja-green:#a6e3a1");
    expect(css.endsWith("}")).toBe(true);
  });

  it("includes all mapped variables in the CSS output", () => {
    const css = buildPluginThemeCSS(MOCK_THEME);
    for (const key of Object.keys(PLUGIN_CSS_VAR_MAP)) {
      expect(css).toContain(key + ":");
    }
  });
});

describe("buildPluginThemePayload", () => {
  it("returns theme metadata", () => {
    const payload = buildPluginThemePayload(MOCK_THEME);
    expect(payload.id).toBe("test-theme");
    expect(payload.name).toBe("Test Theme");
    expect(payload.type).toBe("dark");
  });

  it("includes all theme colors", () => {
    const payload = buildPluginThemePayload(MOCK_THEME);
    expect(payload.colors.base).toBe("#1e1e2e");
    expect(payload.colors.text).toBe("#cdd6f4");
    expect(payload.colors.accent).toBe("#cba6f7");
    expect(payload.colors.success).toBe("#a6e3a1");
  });

  it("includes all terminal colors", () => {
    const payload = buildPluginThemePayload(MOCK_THEME);
    expect(payload.terminal.red).toBe("#f38ba8");
    expect(payload.terminal.green).toBe("#a6e3a1");
    expect(payload.terminal.cyan).toBe("#94e2d5");
  });
});
