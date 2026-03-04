import { useCallback, useEffect, useState } from "react";
import { invoke } from "@/lib/ipc";

export interface PanelSizes {
  sidebarSize: number;
  previewSize: number;
}

export const DEFAULT_PANEL_SIZES: PanelSizes = {
  sidebarSize: 20,
  previewSize: 0,
};

export function getPanelSizesForLayout(
  hasProject: boolean,
  panelSizes: PanelSizes
): PanelSizes {
  return hasProject ? panelSizes : DEFAULT_PANEL_SIZES;
}

export function usePanelPreferences() {
  const [panelSizes, setPanelSizes] = useState<PanelSizes>(DEFAULT_PANEL_SIZES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    invoke<PanelSizes>("get_ui_preferences")
      .then((prefs) => {
        if (!active) return;
        if (prefs && Number.isFinite(prefs.sidebarSize) && Number.isFinite(prefs.previewSize)) {
          setPanelSizes(prefs);
        } else {
          setPanelSizes(DEFAULT_PANEL_SIZES);
        }
      })
      .catch(() => {
        if (active) setPanelSizes(DEFAULT_PANEL_SIZES);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const savePanelSize = useCallback((key: keyof PanelSizes, value: number) => {
    invoke("save_ui_preferences", { [key]: value }).catch(() => {});
  }, []);

  return {
    panelSizes,
    loaded,
    savePanelSize,
  };
}
