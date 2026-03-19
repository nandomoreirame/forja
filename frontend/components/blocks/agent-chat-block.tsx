import { ChatPanel } from "@/components/chat-panel";

interface AgentChatBlockProps {
  projectPath: string | null;
  nodeId?: string;
}

export function AgentChatBlock({ projectPath, nodeId }: AgentChatBlockProps) {
  return (
    <div className="h-full w-full overflow-hidden">
      <ChatPanel projectPath={projectPath} nodeId={nodeId} />
    </div>
  );
}
