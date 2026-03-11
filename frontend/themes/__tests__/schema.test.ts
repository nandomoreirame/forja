import { describe, it, expect } from "vitest";
import { validateTheme, isValidHexColor } from "../schema";
import type { ThemeDefinition } from "../schema";

describe("isValidHexColor", () => {
  it("accepts valid 6-digit hex colors", () => {
    expect(isValidHexColor("#1e1e2e")).toBe(true);
    expect(isValidHexColor("#FFFFFF")).toBe(true);
  });

  it("rejects invalid colors", () => {
    expect(isValidHexColor("red")).toBe(false);
    expect(isValidHexColor("#xyz")).toBe(false);
    expect(isValidHexColor("")).toBe(false);
  });
});

describe("validateTheme", () => {
  const validTheme: ThemeDefinition = {
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
      accentHover: "#b4befe",
      accentSubtle: "#251e3a",
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
      white: "#a6adc8",
      brightBlack: "#585b70",
      brightRed: "#f38ba8",
      brightGreen: "#a6e3a1",
      brightYellow: "#f9e2af",
      brightBlue: "#89b4fa",
      brightMagenta: "#f5c2e7",
      brightCyan: "#94e2d5",
      brightWhite: "#bac2de",
    },
  };

  it("accepts a valid theme", () => {
    expect(validateTheme(validTheme)).toEqual({ valid: true, errors: [] });
  });

  it("rejects theme with missing id", () => {
    const bad = { ...validTheme, id: "" };
    const result = validateTheme(bad);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("id is required");
  });

  it("rejects theme with invalid color", () => {
    const bad = {
      ...validTheme,
      colors: { ...validTheme.colors, base: "not-a-color" },
    };
    const result = validateTheme(bad);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/colors\.base/);
  });

  it("rejects theme with invalid type", () => {
    const bad = { ...validTheme, type: "neon" as "dark" | "light" };
    const result = validateTheme(bad);
    expect(result.valid).toBe(false);
  });
});
