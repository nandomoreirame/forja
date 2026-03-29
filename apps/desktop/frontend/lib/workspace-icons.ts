import type { LucideIcon } from "lucide-react";
import {
  Waves,
  Mountain,
  Star,
  Heart,
  Zap,
  Cloud,
  Moon,
  Layers,
  Rocket,
  FlaskConical,
  Paperclip,
  TrendingUp,
  GraduationCap,
  Coffee,
} from "lucide-react";
import type { WorkspaceIcon } from "@/stores/workspace";

export const WORKSPACE_ICON_MAP: Record<WorkspaceIcon, LucideIcon> = {
  waves:      Waves,
  mountain:   Mountain,
  star:       Star,
  heart:      Heart,
  bolt:       Zap,
  cloud:      Cloud,
  moon:       Moon,
  layers:     Layers,
  rocket:     Rocket,
  beaker:     FlaskConical,
  link:       Paperclip,
  trending:   TrendingUp,
  graduation: GraduationCap,
  coffee:     Coffee,
};

export function getWorkspaceIcon(icon: WorkspaceIcon): LucideIcon {
  return WORKSPACE_ICON_MAP[icon] ?? Layers;
}

export const WORKSPACE_ICON_LIST: WorkspaceIcon[] = Object.keys(
  WORKSPACE_ICON_MAP
) as WorkspaceIcon[];
