import { PluginHost } from "@/components/plugin-host";
import type { BlockConfig } from "@/lib/block-registry";

interface PluginBlockProps {
  config: BlockConfig;
}

export function PluginBlock({ config }: PluginBlockProps) {
  if (!config.pluginName) {
    return <div className="flex h-full items-center justify-center text-ctp-subtext0">No plugin specified</div>;
  }

  return (
    <div className="h-full w-full overflow-hidden">
      <PluginHost pluginName={config.pluginName} />
    </div>
  );
}
