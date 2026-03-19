import type { IJsonModel } from "flexlayout-react";

export const DEFAULT_LAYOUT: IJsonModel = {
  global: {
    tabEnableClose: true,
    tabEnableRename: false,
    tabSetEnableMaximize: true,
    splitterSize: 4,
    tabSetMinWidth: 400,
    tabSetMinHeight: 100,
    tabSetEnableTabStrip: true,
    // Allow flexlayout to delete empty tabsets by default (prevents ghost sessions).
    // The main tabset overrides this with enableDeleteWhenEmpty: false so it always persists.
    tabSetEnableDeleteWhenEmpty: true,
    borderEnableDrop: false,
  },
  layout: {
    type: "row",
    weight: 100,
    children: [
      {
        type: "tabset",
        weight: 100,
        id: "tabset-main",
        // The main tabset must never auto-delete even when empty.
        enableDeleteWhenEmpty: false,
        children: [],
      },
    ],
  },
};

export const TABSET_IDS = {
  main: "tabset-main",
} as const;
