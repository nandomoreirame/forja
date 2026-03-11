// frontend/lib/__tests__/settings-theme.test.ts
import { describe, it, expect } from "vitest";
import {
  mergeWithDefaults,
  DEFAULT_SETTINGS,
} from "../settings-types";

describe("settings theme support", () => {
  it("DEFAULT_SETTINGS has theme with catppuccin-mocha", () => {
    expect(DEFAULT_SETTINGS.theme).toBeDefined();
    expect(DEFAULT_SETTINGS.theme.active).toBe("catppuccin-mocha");
    expect(DEFAULT_SETTINGS.theme.custom).toEqual([]);
  });

  it("mergeWithDefaults adds theme when missing", () => {
    const result = mergeWithDefaults({});
    expect(result.theme.active).toBe("catppuccin-mocha");
    expect(result.theme.custom).toEqual([]);
  });

  it("mergeWithDefaults preserves existing theme", () => {
    const result = mergeWithDefaults({
      theme: { active: "dracula", custom: [] },
    });
    expect(result.theme.active).toBe("dracula");
  });

  it("mergeWithDefaults preserves custom themes", () => {
    const customTheme = {
      id: "my-theme",
      name: "My Theme",
      type: "dark" as const,
      colors: {} as Record<string, string>,
      terminal: {} as Record<string, string>,
    };
    const result = mergeWithDefaults({
      theme: { active: "my-theme", custom: [customTheme] },
    });
    expect(result.theme.custom).toHaveLength(1);
    expect(result.theme.custom[0].id).toBe("my-theme");
  });
});
