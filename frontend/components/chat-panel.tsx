import { useState, useCallback, useRef, useEffect, type FormEvent } from "react";
import { X, Send, Loader2, MessageSquare, ChevronUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAgentChatStore } from "@/stores/agent-chat";
import { useInstalledClis } from "@/hooks/use-installed-clis";
import { useAgentChatEvents } from "@/hooks/use-agent-chat";
import { cn } from "@/lib/utils";
import { SlashCommandMenu, type SlashCommandMenuHandle } from "./slash-command-menu";
import type { SlashCommandDef } from "@/lib/slash-commands";
import { getCliDefinition } from "@/lib/cli-registry";

interface ChatPanelProps {
  projectPath?: string | null;
}

export function ChatPanel({ projectPath }: ChatPanelProps) {
  const chat = useAgentChatStore();
  const { installedClis, loading: clisLoading } = useInstalledClis();
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useAgentChatEvents();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chat.messages]);

  const handleSelectCli = useCallback(
    (cliId: string) => {
      if (projectPath) {
        chat.startSession(cliId, projectPath);
      } else {
        chat.startSession(cliId);
      }
    },
    [chat, projectPath]
  );

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const text = inputText.trim();
      if (!text) return;
      chat.sendMessage(text);
      setInputText("");
    },
    [chat, inputText]
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const slashMenuRef = useRef<SlashCommandMenuHandle>(null);
  const showSlashMenu = inputText.startsWith("/") && !!chat.sessionId;
  const slashQuery = showSlashMenu ? inputText.slice(1) : "";
  const slashMenuOpenRef = useRef(false);
  slashMenuOpenRef.current = showSlashMenu;

  const handleSlashSelect = useCallback(
    (cmd: SlashCommandDef) => {
      setInputText(cmd.command);
      if (!cmd.needsArgs) {
        chat.sendMessage(cmd.command);
        setInputText("");
      }
      textareaRef.current?.focus();
    },
    [chat]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (slashMenuOpenRef.current) {
        if (e.key === "Escape") {
          e.preventDefault();
          setInputText("");
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          slashMenuRef.current?.confirm();
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          slashMenuRef.current?.moveDown();
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          slashMenuRef.current?.moveUp();
          return;
        }
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as unknown as FormEvent);
      }
    },
    [handleSubmit]
  );

  const [cliSwitcherOpen, setCliSwitcherOpen] = useState(false);

  const handleSlashButtonClick = useCallback(() => {
    setInputText("/");
    textareaRef.current?.focus();
  }, []);

  const handleSwitchCli = useCallback(
    (cliId: string) => {
      setCliSwitcherOpen(false);
      chat.switchSession(cliId);
    },
    [chat]
  );

  const isStreaming = chat.status === "streaming";
  const hasSession = !!chat.sessionId;

  const currentCliDef = chat.cliId ? getCliDefinition(chat.cliId as Parameters<typeof getCliDefinition>[0]) : null;
  const switchableClis = installedClis.filter(
    (cli) => cli.chatSupported && cli.id !== chat.cliId
  );

  return (
    <div
      data-testid="chat-panel"
      className="flex h-full w-[450px] flex-col bg-ctp-mantle"
    >
      {/* Header */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-ctp-surface0 px-3">
        <span className="text-xs font-medium text-ctp-subtext0">
          {hasSession ? `Chat (${chat.cliId})` : "Chat"}
        </span>
        <button
          type="button"
          aria-label="Close chat panel"
          onClick={chat.togglePanel}
          className="flex h-6 w-6 items-center justify-center rounded text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
        {!hasSession ? (
          <CliSelector
            clis={installedClis.filter((cli) => cli.chatSupported)}
            loading={clisLoading}
            onSelect={handleSelectCli}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {chat.messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm select-text cursor-text",
                  msg.role === "user"
                    ? "ml-4 bg-ctp-surface0 text-ctp-text"
                    : "text-ctp-subtext1"
                )}
              >
                {msg.role === "user" ? (
                  msg.content
                ) : (
                  <div className="chat-markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            ))}
            {isStreaming && (
              <div className="flex items-center gap-2 text-xs text-ctp-overlay1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Thinking...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      {hasSession && (
        <form
          onSubmit={handleSubmit}
          className="relative shrink-0 border-t border-ctp-surface0 p-3"
        >
          {showSlashMenu && (
            <SlashCommandMenu ref={slashMenuRef} query={slashQuery} onSelect={handleSlashSelect} />
          )}
          {/* CLI Switcher Dropdown */}
          {cliSwitcherOpen && switchableClis.length > 0 && (
            <div
              data-testid="cli-switcher-dropdown"
              className="absolute bottom-full left-3 right-3 z-50 mb-1 rounded-lg border border-ctp-surface0 bg-ctp-base shadow-lg"
            >
              <div className="p-1">
                {switchableClis.map((cli) => (
                  <button
                    key={cli.id}
                    type="button"
                    data-testid={`cli-switcher-item-${cli.id}`}
                    onClick={() => handleSwitchCli(cli.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-ctp-text transition-colors hover:bg-ctp-surface0"
                  >
                    {cli.icon && (
                      <img
                        src={cli.icon}
                        alt={cli.displayName}
                        className="h-3.5 w-3.5 shrink-0"
                      />
                    )}
                    <span>{cli.displayName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="min-h-[36px] flex-1 resize-none rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm text-ctp-text placeholder:text-ctp-overlay0 outline-none focus:border-ctp-mauve"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isStreaming}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-ctp-mauve text-ctp-base transition-colors hover:bg-ctp-mauve/90 disabled:opacity-40"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
          {/* Toolbar */}
          <div className="mt-2 flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Insert slash command"
              onClick={handleSlashButtonClick}
              className="flex h-6 items-center justify-center rounded px-2 text-xs font-medium text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
            >
              /
            </button>
            {currentCliDef && switchableClis.length > 0 && (
              <button
                type="button"
                aria-label="Switch AI agent"
                onClick={() => setCliSwitcherOpen((o) => !o)}
                className="flex h-6 items-center gap-1 rounded px-2 text-xs text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
              >
                {currentCliDef.icon && (
                  <img
                    src={currentCliDef.icon}
                    alt={currentCliDef.displayName}
                    className="h-3 w-3 shrink-0"
                  />
                )}
                <span>{currentCliDef.displayName}</span>
                <ChevronUp
                  className={cn("h-3 w-3 transition-transform", cliSwitcherOpen && "rotate-180")}
                  strokeWidth={1.5}
                />
              </button>
            )}
          </div>
        </form>
      )}

      {/* Error */}
      {chat.error && (
        <div className="shrink-0 border-t border-ctp-red/30 bg-ctp-red/10 px-3 py-2 text-xs text-ctp-red">
          {chat.error}
        </div>
      )}
    </div>
  );
}

function CliSelector({
  clis,
  loading,
  onSelect,
}: {
  clis: Array<{ id: string; displayName: string; icon: string }>;
  loading: boolean;
  onSelect: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-ctp-overlay1" />
      </div>
    );
  }

  if (clis.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-ctp-overlay1">No AI CLIs detected</p>
        <p className="text-xs text-ctp-surface2">
          Install Claude Code, Codex, or Gemini CLI to start chatting.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3">
      <div className="flex flex-col items-center gap-2">
        <MessageSquare
          data-testid="chat-selector-icon"
          className="h-6 w-6 text-ctp-overlay1"
          strokeWidth={1.5}
        />
        <p className="text-sm text-ctp-overlay1">Choose an AI assistant</p>
      </div>
      <div className="flex flex-col gap-2">
        {clis.map((cli) => (
          <button
            key={cli.id}
            type="button"
            onClick={() => onSelect(cli.id)}
            className="flex items-center justify-center gap-2.5 rounded-lg border border-ctp-surface1 px-4 py-2.5 text-sm text-ctp-text transition-colors hover:border-ctp-mauve hover:bg-ctp-surface0"
          >
            {cli.icon && (
              <img
                src={cli.icon}
                alt={cli.displayName}
                className="h-4 w-4 shrink-0"
              />
            )}
            <span>{cli.displayName}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
