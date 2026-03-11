import type { ThemeDefinition } from "./schema";
import catppuccinMocha from "./catppuccin-mocha/theme.json";
import catppuccinLatte from "./catppuccin-latte/theme.json";
import dracula from "./dracula/theme.json";
import alucard from "./alucard/theme.json";
import oneDarkPro from "./one-dark-pro/theme.json";
import githubDark from "./github-dark/theme.json";
import tokyoNight from "./tokyo-night/theme.json";
import darcula from "./darcula/theme.json";
import monokaiPro from "./monokai-pro/theme.json";
import nord from "./nord/theme.json";
import gruvboxDark from "./gruvbox-dark/theme.json";
import nightOwl from "./night-owl/theme.json";
import synthwave84 from "./synthwave-84/theme.json";
import solarizedDark from "./solarized-dark/theme.json";

export type { ThemeDefinition, ThemeColors, TerminalColors } from "./schema";
export { validateTheme, isValidHexColor } from "./schema";

export const DEFAULT_THEME_ID = "catppuccin-mocha";

const BUILTIN_THEMES: ThemeDefinition[] = [
  catppuccinMocha as ThemeDefinition,
  catppuccinLatte as ThemeDefinition,
  dracula as ThemeDefinition,
  alucard as ThemeDefinition,
  oneDarkPro as ThemeDefinition,
  githubDark as ThemeDefinition,
  tokyoNight as ThemeDefinition,
  darcula as ThemeDefinition,
  monokaiPro as ThemeDefinition,
  nord as ThemeDefinition,
  gruvboxDark as ThemeDefinition,
  nightOwl as ThemeDefinition,
  synthwave84 as ThemeDefinition,
  solarizedDark as ThemeDefinition,
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
