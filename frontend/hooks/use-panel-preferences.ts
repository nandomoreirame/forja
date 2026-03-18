import { useCallback, useEffect, useState } from "react";
import { invoke } from "@/lib/ipc";
import { useTilingLayoutStore, stripProjectBlocksFromJson } from "@/stores/tiling-layout";
import { parseLayoutJson } from "@/lib/layout-migration";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";

export interface PanelSizes {
  sidebarSize: number;
  previewSize: number;
  rightPanelWidth: number;
}

export interface TerminalSplitPreferences {
  enabled: boolean;
  orientation: "horizontal" | "vertical";
  ratio: number;
}

export const DEFAULT_PANEL_SIZES: PanelSizes = {
  sidebarSize: 20,
  previewSize: 0,
  rightPanelWidth: 400,
};

const DEFAULT_TERMINAL_SPLIT: TerminalSplitPreferences = {
  enabled: false,
  orientation: "vertical",
  ratio: 50,
};

export function getPanelSizesForLayout(
  hasProject: boolean,
  panelSizes: PanelSizes
): PanelSizes {
  return hasProject ? panelSizes : DEFAULT_PANEL_SIZES;
}

export function usePanelPreferences(projectPath?: string | null) {
  const [panelSizes, setPanelSizes] = useState<PanelSizes>(DEFAULT_PANEL_SIZES);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [terminalSplit, setTerminalSplit] = useState<TerminalSplitPreferences>(
    DEFAULT_TERMINAL_SPLIT,
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    const ipcArgs: { projectPath?: string } = {};
    if (projectPath) ipcArgs.projectPath = projectPath;

    invoke<
      PanelSizes & {
        sidebarOpen?: boolean;
        terminalSplitEnabled?: boolean;
        terminalSplitOrientation?: "horizontal" | "vertical";
        terminalSplitRatio?: number;
        layoutJson?: Record<string, unknown>;
      }
    >("get_ui_preferences", ipcArgs)
      .then((prefs) => {
        if (!active) return;
        if (prefs && Number.isFinite(prefs.sidebarSize) && Number.isFinite(prefs.previewSize)) {
          setPanelSizes({
            sidebarSize: prefs.sidebarSize,
            previewSize: prefs.previewSize,
            rightPanelWidth: Number.isFinite(prefs.rightPanelWidth)
              ? Math.max(200, prefs.rightPanelWidth)
              : DEFAULT_PANEL_SIZES.rightPanelWidth,
          });
        } else {
          setPanelSizes(DEFAULT_PANEL_SIZES);
        }
        setSidebarOpen(prefs?.sidebarOpen ?? true);
        setTerminalSplit({
          enabled: prefs?.terminalSplitEnabled ?? DEFAULT_TERMINAL_SPLIT.enabled,
          orientation:
            prefs?.terminalSplitOrientation ?? DEFAULT_TERMINAL_SPLIT.orientation,
          ratio:
            Number.isFinite(prefs?.terminalSplitRatio)
              ? Math.max(10, Math.min(90, Math.round(prefs.terminalSplitRatio as number)))
              : DEFAULT_TERMINAL_SPLIT.ratio,
        });

        // Restore persisted tiling layout if available (including terminal blocks
        // with their custom names). Blocks for tabs not in config are cleaned up
        // by orphan removal in App.tsx after session restore.
        if (prefs?.layoutJson) {
          let layoutJson = parseLayoutJson(prefs.layoutJson);
          // When there are no terminal sessions to restore, strip stale
          // terminal/browser blocks from the layout to avoid orphan panes
          // that would otherwise linger (the orphan cleanup in restore()
          // runs before this layout is loaded).
          const hasTabs = useTerminalTabsStore.getState().tabs.length > 0;
          if (!hasTabs) {
            layoutJson = stripProjectBlocksFromJson(layoutJson);
          }
          useTilingLayoutStore.getState().loadFromJson(layoutJson);
        }
      })
      .catch(() => {
        if (active) {
          setPanelSizes(DEFAULT_PANEL_SIZES);
          setSidebarOpen(true);
          setTerminalSplit(DEFAULT_TERMINAL_SPLIT);
        }
      })
      .finally(() => {
        if (active) setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [projectPath]);

  const savePanelSize = useCallback((key: keyof PanelSizes, value: number) => {
    const args: Record<string, unknown> = { [key]: value };
    if (projectPath) args.projectPath = projectPath;
    invoke("save_ui_preferences", args).catch((err) =>
      console.warn("[panel-preferences] Save failed:", err),
    );
  }, [projectPath]);

  const saveSidebarOpen = useCallback((value: boolean) => {
    const args: Record<string, unknown> = { sidebarOpen: value };
    if (projectPath) args.projectPath = projectPath;
    invoke("save_ui_preferences", args).catch((err) =>
      console.warn("[panel-preferences] Save sidebarOpen failed:", err),
    );
  }, [projectPath]);

  const saveTerminalSplit = useCallback((value: TerminalSplitPreferences) => {
    const args: Record<string, unknown> = {
      terminalSplitEnabled: value.enabled,
      terminalSplitOrientation: value.orientation,
      terminalSplitRatio: value.ratio,
    };
    if (projectPath) args.projectPath = projectPath;
    invoke("save_ui_preferences", args).catch((err) =>
      console.warn("[panel-preferences] Save terminal split failed:", err),
    );
  }, [projectPath]);

  const saveLayout = useCallback(() => {
    const layoutJson = useTilingLayoutStore.getState().getModelJson();
    const args: Record<string, unknown> = { layoutJson };
    if (projectPath) args.projectPath = projectPath;
    invoke("save_ui_preferences", args).catch((err) =>
      console.warn("[panel-preferences] Save layout failed:", err),
    );
  }, [projectPath]);

  return {
    panelSizes,
    sidebarOpen,
    terminalSplit,
    loaded,
    savePanelSize,
    saveSidebarOpen,
    saveTerminalSplit,
    saveLayout,
  };
}
