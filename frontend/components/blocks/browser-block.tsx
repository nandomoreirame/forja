import { BrowserPane } from "@/components/browser-pane";
import type { BlockConfig } from "@/lib/block-registry";

interface BrowserBlockProps {
  config?: BlockConfig;
  nodeId?: string;
}

export function BrowserBlock({ config, nodeId }: BrowserBlockProps) {
  return (
    <div className="h-full w-full overflow-hidden">
      <BrowserPane initialUrl={config?.url} nodeId={nodeId} />
    </div>
  );
}
