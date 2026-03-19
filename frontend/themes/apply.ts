// frontend/themes/apply.ts
import type { ThemeDefinition } from "./schema";
import type { ITheme } from "@xterm/xterm";

interface MonacoThemeData {
  base: "vs" | "vs-dark" | "hc-black";
  inherit: boolean;
  rules: Array<{ token: string; foreground?: string; fontStyle?: string }>;
  colors: Record<string, string>;
}

/**
 * CSS variables that represent background colors.
 * These receive alpha channel when background opacity is applied,
 * while text/foreground variables remain fully opaque.
 */
const BG_CSS_VARS = new Set([
  "--bg-base",
  "--bg-elevated",
  "--color-ctp-base",
  "--color-ctp-mantle",
  "--color-ctp-crust",
  "--color-background",
]);

/** Stores original hex values from last applyTheme call for background variables. */
const originalBgColors = new Map<string, string>();

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function applyBackgroundOpacity(opacity: number): void {
  const root = document.documentElement;
  for (const [varName, hex] of originalBgColors) {
    if (opacity < 1) {
      root.style.setProperty(varName, hexToRgba(hex, opacity));
    } else {
      root.style.setProperty(varName, hex);
    }
  }
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
  // Border variables (used by scrollbars and other borders)
  "--border-default": (t) => t.colors.surface,
  "--border-subtle": (t) => t.colors.mantle,
  "--border-strong": (t) => t.colors.overlay,
  "--color-brand": (t) => t.colors.accent,
  "--color-brand-hover": (t) => t.colors.accentHover,
  "--color-brand-subtle": (t) => t.colors.accentSubtle,
  "--color-brand-border": (t) => t.colors.highlight,
  "--color-success": (t) => t.colors.success,
  "--color-warning": (t) => t.colors.warning,
  "--color-error": (t) => t.colors.error,
  "--color-info": (t) => t.colors.info,
  "--primary-foreground": (t) => t.colors.base,
  "--destructive-foreground": (t) => t.colors.base,
  // ctp-* variables (so Tailwind utility classes update dynamically)
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
  "--color-ctp-rosewater": (t) => t.colors.text,
  "--color-ctp-flamingo": (t) => t.colors.subtext,
  "--color-ctp-peach": (t) => t.terminal.yellow,
  "--color-ctp-maroon": (t) => t.terminal.red,
  "--color-ctp-sky": (t) => t.terminal.cyan,
  "--color-ctp-sapphire": (t) => t.terminal.blue,
  "--color-ctp-crust": (t) => t.colors.mantle,
  "--color-ctp-subtext1": (t) => t.colors.subtext,
  "--color-ctp-overlay2": (t) => t.colors.muted,
  // Semantic status bg/border
  "--color-success-bg": (t) => t.colors.success + "18",
  "--color-success-border": (t) => t.colors.success + "40",
  "--color-warning-bg": (t) => t.colors.warning + "18",
  "--color-warning-border": (t) => t.colors.warning + "40",
  "--color-error-bg": (t) => t.colors.error + "18",
  "--color-error-border": (t) => t.colors.error + "40",
  "--color-info-bg": (t) => t.colors.info + "18",
  "--color-info-border": (t) => t.colors.info + "40",
  // shadcn/ui variables
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
  "--color-border": (t) => t.colors.surface,
  "--color-input": (t) => t.colors.surface,
  "--color-ring": (t) => t.colors.accent,
  // Overlay backgrounds: always opaque (never in BG_CSS_VARS).
  // Used by dialogs, command palette, tooltips, and other floating UI.
  "--color-overlay-base": (t) => t.colors.base,
  "--color-overlay-mantle": (t) => t.colors.mantle,
  // Selection colors (used by ::selection CSS)
  "--selection-bg": (t) => t.colors.highlight,
  "--selection-fg": (t) => t.colors.text,
};

export function applyTheme(theme: ThemeDefinition): void {
  const root = document.documentElement;

  for (const [varName, getter] of Object.entries(CSS_VAR_MAP)) {
    const value = getter(theme);
    root.style.setProperty(varName, value);
    if (BG_CSS_VARS.has(varName)) {
      originalBgColors.set(varName, value);
    }
  }

  root.classList.remove("dark", "light");
  root.classList.add(theme.type);
  root.style.colorScheme = theme.type;
}

export function buildTerminalTheme(theme: ThemeDefinition, _opacity?: number): ITheme {
  // Always use opaque background — xterm.js WebGL renderer does not
  // support rgba backgrounds reliably.  The terminal container is
  // also opaque (bg-overlay-base) so the padding matches.
  return {
    background: theme.colors.base,
    foreground: theme.colors.text,
    cursor: theme.colors.text,
    cursorAccent: theme.colors.base,
    selectionBackground: theme.colors.highlight,
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
