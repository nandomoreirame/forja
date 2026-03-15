import { useCallback, useEffect, useState } from "react";
import { invoke } from "@/lib/ipc";
import { useTilingLayoutStore } from "@/stores/tiling-layout";
import { parseLayoutJson } from "@/lib/layout-migration";

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

export function usePanelPreferences() {
  const [panelSizes, setPanelSizes] = useState<PanelSizes>(DEFAULT_PANEL_SIZES);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [terminalSplit, setTerminalSplit] = useState<TerminalSplitPreferences>(
    DEFAULT_TERMINAL_SPLIT,
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    invoke<
      PanelSizes & {
        sidebarOpen?: boolean;
        terminalSplitEnabled?: boolean;
        terminalSplitOrientation?: "horizontal" | "vertical";
        terminalSplitRatio?: number;
        layoutJson?: Record<string, unknown>;
      }
    >("get_ui_preferences")
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

        // Restore persisted tiling layout if available.
        // Strip terminal blocks — they are re-created by session restore
        // (App.tsx) with fresh instance IDs and proper PTY connections.
        if (prefs?.layoutJson) {
          const layoutJson = parseLayoutJson(prefs.layoutJson);
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
  }, []);

  const savePanelSize = useCallback((key: keyof PanelSizes, value: number) => {
    invoke("save_ui_preferences", { [key]: value }).catch((err) =>
      console.warn("[panel-preferences] Save failed:", err),
    );
  }, []);

  const saveSidebarOpen = useCallback((value: boolean) => {
    invoke("save_ui_preferences", { sidebarOpen: value }).catch((err) =>
      console.warn("[panel-preferences] Save sidebarOpen failed:", err),
    );
  }, []);

  const saveTerminalSplit = useCallback((value: TerminalSplitPreferences) => {
    invoke("save_ui_preferences", {
      terminalSplitEnabled: value.enabled,
      terminalSplitOrientation: value.orientation,
      terminalSplitRatio: value.ratio,
    }).catch((err) =>
      console.warn("[panel-preferences] Save terminal split failed:", err),
    );
  }, []);

  const saveLayout = useCallback(() => {
    const layoutJson = useTilingLayoutStore.getState().getModelJson();
    invoke("save_ui_preferences", { layoutJson }).catch((err) =>
      console.warn("[panel-preferences] Save layout failed:", err),
    );
  }, []);

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
