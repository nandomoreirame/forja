import { create } from "zustand";

export type ModifierCombo = "cmd" | "cmd-shift" | "ctrl" | "cmd-alt";

interface ModifierHeldState {
  activeModifier: ModifierCombo | null;
  visible: boolean;
  setModifier: (combo: ModifierCombo) => void;
  clearModifier: () => void;
  cancelBadges: () => void;
}

export const useModifierHeldStore = create<ModifierHeldState>((set) => ({
  activeModifier: null,
  visible: false,

  setModifier: (combo) => {
    set({ activeModifier: combo, visible: true });
  },

  clearModifier: () => {
    set({ activeModifier: null, visible: false });
  },

  cancelBadges: () => {
    set({ activeModifier: null, visible: false });
  },
}));
