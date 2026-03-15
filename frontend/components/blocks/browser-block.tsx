import { BrowserPane } from "@/components/browser-pane";
import type { BlockConfig } from "@/lib/block-registry";

interface BrowserBlockProps {
  config?: BlockConfig;
}

export function BrowserBlock({ config }: BrowserBlockProps) {
  return (
    <div className="h-full w-full overflow-hidden">
      <BrowserPane initialUrl={config?.url} />
    </div>
  );
}
