import { CLI_REGISTRY, type CliId, type SessionType } from "@/lib/cli-registry";
import { TerminalSquare } from "lucide-react";

interface CliIconProps {
  sessionType: SessionType;
  className?: string;
}

export function CliIcon({ sessionType, className = "h-5 w-5" }: CliIconProps) {
  if (sessionType === "terminal") {
    return <TerminalSquare className={`${className} text-ctp-overlay1`} strokeWidth={1.5} />;
  }

  const src = CLI_REGISTRY[sessionType as CliId]?.icon;
  if (!src) return null;

  const alt = CLI_REGISTRY[sessionType as CliId]?.displayName ?? sessionType;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      draggable={false}
    />
  );
}
