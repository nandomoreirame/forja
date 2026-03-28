import { describe, it, expect } from "vitest";
import { validateTheme } from "../schema";
import catppuccinMocha from "../catppuccin-mocha/theme.json";
import catppuccinLatte from "../catppuccin-latte/theme.json";
import dracula from "../dracula/theme.json";
import alucard from "../alucard/theme.json";
import oneDarkPro from "../one-dark-pro/theme.json";
import githubDark from "../github-dark/theme.json";
import tokyoNight from "../tokyo-night/theme.json";
import darcula from "../darcula/theme.json";
import monokaiPro from "../monokai-pro/theme.json";
import nord from "../nord/theme.json";
import gruvboxDark from "../gruvbox-dark/theme.json";
import nightOwl from "../night-owl/theme.json";
import synthwave84 from "../synthwave-84/theme.json";
import solarizedDark from "../solarized-dark/theme.json";

const darkThemes = [
  { name: "catppuccin-mocha", theme: catppuccinMocha },
  { name: "dracula", theme: dracula },
  { name: "one-dark-pro", theme: oneDarkPro },
  { name: "github-dark", theme: githubDark },
  { name: "tokyo-night", theme: tokyoNight },
  { name: "darcula", theme: darcula },
  { name: "monokai-pro", theme: monokaiPro },
  { name: "nord", theme: nord },
  { name: "gruvbox-dark", theme: gruvboxDark },
  { name: "night-owl", theme: nightOwl },
  { name: "synthwave-84", theme: synthwave84 },
  { name: "solarized-dark", theme: solarizedDark },
];

const lightThemes = [
  { name: "catppuccin-latte", theme: catppuccinLatte },
  { name: "alucard", theme: alucard },
];

const allThemes = [...darkThemes, ...lightThemes];

describe("built-in themes", () => {
  for (const { name, theme } of allThemes) {
    it(`${name} passes validation`, () => {
      const result = validateTheme(theme);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it(`${name} has correct id`, () => {
      expect(theme.id).toBe(name);
    });
  }

  for (const { name, theme } of darkThemes) {
    it(`${name} is dark`, () => {
      expect(theme.type).toBe("dark");
    });
  }

  for (const { name, theme } of lightThemes) {
    it(`${name} is light`, () => {
      expect(theme.type).toBe("light");
    });
  }
});
