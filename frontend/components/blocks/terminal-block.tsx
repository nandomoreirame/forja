import { TerminalSession } from "@/components/terminal-session";
import type { BlockConfig } from "@/lib/block-registry";

interface TerminalBlockProps {
  config: BlockConfig;
  nodeId: string;
  projectPath: string | null;
}

export function TerminalBlock({
  config,
  nodeId,
  projectPath,
}: TerminalBlockProps) {
  return (
    <div className="h-full w-full overflow-hidden">
      <TerminalSession
        tabId={config.tabId ?? nodeId}
        path={projectPath ?? ""}
        isVisible={true}
        sessionType={config.sessionType ?? "terminal"}
      />
    </div>
  );
}
