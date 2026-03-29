import type { ThemeDefinition, ThemeColors, TerminalColors } from "@/themes/schema";

/**
 * Maps --forja-* CSS custom properties to ThemeDefinition values.
 * Plugins MUST use these variables instead of hardcoded colors.
 */
export const PLUGIN_CSS_VAR_MAP: Record<string, (t: ThemeDefinition) => string> = {
  // Background
  "--forja-bg-base": (t) => t.colors.base,
  "--forja-bg-mantle": (t) => t.colors.mantle,
  "--forja-bg-surface": (t) => t.colors.surface,
  "--forja-bg-overlay": (t) => t.colors.overlay,
  "--forja-bg-highlight": (t) => t.colors.highlight,
  // Text
  "--forja-text": (t) => t.colors.text,
  "--forja-text-sub": (t) => t.colors.subtext,
  "--forja-text-muted": (t) => t.colors.muted,
  // Accent / brand
  "--forja-accent": (t) => t.colors.accent,
  "--forja-accent-hover": (t) => t.colors.accentHover,
  "--forja-accent-subtle": (t) => t.colors.accentSubtle,
  // Semantic status
  "--forja-success": (t) => t.colors.success,
  "--forja-warning": (t) => t.colors.warning,
  "--forja-error": (t) => t.colors.error,
  "--forja-info": (t) => t.colors.info,
  // Terminal palette (useful for syntax-like highlighting)
  "--forja-red": (t) => t.terminal.red,
  "--forja-green": (t) => t.terminal.green,
  "--forja-yellow": (t) => t.terminal.yellow,
  "--forja-blue": (t) => t.terminal.blue,
  "--forja-magenta": (t) => t.terminal.magenta,
  "--forja-cyan": (t) => t.terminal.cyan,
};

/**
 * Builds a CSS string that sets all --forja-* variables on :root.
 * Injected into the plugin webview via executeJavaScript.
 */
export function buildPluginThemeCSS(theme: ThemeDefinition): string {
  const vars = Object.entries(PLUGIN_CSS_VAR_MAP)
    .map(([name, getter]) => `${name}:${getter(theme)}`)
    .join(";");
  return `:root{${vars}}`;
}

export interface PluginThemePayload {
  id: string;
  name: string;
  type: "dark" | "light";
  colors: ThemeColors;
  terminal: TerminalColors;
}

/**
 * Builds a serializable payload for theme.getCurrent and theme-changed events.
 */
export function buildPluginThemePayload(theme: ThemeDefinition): PluginThemePayload {
  return {
    id: theme.id,
    name: theme.name,
    type: theme.type,
    colors: { ...theme.colors },
    terminal: { ...theme.terminal },
  };
}
