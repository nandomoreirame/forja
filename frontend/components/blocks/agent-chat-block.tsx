import { ChatPanel } from "@/components/chat-panel";

interface AgentChatBlockProps {
  projectPath: string | null;
}

export function AgentChatBlock({ projectPath }: AgentChatBlockProps) {
  return (
    <div className="h-full w-full overflow-hidden">
      <ChatPanel projectPath={projectPath} />
    </div>
  );
}
