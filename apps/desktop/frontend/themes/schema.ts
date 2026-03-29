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
  "base",
  "mantle",
  "surface",
  "overlay",
  "highlight",
  "text",
  "subtext",
  "muted",
  "accent",
  "accentHover",
  "accentSubtle",
  "success",
  "warning",
  "error",
  "info",
];

const TERMINAL_COLORS_KEYS: (keyof TerminalColors)[] = [
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "magenta",
  "cyan",
  "white",
  "brightBlack",
  "brightRed",
  "brightGreen",
  "brightYellow",
  "brightBlue",
  "brightMagenta",
  "brightCyan",
  "brightWhite",
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
