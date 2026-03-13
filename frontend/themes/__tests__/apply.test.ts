// frontend/themes/__tests__/apply.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  applyTheme,
  buildTerminalTheme,
  buildMonacoTheme,
  hexToRgba,
  applyBackgroundOpacity,
} from "../apply";
import type { ThemeDefinition } from "../schema";
import catppuccinMocha from "../catppuccin-mocha/theme.json";
import dracula from "../dracula/theme.json";

const mocha = catppuccinMocha as ThemeDefinition;
const draculaTheme = dracula as ThemeDefinition;

describe("applyTheme", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    document.documentElement.style.cssText = "";
  });

  it("sets CSS variables on :root", () => {
    applyTheme(mocha);
    const style = document.documentElement.style;
    expect(style.getPropertyValue("--bg-base")).toBe("#1e1e2e");
    expect(style.getPropertyValue("--fg-primary")).toBe("#cdd6f4");
    expect(style.getPropertyValue("--color-brand")).toBe("#cba6f7");
  });

  it("sets dark class for dark themes", () => {
    applyTheme(mocha);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("sets light class for light themes", () => {
    const latte = { ...mocha, type: "light" as const };
    applyTheme(latte);
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("switches from dark to light correctly", () => {
    applyTheme(mocha);
    const latte = { ...mocha, type: "light" as const };
    applyTheme(latte);
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

describe("buildTerminalTheme", () => {
  it("maps theme to xterm ITheme", () => {
    const result = buildTerminalTheme(mocha);
    expect(result.background).toBe("#1e1e2e");
    expect(result.foreground).toBe("#cdd6f4");
    expect(result.red).toBe("#f38ba8");
    expect(result.cursor).toBe("#cdd6f4");
  });

  it("maps dracula correctly", () => {
    const result = buildTerminalTheme(draculaTheme);
    expect(result.background).toBe("#282a36");
    expect(result.red).toBe("#ff5555");
  });

  it("ignores opacity and always returns opaque background", () => {
    const result = buildTerminalTheme(mocha, 0.85);
    // WebGL renderer does not support rgba — always opaque
    expect(result.background).toBe("#1e1e2e");
    expect(result.foreground).toBe("#cdd6f4");
    expect(result.cursor).toBe("#cdd6f4");
    expect(result.red).toBe("#f38ba8");
  });

  it("keeps hex background when opacity is 1.0", () => {
    const result = buildTerminalTheme(mocha, 1.0);
    expect(result.background).toBe("#1e1e2e");
  });

  it("keeps hex background when opacity is undefined", () => {
    const result = buildTerminalTheme(mocha);
    expect(result.background).toBe("#1e1e2e");
  });
});

describe("hexToRgba", () => {
  it("converts hex color to rgba with given alpha", () => {
    expect(hexToRgba("#1e1e2e", 0.85)).toBe("rgba(30, 30, 46, 0.85)");
  });

  it("converts white hex to rgba", () => {
    expect(hexToRgba("#ffffff", 0.5)).toBe("rgba(255, 255, 255, 0.5)");
  });

  it("converts black hex to rgba", () => {
    expect(hexToRgba("#000000", 1.0)).toBe("rgba(0, 0, 0, 1)");
  });
});

describe("applyBackgroundOpacity", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    document.documentElement.style.cssText = "";
  });

  it("applies alpha to background CSS variables after applyTheme", () => {
    applyTheme(mocha);
    applyBackgroundOpacity(0.85);

    const style = document.documentElement.style;
    // --bg-base should be rgba with 0.85 alpha (mocha base is #1e1e2e)
    expect(style.getPropertyValue("--bg-base")).toBe("rgba(30, 30, 46, 0.85)");
    // --bg-elevated (mocha mantle is #181825)
    expect(style.getPropertyValue("--bg-elevated")).toBe(
      "rgba(24, 24, 37, 0.85)",
    );
  });

  it("does not modify foreground/text CSS variables", () => {
    applyTheme(mocha);
    applyBackgroundOpacity(0.85);

    const style = document.documentElement.style;
    // Text colors must remain unchanged (fully opaque hex)
    expect(style.getPropertyValue("--fg-primary")).toBe("#cdd6f4");
    expect(style.getPropertyValue("--color-brand")).toBe("#cba6f7");
  });

  it("restores original hex values when opacity is 1.0", () => {
    applyTheme(mocha);
    applyBackgroundOpacity(0.5);
    applyBackgroundOpacity(1.0);

    const style = document.documentElement.style;
    expect(style.getPropertyValue("--bg-base")).toBe("#1e1e2e");
    expect(style.getPropertyValue("--bg-elevated")).toBe("#181825");
  });

  it("does not apply opacity to surface/border CSS variables", () => {
    applyTheme(mocha);
    applyBackgroundOpacity(0.5);

    const style = document.documentElement.style;
    // Surface variables are used for borders (border-ctp-surface0, etc.)
    // They must remain fully opaque to keep divider contrast
    expect(style.getPropertyValue("--color-ctp-surface0")).toBe("#313244");
    expect(style.getPropertyValue("--color-ctp-surface1")).toBe("#45475a");
    expect(style.getPropertyValue("--color-ctp-surface2")).toBe("#585b70");
    // shadcn vars that map to surface (used for borders/inputs)
    expect(style.getPropertyValue("--color-card")).toBe("#313244");
    expect(style.getPropertyValue("--color-input")).toBe("#313244");
    expect(style.getPropertyValue("--color-secondary")).toBe("#313244");
    expect(style.getPropertyValue("--color-muted")).toBe("#313244");
    expect(style.getPropertyValue("--color-accent")).toBe("#313244");
  });

  it("does not apply opacity to popover/dropdown CSS variables", () => {
    applyTheme(mocha);
    applyBackgroundOpacity(0.5);

    const style = document.documentElement.style;
    // Popover background is used by shadcn dropdowns, tooltips, context menus
    // Must remain opaque for readability
    expect(style.getPropertyValue("--color-popover")).toBe("#181825");
  });

  it("updates correctly when theme changes", () => {
    applyTheme(mocha);
    applyBackgroundOpacity(0.8);

    applyTheme(draculaTheme);
    applyBackgroundOpacity(0.8);

    const style = document.documentElement.style;
    // Dracula base is #282a36
    expect(style.getPropertyValue("--bg-base")).toBe("rgba(40, 42, 54, 0.8)");
  });
});

describe("overlay CSS variables (always opaque)", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    document.documentElement.style.cssText = "";
  });

  it("sets --color-overlay-base to theme base color", () => {
    applyTheme(mocha);
    const style = document.documentElement.style;
    expect(style.getPropertyValue("--color-overlay-base")).toBe("#1e1e2e");
  });

  it("sets --color-overlay-mantle to theme mantle color", () => {
    applyTheme(mocha);
    const style = document.documentElement.style;
    expect(style.getPropertyValue("--color-overlay-mantle")).toBe("#181825");
  });

  it("keeps overlay-base opaque when background opacity is applied", () => {
    applyTheme(mocha);
    applyBackgroundOpacity(0.5);
    const style = document.documentElement.style;
    expect(style.getPropertyValue("--color-overlay-base")).toBe("#1e1e2e");
  });

  it("keeps overlay-mantle opaque when background opacity is applied", () => {
    applyTheme(mocha);
    applyBackgroundOpacity(0.5);
    const style = document.documentElement.style;
    expect(style.getPropertyValue("--color-overlay-mantle")).toBe("#181825");
  });

  it("updates overlay colors when theme changes", () => {
    applyTheme(mocha);
    applyTheme(draculaTheme);
    const style = document.documentElement.style;
    expect(style.getPropertyValue("--color-overlay-base")).toBe("#282a36");
  });
});

describe("buildMonacoTheme", () => {
  it("returns theme with correct base for dark", () => {
    const result = buildMonacoTheme(mocha);
    expect(result.base).toBe("vs-dark");
    expect(result.colors["editor.background"]).toBe("#1e1e2e");
    expect(result.colors["editor.foreground"]).toBe("#cdd6f4");
  });

  it("returns theme with correct base for light", () => {
    const latte = { ...mocha, type: "light" as const };
    const result = buildMonacoTheme(latte);
    expect(result.base).toBe("vs");
  });

  it("includes syntax highlighting rules", () => {
    const result = buildMonacoTheme(mocha);
    expect(result.rules.length).toBeGreaterThan(0);
  });
});
