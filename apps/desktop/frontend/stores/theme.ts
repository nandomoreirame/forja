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
