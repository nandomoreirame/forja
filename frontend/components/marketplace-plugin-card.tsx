import { Download, Loader2, Puzzle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getPluginIcon } from "@/lib/plugin-types";
import type { RegistryPlugin, InstallProgress } from "@/lib/plugin-types";

interface MarketplacePluginCardProps {
  plugin: RegistryPlugin;
  installed: boolean;
  installedVersion?: string;
  installProgress?: InstallProgress;
  onInstall: (name: string) => void;
  onUninstall: (name: string) => void;
}

function formatDownloads(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return String(count);
}

function PluginActionButton({
  plugin,
  installed,
  installedVersion,
  installProgress,
  onInstall,
  onUninstall,
}: MarketplacePluginCardProps) {
  // Installing in progress
  if (
    installProgress &&
    installProgress.stage !== "done" &&
    installProgress.stage !== "error"
  ) {
    let label = "Installing...";
    if (installProgress.stage === "downloading") {
      label = `${installProgress.percent}%`;
    } else if (installProgress.stage === "verifying") {
      label = "Verifying...";
    } else if (installProgress.stage === "extracting") {
      label = "Extracting...";
    }

    return (
      <Button
        size="xs"
        variant="outline"
        disabled
        className="flex items-center gap-1 text-ctp-subtext0 min-w-[72px]"
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>{label}</span>
      </Button>
    );
  }

  // Error state
  if (installProgress?.stage === "error") {
    return (
      <div className="flex flex-col items-end gap-1">
        <span className="text-[10px] text-ctp-red">{installProgress.message}</span>
        <Button
          size="xs"
          variant="outline"
          className="text-ctp-red border-ctp-red/40 hover:bg-ctp-red/10 min-w-[72px]"
          onClick={() => onInstall(plugin.name)}
        >
          Retry
        </Button>
      </div>
    );
  }

  // Has update available
  const hasUpdate = installed && installedVersion && installedVersion !== plugin.version;
  if (hasUpdate) {
    return (
      <Button
        size="xs"
        className="bg-ctp-green text-ctp-base hover:bg-ctp-green/90 min-w-[72px]"
        onClick={() => onInstall(plugin.name)}
      >
        Update
      </Button>
    );
  }

  // Already installed and up to date
  if (installed) {
    return (
      <Button
        size="xs"
        variant="outline"
        className="text-ctp-red border-ctp-red/40 hover:bg-ctp-red/10 min-w-[72px]"
        onClick={() => onUninstall(plugin.name)}
      >
        Uninstall
      </Button>
    );
  }

  // Not installed
  return (
    <Button
      size="xs"
      className="bg-ctp-mauve text-ctp-base hover:bg-ctp-mauve/90 min-w-[72px]"
      onClick={() => onInstall(plugin.name)}
    >
      Install
    </Button>
  );
}

export function MarketplacePluginCard(props: MarketplacePluginCardProps) {
  const { plugin } = props;
  const IconComponent = getPluginIcon(plugin.icon);
  const Icon = IconComponent ?? Puzzle;

  return (
    <div className={cn("bg-ctp-mantle rounded-lg p-3 flex gap-3")}>
      {/* Icon */}
      <div className="shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-ctp-subtext0" strokeWidth={1.5} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header row: name + button */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-medium text-ctp-text leading-tight truncate">
            {plugin.displayName}
          </span>
          <div className="shrink-0">
            <PluginActionButton {...props} />
          </div>
        </div>

        {/* Version · Author */}
        <p className="text-[10px] text-ctp-overlay0 mt-0.5">
          v{plugin.version} · by {plugin.author}
        </p>

        {/* Description */}
        <p className="text-[11px] text-ctp-subtext0 mt-1 leading-snug line-clamp-2">
          {plugin.description}
        </p>

        {/* Tags + Downloads */}
        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
          {plugin.tags.map((tag) => (
            <span
              key={tag}
              className="bg-ctp-surface1 text-ctp-subtext0 rounded px-1.5 py-0.5 text-[10px]"
            >
              {tag}
            </span>
          ))}

          <span className="ml-auto flex items-center gap-0.5 text-[10px] text-ctp-overlay0 shrink-0">
            <Download className="h-3 w-3" strokeWidth={1.5} />
            {formatDownloads(plugin.downloads)}
          </span>
        </div>
      </div>
    </div>
  );
}
