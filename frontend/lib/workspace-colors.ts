import type { WorkspaceColor } from "@/stores/workspace";

export const WORKSPACE_COLOR_MAP: Record<WorkspaceColor, string> = {
  green:  "#a6e3a1",
  teal:   "#94e2d5",
  blue:   "#89b4fa",
  mauve:  "#cba6f7",
  red:    "#f38ba8",
  peach:  "#fab387",
  yellow: "#f9e2af",
};

export function getWorkspaceColor(color: WorkspaceColor): string {
  return WORKSPACE_COLOR_MAP[color] ?? WORKSPACE_COLOR_MAP.mauve;
}

export const WORKSPACE_COLOR_LIST: WorkspaceColor[] =
  Object.keys(WORKSPACE_COLOR_MAP) as WorkspaceColor[];
