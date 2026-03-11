# Theme Customization System - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a theme system with 4 built-in themes (Catppuccin Mocha, Catppuccin Latte, Dracula, Alucard) and custom theme support via CSS variables.

**Architecture:** Each theme is a JSON file in `frontend/themes/`. On theme change, `apply.ts` sets CSS variables on `:root`, updates `color-scheme`, and rebuilds terminal/Monaco themes. Settings stored in `~/.config/forja/settings.json`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Zustand, xterm.js, Monaco Editor, Vitest + RTL

---

### Task 1: Theme Schema and Types

**Files:**
- Create: `frontend/themes/schema.ts`
- Test: `frontend/themes/__tests__/schema.test.ts`

**Step 1: Write the failing test**

```typescript
// frontend/themes/__tests__/schema.test.ts
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
```

**Step 2: Run test to verify it fails**

Run: `pnpm test frontend/themes/__tests__/schema.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

```typescript
// frontend/themes/schema.ts
export interface ThemeColors {
  base: string;
  mantle: string;
  surface: string;
  overlay: string;
  highlight: string;
  text: string;
  subtext: string;
  muted: string;
  accent: string;
  accentHover: string;
  accentSubtle: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface TerminalColors {
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  type: "dark" | "light";
  colors: ThemeColors;
  terminal: TerminalColors;
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_RE.test(value);
}

const THEME_COLORS_KEYS: (keyof ThemeColors)[] = [
  "base", "mantle", "surface", "overlay", "highlight",
  "text", "subtext", "muted",
  "accent", "accentHover", "accentSubtle",
  "success", "warning", "error", "info",
];

const TERMINAL_COLORS_KEYS: (keyof TerminalColors)[] = [
  "black", "red", "green", "yellow", "blue", "magenta", "cyan", "white",
  "brightBlack", "brightRed", "brightGreen", "brightYellow",
  "brightBlue", "brightMagenta", "brightCyan", "brightWhite",
];

export function validateTheme(
  theme: ThemeDefinition,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!theme.id) errors.push("id is required");
  if (!theme.name) errors.push("name is required");
  if (theme.type !== "dark" && theme.type !== "light") {
    errors.push("type must be 'dark' or 'light'");
  }

  if (!theme.colors) {
    errors.push("colors is required");
  } else {
    for (const key of THEME_COLORS_KEYS) {
      if (!theme.colors[key] || !isValidHexColor(theme.colors[key])) {
        errors.push(`colors.${key} must be a valid hex color`);
      }
    }
  }

  if (!theme.terminal) {
    errors.push("terminal is required");
  } else {
    for (const key of TERMINAL_COLORS_KEYS) {
      if (!theme.terminal[key] || !isValidHexColor(theme.terminal[key])) {
        errors.push(`terminal.${key} must be a valid hex color`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test frontend/themes/__tests__/schema.test.ts`
Expected: PASS

**Step 5: Commit**

```
feat: add theme schema types and validation
```

---

### Task 2: Built-in Theme JSON Files

**Files:**
- Create: `frontend/themes/catppuccin-mocha/theme.json`
- Create: `frontend/themes/catppuccin-latte/theme.json`
- Create: `frontend/themes/dracula/theme.json`
- Create: `frontend/themes/alucard/theme.json`
- Test: `frontend/themes/__tests__/builtin-themes.test.ts`

**Step 1: Write the failing test**

```typescript
// frontend/themes/__tests__/builtin-themes.test.ts
import { describe, it, expect } from "vitest";
import { validateTheme } from "../schema";
import catppuccinMocha from "../catppuccin-mocha/theme.json";
import catppuccinLatte from "../catppuccin-latte/theme.json";
import dracula from "../dracula/theme.json";
import alucard from "../alucard/theme.json";

const themes = [
  { name: "catppuccin-mocha", theme: catppuccinMocha },
  { name: "catppuccin-latte", theme: catppuccinLatte },
  { name: "dracula", theme: dracula },
  { name: "alucard", theme: alucard },
];

describe("built-in themes", () => {
  for (const { name, theme } of themes) {
    it(`${name} passes validation`, () => {
      const result = validateTheme(theme);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it(`${name} has correct id`, () => {
      expect(theme.id).toBe(name);
    });
  }

  it("catppuccin-mocha is dark", () => {
    expect(catppuccinMocha.type).toBe("dark");
  });

  it("catppuccin-latte is light", () => {
    expect(catppuccinLatte.type).toBe("light");
  });

  it("dracula is dark", () => {
    expect(dracula.type).toBe("dark");
  });

  it("alucard is light", () => {
    expect(alucard.type).toBe("light");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test frontend/themes/__tests__/builtin-themes.test.ts`
Expected: FAIL - JSON files not found

**Step 3: Create the 4 theme JSON files**

`frontend/themes/catppuccin-mocha/theme.json`:
```json
{
  "id": "catppuccin-mocha",
  "name": "Catppuccin Mocha",
  "type": "dark",
  "colors": {
    "base": "#1e1e2e",
    "mantle": "#181825",
    "surface": "#313244",
    "overlay": "#45475a",
    "highlight": "#585b70",
    "text": "#cdd6f4",
    "subtext": "#a6adc8",
    "muted": "#6c7086",
    "accent": "#cba6f7",
    "accentHover": "#b4befe",
    "accentSubtle": "#251e3a",
    "success": "#a6e3a1",
    "warning": "#f9e2af",
    "error": "#f38ba8",
    "info": "#89b4fa"
  },
  "terminal": {
    "black": "#45475a",
    "red": "#f38ba8",
    "green": "#a6e3a1",
    "yellow": "#f9e2af",
    "blue": "#89b4fa",
    "magenta": "#f5c2e7",
    "cyan": "#94e2d5",
    "white": "#a6adc8",
    "brightBlack": "#585b70",
    "brightRed": "#f38ba8",
    "brightGreen": "#a6e3a1",
    "brightYellow": "#f9e2af",
    "brightBlue": "#89b4fa",
    "brightMagenta": "#f5c2e7",
    "brightCyan": "#94e2d5",
    "brightWhite": "#bac2de"
  }
}
```

`frontend/themes/catppuccin-latte/theme.json`:
```json
{
  "id": "catppuccin-latte",
  "name": "Catppuccin Latte",
  "type": "light",
  "colors": {
    "base": "#eff1f5",
    "mantle": "#e6e9ef",
    "surface": "#ccd0da",
    "overlay": "#bcc0cc",
    "highlight": "#acb0be",
    "text": "#4c4f69",
    "subtext": "#6c6f85",
    "muted": "#9ca0b0",
    "accent": "#8839ef",
    "accentHover": "#7287fd",
    "accentSubtle": "#e8dff5",
    "success": "#40a02b",
    "warning": "#df8e1d",
    "error": "#d20f39",
    "info": "#1e66f5"
  },
  "terminal": {
    "black": "#bcc0cc",
    "red": "#d20f39",
    "green": "#40a02b",
    "yellow": "#df8e1d",
    "blue": "#1e66f5",
    "magenta": "#ea76cb",
    "cyan": "#179299",
    "white": "#6c6f85",
    "brightBlack": "#acb0be",
    "brightRed": "#d20f39",
    "brightGreen": "#40a02b",
    "brightYellow": "#df8e1d",
    "brightBlue": "#1e66f5",
    "brightMagenta": "#ea76cb",
    "brightCyan": "#179299",
    "brightWhite": "#4c4f69"
  }
}
```

`frontend/themes/dracula/theme.json`:
```json
{
  "id": "dracula",
  "name": "Dracula",
  "type": "dark",
  "colors": {
    "base": "#282a36",
    "mantle": "#21222c",
    "surface": "#44475a",
    "overlay": "#545760",
    "highlight": "#6272a4",
    "text": "#f8f8f2",
    "subtext": "#d4d4d4",
    "muted": "#6272a4",
    "accent": "#bd93f9",
    "accentHover": "#caa9fa",
    "accentSubtle": "#2d2540",
    "success": "#50fa7b",
    "warning": "#f1fa8c",
    "error": "#ff5555",
    "info": "#8be9fd"
  },
  "terminal": {
    "black": "#21222c",
    "red": "#ff5555",
    "green": "#50fa7b",
    "yellow": "#f1fa8c",
    "blue": "#bd93f9",
    "magenta": "#ff79c6",
    "cyan": "#8be9fd",
    "white": "#f8f8f2",
    "brightBlack": "#6272a4",
    "brightRed": "#ff6e6e",
    "brightGreen": "#69ff94",
    "brightYellow": "#ffffa5",
    "brightBlue": "#d6acff",
    "brightMagenta": "#ff92df",
    "brightCyan": "#a4ffff",
    "brightWhite": "#ffffff"
  }
}
```

`frontend/themes/alucard/theme.json`:
```json
{
  "id": "alucard",
  "name": "Alucard",
  "type": "light",
  "colors": {
    "base": "#f8f8f2",
    "mantle": "#ededed",
    "surface": "#d4d4d4",
    "overlay": "#c4c4c4",
    "highlight": "#b0b0b0",
    "text": "#282a36",
    "subtext": "#44475a",
    "muted": "#6272a4",
    "accent": "#7c3aed",
    "accentHover": "#6d28d9",
    "accentSubtle": "#ede9fe",
    "success": "#2e8b57",
    "warning": "#b8860b",
    "error": "#dc2626",
    "info": "#0284c7"
  },
  "terminal": {
    "black": "#d4d4d4",
    "red": "#dc2626",
    "green": "#2e8b57",
    "yellow": "#b8860b",
    "blue": "#7c3aed",
    "magenta": "#db2777",
    "cyan": "#0284c7",
    "white": "#44475a",
    "brightBlack": "#b0b0b0",
    "brightRed": "#ef4444",
    "brightGreen": "#16a34a",
    "brightYellow": "#ca8a04",
    "brightBlue": "#8b5cf6",
    "brightMagenta": "#ec4899",
    "brightCyan": "#0ea5e9",
    "brightWhite": "#282a36"
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test frontend/themes/__tests__/builtin-themes.test.ts`
Expected: PASS

**Step 5: Commit**

```
feat: add 4 built-in theme JSON definitions
```

---

### Task 3: Theme Registry

**Files:**
- Create: `frontend/themes/index.ts`
- Test: `frontend/themes/__tests__/index.test.ts`

**Step 1: Write the failing test**

```typescript
// frontend/themes/__tests__/index.test.ts
import { describe, it, expect } from "vitest";
import {
  getBuiltinThemes,
  getThemeById,
  resolveTheme,
  DEFAULT_THEME_ID,
} from "../index";

describe("theme registry", () => {
  it("exports 4 built-in themes", () => {
    const themes = getBuiltinThemes();
    expect(themes).toHaveLength(4);
  });

  it("DEFAULT_THEME_ID is catppuccin-mocha", () => {
    expect(DEFAULT_THEME_ID).toBe("catppuccin-mocha");
  });

  it("getThemeById returns correct theme", () => {
    const theme = getThemeById("dracula");
    expect(theme).toBeDefined();
    expect(theme!.name).toBe("Dracula");
  });

  it("getThemeById returns undefined for unknown id", () => {
    expect(getThemeById("nonexistent")).toBeUndefined();
  });

  it("resolveTheme returns theme from built-ins", () => {
    const theme = resolveTheme("dracula", []);
    expect(theme.id).toBe("dracula");
  });

  it("resolveTheme returns custom theme when found", () => {
    const custom = {
      id: "my-theme",
      name: "My Theme",
      type: "dark" as const,
      colors: getThemeById("dracula")!.colors,
      terminal: getThemeById("dracula")!.terminal,
    };
    const theme = resolveTheme("my-theme", [custom]);
    expect(theme.id).toBe("my-theme");
  });

  it("resolveTheme falls back to default for unknown id", () => {
    const theme = resolveTheme("nonexistent", []);
    expect(theme.id).toBe(DEFAULT_THEME_ID);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test frontend/themes/__tests__/index.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

```typescript
// frontend/themes/index.ts
import type { ThemeDefinition } from "./schema";
import catppuccinMocha from "./catppuccin-mocha/theme.json";
import catppuccinLatte from "./catppuccin-latte/theme.json";
import dracula from "./dracula/theme.json";
import alucard from "./alucard/theme.json";

export type { ThemeDefinition, ThemeColors, TerminalColors } from "./schema";
export { validateTheme, isValidHexColor } from "./schema";

export const DEFAULT_THEME_ID = "catppuccin-mocha";

const BUILTIN_THEMES: ThemeDefinition[] = [
  catppuccinMocha as ThemeDefinition,
  catppuccinLatte as ThemeDefinition,
  dracula as ThemeDefinition,
  alucard as ThemeDefinition,
];

export function getBuiltinThemes(): ThemeDefinition[] {
  return BUILTIN_THEMES;
}

export function getThemeById(id: string): ThemeDefinition | undefined {
  return BUILTIN_THEMES.find((t) => t.id === id);
}

export function resolveTheme(
  id: string,
  customThemes: ThemeDefinition[],
): ThemeDefinition {
  const custom = customThemes.find((t) => t.id === id);
  if (custom) return custom;

  const builtin = getThemeById(id);
  if (builtin) return builtin;

  return getThemeById(DEFAULT_THEME_ID)!;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test frontend/themes/__tests__/index.test.ts`
Expected: PASS

**Step 5: Commit**

```
feat: add theme registry with resolve logic
```

---

### Task 4: Theme Applicator (apply.ts)

**Files:**
- Create: `frontend/themes/apply.ts`
- Test: `frontend/themes/__tests__/apply.test.ts`

**Step 1: Write the failing test**

```typescript
// frontend/themes/__tests__/apply.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { applyTheme, buildTerminalTheme, buildMonacoTheme } from "../apply";
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
```

**Step 2: Run test to verify it fails**

Run: `pnpm test frontend/themes/__tests__/apply.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

```typescript
// frontend/themes/apply.ts
import type { ThemeDefinition } from "./schema";
import type { ITheme } from "@xterm/xterm";

interface MonacoThemeData {
  base: "vs" | "vs-dark" | "hc-black";
  inherit: boolean;
  rules: Array<{ token: string; foreground?: string; fontStyle?: string }>;
  colors: Record<string, string>;
}

const CSS_VAR_MAP: Record<string, (t: ThemeDefinition) => string> = {
  "--bg-base": (t) => t.colors.base,
  "--bg-elevated": (t) => t.colors.mantle,
  "--bg-card": (t) => t.colors.surface,
  "--bg-hover": (t) => t.colors.overlay,
  "--bg-active": (t) => t.colors.highlight,
  "--fg-primary": (t) => t.colors.text,
  "--fg-secondary": (t) => t.colors.subtext,
  "--fg-muted": (t) => t.colors.muted,
  "--color-brand": (t) => t.colors.accent,
  "--color-brand-hover": (t) => t.colors.accentHover,
  "--color-brand-subtle": (t) => t.colors.accentSubtle,
  "--color-success": (t) => t.colors.success,
  "--color-warning": (t) => t.colors.warning,
  "--color-error": (t) => t.colors.error,
  "--color-info": (t) => t.colors.info,
  "--primary-foreground": (t) => t.colors.base,
  "--destructive-foreground": (t) => t.colors.base,
};

export function applyTheme(theme: ThemeDefinition): void {
  const root = document.documentElement;

  for (const [varName, getter] of Object.entries(CSS_VAR_MAP)) {
    root.style.setProperty(varName, getter(theme));
  }

  root.classList.remove("dark", "light");
  root.classList.add(theme.type);
  root.style.colorScheme = theme.type;
}

export function buildTerminalTheme(theme: ThemeDefinition): ITheme {
  return {
    background: theme.colors.base,
    foreground: theme.colors.text,
    cursor: theme.colors.text,
    cursorAccent: theme.colors.base,
    selectionBackground: theme.colors.surface,
    selectionForeground: theme.colors.text,
    ...theme.terminal,
  };
}

function stripHash(hex: string): string {
  return hex.replace("#", "");
}

export function buildMonacoTheme(theme: ThemeDefinition): MonacoThemeData {
  const c = theme.colors;
  const t = theme.terminal;

  return {
    base: theme.type === "dark" ? "vs-dark" : "vs",
    inherit: true,
    rules: [
      { token: "", foreground: stripHash(c.text) },
      { token: "comment", foreground: stripHash(c.muted), fontStyle: "italic" },
      { token: "keyword", foreground: stripHash(c.accent) },
      { token: "string", foreground: stripHash(t.green) },
      { token: "number", foreground: stripHash(t.yellow) },
      { token: "regexp", foreground: stripHash(t.magenta) },
      { token: "type", foreground: stripHash(t.yellow) },
      { token: "class", foreground: stripHash(t.yellow) },
      { token: "function", foreground: stripHash(t.blue) },
      { token: "variable", foreground: stripHash(c.text) },
      { token: "variable.predefined", foreground: stripHash(t.red) },
      { token: "constant", foreground: stripHash(t.yellow) },
      { token: "operator", foreground: stripHash(t.cyan) },
      { token: "tag", foreground: stripHash(c.accent) },
      { token: "attribute.name", foreground: stripHash(t.yellow) },
      { token: "attribute.value", foreground: stripHash(t.green) },
      { token: "delimiter", foreground: stripHash(c.subtext) },
      { token: "delimiter.bracket", foreground: stripHash(c.subtext) },
      { token: "meta", foreground: stripHash(t.magenta) },
    ],
    colors: {
      "editor.background": c.base,
      "editor.foreground": c.text,
      "editor.lineHighlightBackground": c.surface,
      "editor.selectionBackground": c.highlight + "66",
      "editor.inactiveSelectionBackground": c.highlight + "33",
      "editorCursor.foreground": c.text,
      "editorWhitespace.foreground": c.highlight + "66",
      "editorIndentGuide.background": c.surface + "80",
      "editorIndentGuide.activeBackground": c.highlight,
      "editorLineNumber.foreground": c.muted,
      "editorLineNumber.activeForeground": c.text,
      "editorBracketMatch.background": c.highlight + "33",
      "editorBracketMatch.border": c.highlight,
      "editorGutter.background": c.base,
      "editorOverviewRuler.border": c.surface,
      "editorWidget.background": c.mantle,
      "editorWidget.border": c.surface,
      "editorSuggestWidget.background": c.mantle,
      "editorSuggestWidget.border": c.surface,
      "editorSuggestWidget.selectedBackground": c.surface,
      "editorHoverWidget.background": c.mantle,
      "editorHoverWidget.border": c.surface,
      "input.background": c.surface,
      "input.border": c.overlay,
      "input.foreground": c.text,
      "scrollbar.shadow": c.mantle,
      "scrollbarSlider.background": c.highlight + "66",
      "scrollbarSlider.hoverBackground": c.highlight,
      "scrollbarSlider.activeBackground": c.muted,
      "minimap.background": c.base,
      "minimapSlider.background": c.highlight + "33",
      "minimapSlider.hoverBackground": c.highlight + "66",
      "diffEditor.insertedTextBackground": c.success + "20",
      "diffEditor.removedTextBackground": c.error + "20",
      "diffEditor.insertedLineBackground": c.success + "10",
      "diffEditor.removedLineBackground": c.error + "10",
    },
  };
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test frontend/themes/__tests__/apply.test.ts`
Expected: PASS

**Step 5: Commit**

```
feat: add theme applicator with terminal and Monaco builders
```

---

### Task 5: Update Settings Types and Backend

**Files:**
- Modify: `frontend/lib/settings-types.ts`
- Modify: `electron/user-settings.ts`
- Test: `frontend/lib/__tests__/settings-types.test.ts` (existing tests still pass)

**Step 1: Write the failing test**

Add test for theme settings in the existing settings test file (or create if not present):

```typescript
// frontend/lib/__tests__/settings-theme.test.ts
import { describe, it, expect } from "vitest";
import {
  mergeWithDefaults,
  validateSettings,
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
      colors: {} as any,
      terminal: {} as any,
    };
    const result = mergeWithDefaults({
      theme: { active: "my-theme", custom: [customTheme] },
    });
    expect(result.theme.custom).toHaveLength(1);
    expect(result.theme.custom[0].id).toBe("my-theme");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test frontend/lib/__tests__/settings-theme.test.ts`
Expected: FAIL - `theme` does not exist on UserSettings

**Step 3: Update settings-types.ts**

Add to `frontend/lib/settings-types.ts`:

```typescript
// Add import at top (type-only, no runtime dep on frontend/themes)
export interface ThemeSettings {
  active: string;
  custom: Array<{
    id: string;
    name: string;
    type: "dark" | "light";
    colors: Record<string, string>;
    terminal: Record<string, string>;
  }>;
}

// Add to UserSettings interface
export interface UserSettings {
  app: FontSettings;
  editor: FontSettings;
  terminal: FontSettings;
  window: { zoomLevel: number; opacity: number };
  sessions: Record<string, { args?: string[]; env?: Record<string, string> }>;
  theme: ThemeSettings;
}

// Update DEFAULT_SETTINGS
export const DEFAULT_SETTINGS: UserSettings = {
  // ... existing fields unchanged ...
  theme: {
    active: "catppuccin-mocha",
    custom: [],
  },
};

// Update mergeWithDefaults - add theme merge
// Inside the return statement, add:
//   theme: {
//     ...DEFAULT_SETTINGS.theme,
//     ...(input.theme ?? {}),
//     custom: input.theme?.custom ?? DEFAULT_SETTINGS.theme.custom,
//   },
```

Then mirror the same `ThemeSettings` interface and `theme` field in `electron/user-settings.ts` (the inline types must stay in sync, as the comment there says).

**Step 4: Run tests to verify they pass**

Run: `pnpm test frontend/lib/__tests__/settings-theme.test.ts`
Expected: PASS

Run: `pnpm test` (full suite to ensure no regressions)
Expected: All existing tests PASS

**Step 5: Commit**

```
feat: add theme settings to UserSettings schema
```

---

### Task 6: Theme Store (Zustand)

**Files:**
- Create: `frontend/stores/theme.ts`
- Test: `frontend/stores/__tests__/theme.test.ts`

**Step 1: Write the failing test**

```typescript
// frontend/stores/__tests__/theme.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useThemeStore } from "../theme";
import { DEFAULT_THEME_ID } from "@/themes";

vi.mock("@/themes/apply", () => ({
  applyTheme: vi.fn(),
  buildTerminalTheme: vi.fn(() => ({})),
  buildMonacoTheme: vi.fn(() => ({ base: "vs-dark", inherit: true, rules: [], colors: {} })),
}));

describe("useThemeStore", () => {
  beforeEach(() => {
    useThemeStore.setState({
      activeThemeId: DEFAULT_THEME_ID,
      customThemes: [],
    });
  });

  it("has default theme id", () => {
    expect(useThemeStore.getState().activeThemeId).toBe("catppuccin-mocha");
  });

  it("setActiveTheme changes the theme id", () => {
    useThemeStore.getState().setActiveTheme("dracula");
    expect(useThemeStore.getState().activeThemeId).toBe("dracula");
  });

  it("getActiveTheme returns resolved theme", () => {
    const theme = useThemeStore.getState().getActiveTheme();
    expect(theme.id).toBe("catppuccin-mocha");
  });

  it("getActiveTheme falls back to default for invalid id", () => {
    useThemeStore.getState().setActiveTheme("nonexistent");
    const theme = useThemeStore.getState().getActiveTheme();
    expect(theme.id).toBe("catppuccin-mocha");
  });

  it("getAllThemes includes built-ins and customs", () => {
    const all = useThemeStore.getState().getAllThemes();
    expect(all.length).toBeGreaterThanOrEqual(4);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test frontend/stores/__tests__/theme.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

```typescript
// frontend/stores/theme.ts
import { create } from "zustand";
import {
  getBuiltinThemes,
  resolveTheme,
  DEFAULT_THEME_ID,
  type ThemeDefinition,
} from "@/themes";
import { applyTheme } from "@/themes/apply";

interface ThemeState {
  activeThemeId: string;
  customThemes: ThemeDefinition[];
  setActiveTheme: (id: string) => void;
  setCustomThemes: (themes: ThemeDefinition[]) => void;
  getActiveTheme: () => ThemeDefinition;
  getAllThemes: () => ThemeDefinition[];
  applyCurrentTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  activeThemeId: DEFAULT_THEME_ID,
  customThemes: [],

  setActiveTheme: (id: string) => {
    set({ activeThemeId: id });
    const theme = resolveTheme(id, get().customThemes);
    applyTheme(theme);
  },

  setCustomThemes: (themes: ThemeDefinition[]) => {
    set({ customThemes: themes });
  },

  getActiveTheme: () => {
    const { activeThemeId, customThemes } = get();
    return resolveTheme(activeThemeId, customThemes);
  },

  getAllThemes: () => {
    return [...getBuiltinThemes(), ...get().customThemes];
  },

  applyCurrentTheme: () => {
    const theme = get().getActiveTheme();
    applyTheme(theme);
  },
}));
```

**Step 4: Run test to verify it passes**

Run: `pnpm test frontend/stores/__tests__/theme.test.ts`
Expected: PASS

**Step 5: Commit**

```
feat: add Zustand theme store
```

---

### Task 7: Integrate Theme into App.tsx

**Files:**
- Modify: `frontend/App.tsx`
- Modify: `frontend/components/terminal-session.tsx`

**Step 1: Write the failing test (integration)**

```typescript
// frontend/themes/__tests__/integration.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useThemeStore } from "@/stores/theme";
import { applyTheme } from "../apply";
import catppuccinMocha from "../catppuccin-mocha/theme.json";
import type { ThemeDefinition } from "../schema";

vi.mock("../apply", () => ({
  applyTheme: vi.fn(),
  buildTerminalTheme: vi.fn(() => ({})),
  buildMonacoTheme: vi.fn(() => ({ base: "vs-dark", inherit: true, rules: [], colors: {} })),
}));

describe("theme integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useThemeStore.setState({
      activeThemeId: "catppuccin-mocha",
      customThemes: [],
    });
  });

  it("setActiveTheme calls applyTheme", () => {
    useThemeStore.getState().setActiveTheme("dracula");
    expect(applyTheme).toHaveBeenCalledWith(
      expect.objectContaining({ id: "dracula" }),
    );
  });

  it("applyCurrentTheme applies the current theme", () => {
    useThemeStore.getState().applyCurrentTheme();
    expect(applyTheme).toHaveBeenCalledWith(
      expect.objectContaining({ id: "catppuccin-mocha" }),
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test frontend/themes/__tests__/integration.test.ts`
Expected: PASS (test logic works with mocks)

**Step 3: Update App.tsx**

In `frontend/App.tsx`, add theme initialization in the existing settings effect:

```typescript
// Add import
import { useThemeStore } from "./stores/theme";

// Inside the useEffect that handles settings (around line 460):
// After existing font logic, add:
const themeStore = useThemeStore.getState();
if (settings.theme?.active && settings.theme.active !== themeStore.activeThemeId) {
  themeStore.setActiveTheme(settings.theme.active);
}
if (settings.theme?.custom) {
  themeStore.setCustomThemes(settings.theme.custom as ThemeDefinition[]);
}

// Add a separate useEffect for initial theme application:
useEffect(() => {
  useThemeStore.getState().applyCurrentTheme();
}, []);
```

**Step 4: Update terminal-session.tsx**

In `frontend/components/terminal-session.tsx`, make terminal theme reactive:

```typescript
// Replace static import:
// import { TERMINAL_OPTIONS } from "@/lib/terminal-theme";

// With:
import { TERMINAL_OPTIONS } from "@/lib/terminal-theme";
import { useThemeStore } from "@/stores/theme";
import { buildTerminalTheme } from "@/themes/apply";

// In the terminal creation useEffect, use the current theme:
const currentTheme = useThemeStore.getState().getActiveTheme();
const terminalTheme = buildTerminalTheme(currentTheme);
const terminal = new Terminal({
  ...TERMINAL_OPTIONS,
  theme: terminalTheme,
});

// Add a subscription to theme changes (inside the same useEffect, after terminal creation):
const unsubTheme = useThemeStore.subscribe((state) => {
  const theme = state.getActiveTheme();
  terminal.options.theme = buildTerminalTheme(theme);
});

// Add to cleanup:
// unsubTheme();
```

**Step 5: Run full test suite**

Run: `pnpm test`
Expected: All tests PASS

**Step 6: Commit**

```
feat: integrate theme store into App and terminal
```

---

### Task 8: Command Palette Theme Switcher

**Files:**
- Modify: `frontend/stores/command-palette.ts`
- Modify: `frontend/components/command-palette.tsx`
- Test: `frontend/components/__tests__/command-palette-theme.test.ts`

**Step 1: Write the failing test**

```typescript
// frontend/components/__tests__/command-palette-theme.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette } from "../command-palette";
import { useCommandPaletteStore } from "@/stores/command-palette";
import { useThemeStore } from "@/stores/theme";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
}));

vi.mock("@/themes/apply", () => ({
  applyTheme: vi.fn(),
  buildTerminalTheme: vi.fn(() => ({})),
  buildMonacoTheme: vi.fn(() => ({ base: "vs-dark", inherit: true, rules: [], colors: {} })),
}));

vi.mock("@/hooks/use-installed-clis", () => ({
  useInstalledClis: () => ({ installedClis: [], loading: false }),
}));

describe("command palette themes mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useThemeStore.setState({
      activeThemeId: "catppuccin-mocha",
      customThemes: [],
    });
  });

  it("shows theme options when in themes mode", () => {
    useCommandPaletteStore.setState({ isOpen: true, mode: "themes" });
    render(<CommandPalette />);
    expect(screen.getByText("Catppuccin Mocha")).toBeInTheDocument();
    expect(screen.getByText("Dracula")).toBeInTheDocument();
    expect(screen.getByText("Catppuccin Latte")).toBeInTheDocument();
    expect(screen.getByText("Alucard")).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test frontend/components/__tests__/command-palette-theme.test.ts`
Expected: FAIL - "themes" mode not recognized

**Step 3: Update command-palette.ts store**

In `frontend/stores/command-palette.ts`, add "themes" to the mode type:

```typescript
export type CommandPaletteMode = "files" | "commands" | "sessions" | "themes";
```

**Step 4: Update command-palette.tsx**

Add theme mode handling and a "Change Theme" command item:

```typescript
// Add imports
import { Palette } from "lucide-react";
import { useThemeStore } from "@/stores/theme";

// Add handler
const handleThemeSelect = (themeId: string) => {
  useThemeStore.getState().setActiveTheme(themeId);
  // Also persist to settings
  const settingsStore = useUserSettingsStore.getState();
  const content = JSON.stringify(
    { ...settingsStore.settings, theme: { ...settingsStore.settings.theme, active: themeId } },
    null,
    2,
  );
  settingsStore.setEditorContent(content);
  settingsStore.saveEditorContent();
  close();
};

// Add "Change Theme" command in the "Settings & Help" group
<CommandItem
  value="Change Theme"
  onSelect={() => open("themes")}
>
  <Palette className="h-4 w-4" strokeWidth={1.5} />
  Change Theme
</CommandItem>

// Add themes mode rendering
{mode === "themes" && (
  <CommandGroup heading="Theme">
    {useThemeStore.getState().getAllThemes().map((theme) => (
      <CommandItem
        key={theme.id}
        value={theme.name}
        onSelect={() => handleThemeSelect(theme.id)}
      >
        <span
          className="h-3 w-3 rounded-full border border-current"
          style={{ backgroundColor: theme.colors.accent }}
        />
        {theme.name}
        {theme.type === "light" && (
          <span className="ml-auto text-xs text-ctp-overlay1">Light</span>
        )}
      </CommandItem>
    ))}
  </CommandGroup>
)}
```

In the placeholder, handle "themes" mode:

```typescript
mode === "themes"
  ? "Select theme..."
  : "Type a command..."
```

**Step 5: Run test to verify it passes**

Run: `pnpm test frontend/components/__tests__/command-palette-theme.test.ts`
Expected: PASS

**Step 6: Commit**

```
feat: add theme switcher to command palette
```

---

### Task 9: Settings Dialog Theme Section

**Files:**
- Modify: `frontend/components/settings-dialog.tsx`
- Test: `frontend/components/__tests__/settings-dialog-theme.test.ts`

**Step 1: Write the failing test**

```typescript
// frontend/components/__tests__/settings-dialog-theme.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsDialog } from "../settings-dialog";
import { useThemeStore } from "@/stores/theme";
import { DEFAULT_SETTINGS } from "@/lib/settings-types";
import { useUserSettingsStore } from "@/stores/user-settings";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
  getVersion: vi.fn().mockResolvedValue("1.0.0"),
}));

vi.mock("@/themes/apply", () => ({
  applyTheme: vi.fn(),
  buildTerminalTheme: vi.fn(() => ({})),
  buildMonacoTheme: vi.fn(() => ({ base: "vs-dark", inherit: true, rules: [], colors: {} })),
}));

describe("settings dialog theme section", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUserSettingsStore.setState({
      settings: DEFAULT_SETTINGS,
      loaded: true,
      editorOpen: false,
      editorContent: "",
      editorDirty: false,
      editorError: null,
    });
    useThemeStore.setState({
      activeThemeId: "catppuccin-mocha",
      customThemes: [],
    });
  });

  it("shows theme setting in appearance section", () => {
    render(<SettingsDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText(/Theme/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test frontend/components/__tests__/settings-dialog-theme.test.ts`
Expected: FAIL - no Theme text found

**Step 3: Add theme selector to AppearanceSection**

In `frontend/components/settings-dialog.tsx`, add a theme dropdown at the top of `AppearanceSection`:

```typescript
// Add imports
import { useThemeStore } from "@/stores/theme";

// Inside AppearanceSection, before the font settings, add:
const { activeThemeId, getAllThemes, setActiveTheme } = useThemeStore();
const allThemes = getAllThemes();

// Add SettingItem for theme
<SettingItem
  category="Appearance"
  label="Theme"
  description="Color theme for the entire application."
>
  <select
    value={activeThemeId}
    onChange={(e) => {
      setActiveTheme(e.target.value);
      onSave({
        ...localSettings,
        theme: { ...localSettings.theme, active: e.target.value },
      });
    }}
    aria-label="Theme"
    className={cn(inputClass, "w-56")}
  >
    {allThemes.map((theme) => (
      <option key={theme.id} value={theme.id}>
        {theme.name} ({theme.type})
      </option>
    ))}
  </select>
</SettingItem>
```

**Step 4: Run test to verify it passes**

Run: `pnpm test frontend/components/__tests__/settings-dialog-theme.test.ts`
Expected: PASS

**Step 5: Commit**

```
feat: add theme selector to settings dialog
```

---

### Task 10: Update globals.css for Theme Variable Consumption

**Files:**
- Modify: `frontend/styles/globals.css`

**Step 1: No test needed** (CSS-only changes, visual verification)

**Step 2: Update globals.css**

The `@theme` block keeps its current hardcoded values as Tailwind compile-time defaults. The `:root` block already references the semantic variables (`--bg-base`, `--fg-primary`, etc.) which `apply.ts` overrides at runtime.

Key changes needed:
- In the `@theme` block: add `--color-ctp-*` variables that reference the semantic ones (so Tailwind utilities like `bg-ctp-base` adapt to the active theme)
- Update `@theme` to define colors via CSS variable references where Tailwind v4 supports it

Actually, since Tailwind v4 `@theme` values are static (computed at build time), the dynamic approach must work through the `:root` variables. The existing code already uses `var(--bg-base)`, `var(--fg-primary)`, `var(--color-brand)` extensively. The `ctp-*` classes that reference hardcoded hex values in `@theme` need to be updated:

Replace the hardcoded `--color-ctp-*` values in `@theme` with references to the semantic variables in `:root`, OR update component code to use semantic classes (`bg-base`, `text-primary`) instead of `ctp-*` classes.

The simpler approach: keep `@theme` as-is (provides fallback) and have `apply.ts` also set the `--color-ctp-*` variables. Add these extra mappings to `apply.ts`:

```typescript
// Add to CSS_VAR_MAP in apply.ts
"--color-ctp-base": (t) => t.colors.base,
"--color-ctp-mantle": (t) => t.colors.mantle,
"--color-ctp-surface0": (t) => t.colors.surface,
"--color-ctp-surface1": (t) => t.colors.overlay,
"--color-ctp-surface2": (t) => t.colors.highlight,
"--color-ctp-text": (t) => t.colors.text,
"--color-ctp-subtext0": (t) => t.colors.subtext,
"--color-ctp-overlay0": (t) => t.colors.muted,
"--color-ctp-overlay1": (t) => t.colors.subtext,
"--color-ctp-mauve": (t) => t.colors.accent,
"--color-ctp-lavender": (t) => t.colors.accentHover,
"--color-ctp-red": (t) => t.terminal.red,
"--color-ctp-green": (t) => t.terminal.green,
"--color-ctp-yellow": (t) => t.terminal.yellow,
"--color-ctp-blue": (t) => t.terminal.blue,
"--color-ctp-pink": (t) => t.terminal.magenta,
"--color-ctp-teal": (t) => t.terminal.cyan,
"--color-ctp-rosewater": (t) => t.colors.text,  // fallback
"--color-ctp-flamingo": (t) => t.colors.subtext, // fallback
"--color-ctp-peach": (t) => t.terminal.yellow,
"--color-ctp-maroon": (t) => t.terminal.red,
"--color-ctp-sky": (t) => t.terminal.cyan,
"--color-ctp-sapphire": (t) => t.terminal.blue,
"--color-ctp-crust": (t) => t.colors.mantle,
"--color-ctp-subtext1": (t) => t.colors.subtext,
"--color-ctp-overlay2": (t) => t.colors.muted,
// Semantic status bg/border (derived with alpha)
"--color-success-bg": (t) => t.colors.success + "18",
"--color-success-border": (t) => t.colors.success + "40",
"--color-warning-bg": (t) => t.colors.warning + "18",
"--color-warning-border": (t) => t.colors.warning + "40",
"--color-error-bg": (t) => t.colors.error + "18",
"--color-error-border": (t) => t.colors.error + "40",
"--color-info-bg": (t) => t.colors.info + "18",
"--color-info-border": (t) => t.colors.info + "40",
// shadcn/ui
"--color-background": (t) => t.colors.base,
"--color-foreground": (t) => t.colors.text,
"--color-card": (t) => t.colors.surface,
"--color-card-foreground": (t) => t.colors.text,
"--color-popover": (t) => t.colors.mantle,
"--color-popover-foreground": (t) => t.colors.text,
"--color-primary": (t) => t.colors.accent,
"--color-primary-foreground": (t) => t.colors.base,
"--color-secondary": (t) => t.colors.surface,
"--color-secondary-foreground": (t) => t.colors.text,
"--color-muted": (t) => t.colors.surface,
"--color-muted-foreground": (t) => t.colors.muted,
"--color-accent": (t) => t.colors.surface,
"--color-accent-foreground": (t) => t.colors.text,
"--color-destructive": (t) => t.colors.error,
"--color-destructive-foreground": (t) => t.colors.base,
"--color-border": (t) => t.colors.surface,
"--color-input": (t) => t.colors.surface,
"--color-ring": (t) => t.colors.accent,
```

This ensures every `ctp-*` Tailwind class and every `var(--color-*)` reference updates when the theme changes.

**Step 3: Commit**

```
feat: map all CSS variables in theme applicator
```

---

### Task 11: Update Monaco Editor Integration

**Files:**
- Modify: `frontend/lib/monaco-theme.ts`

**Step 1: No new test** (existing Monaco tests cover rendering)

**Step 2: Update monaco-theme.ts**

Replace the hardcoded theme with a function-based approach. Keep backward compatibility:

```typescript
// frontend/lib/monaco-theme.ts
import { buildMonacoTheme } from "@/themes/apply";
import { useThemeStore } from "@/stores/theme";
import type * as monaco from "monaco-editor";

export function getMonacoThemeName(): string {
  const theme = useThemeStore.getState().getActiveTheme();
  return `forja-${theme.id}`;
}

export function getMonacoThemeData(): monaco.editor.IStandaloneThemeData {
  const theme = useThemeStore.getState().getActiveTheme();
  return buildMonacoTheme(theme) as monaco.editor.IStandaloneThemeData;
}

// Keep THEME_NAME and catppuccinMochaTheme as deprecated exports for backward compat
export const THEME_NAME = "catppuccin-mocha";
export { catppuccinMochaTheme } from "./monaco-theme-legacy";
```

Then update Monaco editor components to use `getMonacoThemeName()` + `getMonacoThemeData()`, and register the theme dynamically.

**Step 3: Commit**

```
feat: make Monaco theme dynamic via theme store
```

---

### Task 12: Final Integration Test and Cleanup

**Files:**
- Run full test suite
- Remove unused `TERMINAL_THEME` export from `terminal-theme.ts` (optional, only if no other consumers)

**Step 1: Run full test suite**

Run: `pnpm test`
Expected: All tests PASS

**Step 2: Visual verification**

Run: `pnpm dev`
- Verify Catppuccin Mocha loads as default
- Open command palette (`Cmd+Shift+P`), type "Theme", select Dracula
- Verify UI, terminal, and Monaco update
- Select Catppuccin Latte, verify light mode (scrollbars, color-scheme)
- Select Alucard, verify light mode
- Switch back to Mocha

**Step 3: Final commit**

```
feat: theme customization system with 4 built-in themes

Adds theme system with Catppuccin Mocha (default), Catppuccin Latte,
Dracula, and Alucard themes. Users can create custom themes in
settings.json. Themes apply to UI, terminal, and Monaco editor.
```
