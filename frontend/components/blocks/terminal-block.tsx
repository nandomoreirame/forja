import { TerminalSession } from "@/components/terminal-session";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";
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
  const tabId = config.tabId ?? nodeId;

  // Fallback: use the tab's own stored path when the factory-time projectPath
  // is null (e.g. layout restored before activeProjectPath is set).
  const tabPath = useTerminalTabsStore((s) => s.tabs.find((t) => t.id === tabId)?.path);
  const effectivePath = projectPath || tabPath;

  return (
    <div className="h-full w-full overflow-hidden">
      <TerminalSession
        tabId={tabId}
        path={effectivePath ?? ""}
        isVisible={true}
        sessionType={config.sessionType ?? "terminal"}
      />
    </div>
  );
}
