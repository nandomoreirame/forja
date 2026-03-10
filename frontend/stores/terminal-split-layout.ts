import { create } from "zustand";
import type { SessionType } from "@/lib/cli-registry";

export type SplitOrientation = "none" | "horizontal" | "vertical";
export type SplitPaneId = "primary" | "secondary";

const DEFAULT_RATIO = 50;

interface TerminalSplitLayoutState {
  orientation: SplitOrientation;
  ratio: number;
  splitTabId: string | null;
  secondarySessionType: SessionType | null;
  focusedPane: SplitPaneId;
  openSplit: (
    orientation: Exclude<SplitOrientation, "none">,
    tabId: string,
    sessionType: SessionType,
  ) => void;
  closeSplit: () => void;
  setFocusedPane: (paneId: SplitPaneId) => void;
  setRatio: (ratio: number) => void;
  resetForProjectSwitch: () => void;
}

export const useTerminalSplitLayoutStore = create<TerminalSplitLayoutState>(
  (set) => ({
    orientation: "none",
    ratio: DEFAULT_RATIO,
    splitTabId: null,
    secondarySessionType: null,
    focusedPane: "primary",

    openSplit: (orientation, tabId, sessionType) =>
      set({
        orientation,
        splitTabId: tabId,
        secondarySessionType: sessionType,
        focusedPane: "primary",
      }),

    closeSplit: () =>
      set({
        orientation: "none",
        splitTabId: null,
        secondarySessionType: null,
        focusedPane: "primary",
      }),

    setFocusedPane: (paneId) => set({ focusedPane: paneId }),

    setRatio: (ratio) =>
      set({
        ratio: Math.max(10, Math.min(90, Math.round(ratio))),
      }),

    resetForProjectSwitch: () =>
      set({
        orientation: "none",
        ratio: DEFAULT_RATIO,
        splitTabId: null,
        secondarySessionType: null,
        focusedPane: "primary",
      }),
  }),
);
