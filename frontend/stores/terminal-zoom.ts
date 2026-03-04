import { create } from "zustand";
import { DEFAULT_SETTINGS } from "@/lib/settings-types";

const DEFAULT_FONT_SIZE = 14;
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 32;
const ZOOM_STEP = 2;

interface TerminalZoomState {
  baseFontSize: number;
  fontSize: number;
  fontFamily: string;

  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setBaseFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
}

export const useTerminalZoomStore = create<TerminalZoomState>((set) => ({
  baseFontSize: DEFAULT_FONT_SIZE,
  fontSize: DEFAULT_FONT_SIZE,
  fontFamily: DEFAULT_SETTINGS.terminal.fontFamily,

  zoomIn: () =>
    set((state) => ({
      fontSize: Math.min(state.fontSize + ZOOM_STEP, MAX_FONT_SIZE),
    })),

  zoomOut: () =>
    set((state) => ({
      fontSize: Math.max(state.fontSize - ZOOM_STEP, MIN_FONT_SIZE),
    })),

  resetZoom: () =>
    set((state) => ({ fontSize: state.baseFontSize })),

  setBaseFontSize: (size: number) => {
    const clamped = Math.min(Math.max(size, MIN_FONT_SIZE), MAX_FONT_SIZE);
    set({ baseFontSize: clamped, fontSize: clamped });
  },

  setFontFamily: (family: string) => {
    set({ fontFamily: family });
  },
}));
