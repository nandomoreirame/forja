import type { TabNode } from "flexlayout-react";
import { TerminalBlock } from "@/components/blocks/terminal-block";
import { FilePreviewBlock } from "@/components/blocks/file-preview-block";
import { BrowserBlock } from "@/components/blocks/browser-block";
import { PluginBlock } from "@/components/blocks/plugin-block";
import { FileTreeBlock } from "@/components/blocks/file-tree-block";
import { AgentChatBlock } from "@/components/blocks/agent-chat-block";
import { MarketplaceBlock } from "@/components/blocks/marketplace-block";
import { useProjectsStore } from "@/stores/projects";
import type { BlockConfig } from "@/lib/block-registry";

export function blockFactory(node: TabNode): React.ReactNode {
  const component = node.getComponent();
  const config = (node.getConfig() as BlockConfig) ?? { type: component };
  const nodeId = node.getId();
  const projectPath = useProjectsStore.getState().activeProjectPath;

  switch (component) {
    case "terminal":
      return (
        <TerminalBlock
          config={config}
          nodeId={nodeId}
          projectPath={projectPath}
        />
      );
    case "file-preview":
      return <FilePreviewBlock />;
    case "browser":
      return <BrowserBlock config={config} />;
    case "plugin":
      return <PluginBlock config={config} />;
    case "file-tree":
      return <FileTreeBlock />;
    case "agent-chat":
      return <AgentChatBlock projectPath={projectPath} />;
    case "marketplace":
      return <MarketplaceBlock />;
    default:
      return (
        <div className="flex h-full items-center justify-center text-ctp-subtext0">
          Unknown block: {component}
        </div>
      );
  }
}
