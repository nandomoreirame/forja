import { CLI_REGISTRY, TERMINAL_ICON, type CliId, type SessionType } from "@/lib/cli-registry";

interface CliIconProps {
  sessionType: SessionType;
  className?: string;
}

export function CliIcon({ sessionType, className = "h-5 w-5" }: CliIconProps) {
  const src =
    sessionType === "terminal"
      ? TERMINAL_ICON
      : CLI_REGISTRY[sessionType as CliId]?.icon;

  if (!src) return null;

  const alt =
    sessionType === "terminal"
      ? "Terminal"
      : CLI_REGISTRY[sessionType as CliId]?.displayName ?? sessionType;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      draggable={false}
    />
  );
}
