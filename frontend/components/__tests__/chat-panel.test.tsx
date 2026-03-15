import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockStartSession = vi.fn();
const mockSendMessage = vi.fn();
const mockCloseSession = vi.fn();
const mockTogglePanel = vi.fn();
const mockSwitchSession = vi.fn();

const mockChatState = {
  messages: [] as Array<{ id: string; role: string; content: string; timestamp: string }>,
  sessionId: null as string | null,
  cliId: null as string | null,
  status: "idle" as string,
  error: null as string | null,
  isPanelOpen: true,
  startSession: mockStartSession,
  sendMessage: mockSendMessage,
  closeSession: mockCloseSession,
  togglePanel: mockTogglePanel,
  switchSession: mockSwitchSession,
  addAssistantMessage: vi.fn(),
  clearMessages: vi.fn(),
};

vi.mock("@/stores/agent-chat", () => ({
  useAgentChatStore: Object.assign(() => mockChatState, {
    getState: () => mockChatState,
    setState: vi.fn(),
    subscribe: vi.fn(() => () => {}),
  }),
}));

vi.mock("@/hooks/use-installed-clis", () => ({
  useInstalledClis: () => ({
    installedClis: [
      {
        id: "claude",
        displayName: "Claude Code",
        binary: "claude",
        icon: "./images/claude.svg",
        iconColor: "text-brand",
        description: "AI-assisted coding with Anthropic Claude",
        chatSupported: true,
      },
      {
        id: "gemini",
        displayName: "Gemini CLI",
        binary: "gemini",
        icon: "./images/gemini.svg",
        iconColor: "text-ctp-blue",
        description: "AI-assisted coding with Google Gemini",
        chatSupported: true,
      },
      {
        id: "opencode",
        displayName: "OpenCode",
        binary: "opencode",
        icon: "./images/opencode.svg",
        iconColor: "text-ctp-teal",
        description: "Open source AI coding agent",
        chatSupported: false,
      },
    ],
    loading: false,
  }),
}));

vi.mock("@/hooks/use-agent-chat", () => ({
  useAgentChatEvents: vi.fn(),
}));

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

import { ChatPanel } from "../chat-panel";

describe("ChatPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChatState.messages = [];
    mockChatState.sessionId = null;
    mockChatState.cliId = null;
    mockChatState.status = "idle";
    mockChatState.error = null;
    mockChatState.isPanelOpen = true;
  });

  it("renders when panel is open", () => {
    render(<ChatPanel />);
    expect(screen.getByTestId("chat-panel")).toBeDefined();
  });

  it("renders without projectPath", () => {
    render(<ChatPanel />);
    expect(screen.getByTestId("chat-panel")).toBeDefined();
    expect(screen.getByText("Claude Code")).toBeDefined();
  });

  it("shows CLI selector when no session active", () => {
    render(<ChatPanel />);
    expect(screen.getByText("Claude Code")).toBeDefined();
    expect(screen.getByText("Gemini CLI")).toBeDefined();
  });

  it("hides CLIs that do not support chat from selector", () => {
    render(<ChatPanel />);
    expect(screen.queryByText("OpenCode")).toBeNull();
  });

  it("shows MessageSquare icon above the Choose an AI assistant text", () => {
    render(<ChatPanel />);
    const icon = screen.getByTestId("chat-selector-icon");
    expect(icon).toBeDefined();
    expect(screen.getByText("Choose an AI assistant")).toBeDefined();
  });

  it("shows CLI icons in selector buttons", () => {
    render(<ChatPanel />);
    const claudeIcon = screen.getByAltText("Claude Code");
    expect(claudeIcon).toBeDefined();
    expect((claudeIcon as HTMLImageElement).src).toContain("claude.svg");

    const geminiIcon = screen.getByAltText("Gemini CLI");
    expect(geminiIcon).toBeDefined();
    expect((geminiIcon as HTMLImageElement).src).toContain("gemini.svg");
  });

  it("starts session with projectPath when provided", () => {
    render(<ChatPanel projectPath="/project" />);
    const claudeBtn = screen.getByText("Claude Code");
    fireEvent.click(claudeBtn);
    expect(mockStartSession).toHaveBeenCalledWith("claude", "/project");
  });

  it("starts session without projectPath when not provided", () => {
    render(<ChatPanel />);
    const claudeBtn = screen.getByText("Claude Code");
    fireEvent.click(claudeBtn);
    expect(mockStartSession).toHaveBeenCalledWith("claude");
  });

  it("shows message input when session is active", () => {
    mockChatState.sessionId = "s1";
    mockChatState.cliId = "claude";
    mockChatState.status = "ready";

    render(<ChatPanel />);
    expect(screen.getByPlaceholderText(/message/i)).toBeDefined();
  });

  it("renders user and assistant messages", () => {
    mockChatState.sessionId = "s1";
    mockChatState.cliId = "claude";
    mockChatState.status = "ready";
    mockChatState.messages = [
      { id: "m1", role: "user", content: "Hello", timestamp: "2026-01-01" },
      { id: "m2", role: "assistant", content: "Hi there!", timestamp: "2026-01-01" },
    ];

    render(<ChatPanel />);
    expect(screen.getByText("Hello")).toBeDefined();
    expect(screen.getByText("Hi there!")).toBeDefined();
  });

  it("does not render a redundant close button (close via tab X)", () => {
    render(<ChatPanel />);
    expect(screen.queryByLabelText("Close chat panel")).toBeNull();
  });

  it("shows error when present", () => {
    mockChatState.error = "Connection failed";
    render(<ChatPanel />);
    expect(screen.getByText("Connection failed")).toBeDefined();
  });

  describe("input toolbar", () => {
    beforeEach(() => {
      mockChatState.sessionId = "s1";
      mockChatState.cliId = "claude";
      mockChatState.status = "ready";
    });

    it("shows slash button in toolbar when session is active", () => {
      render(<ChatPanel />);
      const slashBtn = screen.getByLabelText("Insert slash command");
      expect(slashBtn).toBeDefined();
    });

    it("slash button inserts / into textarea and opens slash menu", () => {
      render(<ChatPanel />);
      const slashBtn = screen.getByLabelText("Insert slash command");
      fireEvent.click(slashBtn);
      const textarea = screen.getByPlaceholderText(/message/i) as HTMLTextAreaElement;
      expect(textarea.value).toBe("/");
      expect(screen.getByTestId("slash-command-menu")).toBeDefined();
    });

    it("shows CLI switcher button with current CLI name when session is active", () => {
      render(<ChatPanel />);
      const switcherBtn = screen.getByLabelText("Switch AI agent");
      expect(switcherBtn).toBeDefined();
      expect(switcherBtn.textContent).toContain("Claude Code");
    });

    it("CLI switcher button opens dropdown with other installed chat CLIs", () => {
      render(<ChatPanel />);
      const switcherBtn = screen.getByLabelText("Switch AI agent");
      fireEvent.click(switcherBtn);
      expect(screen.getByTestId("cli-switcher-dropdown")).toBeDefined();
      expect(screen.getByText("Gemini CLI")).toBeDefined();
    });

    it("CLI switcher dropdown does not show current CLI", () => {
      render(<ChatPanel />);
      const switcherBtn = screen.getByLabelText("Switch AI agent");
      fireEvent.click(switcherBtn);
      expect(screen.queryByTestId("cli-switcher-item-claude")).toBeNull();
    });

    it("clicking a CLI in dropdown calls switchSession", () => {
      render(<ChatPanel />);
      const switcherBtn = screen.getByLabelText("Switch AI agent");
      fireEvent.click(switcherBtn);
      const geminiItem = screen.getByTestId("cli-switcher-item-gemini");
      fireEvent.click(geminiItem);
      expect(mockSwitchSession).toHaveBeenCalledWith("gemini");
    });

    it("CLI switcher dropdown closes after selecting a CLI", () => {
      render(<ChatPanel />);
      const switcherBtn = screen.getByLabelText("Switch AI agent");
      fireEvent.click(switcherBtn);
      const geminiItem = screen.getByTestId("cli-switcher-item-gemini");
      fireEvent.click(geminiItem);
      expect(screen.queryByTestId("cli-switcher-dropdown")).toBeNull();
    });

    it("CLI switcher dropdown does not show CLIs that do not support chat", () => {
      render(<ChatPanel />);
      const switcherBtn = screen.getByLabelText("Switch AI agent");
      fireEvent.click(switcherBtn);
      expect(screen.queryByTestId("cli-switcher-item-opencode")).toBeNull();
    });

    it("toolbar is not shown when no session is active", () => {
      mockChatState.sessionId = null;
      mockChatState.cliId = null;
      render(<ChatPanel />);
      expect(screen.queryByLabelText("Insert slash command")).toBeNull();
      expect(screen.queryByLabelText("Switch AI agent")).toBeNull();
    });
  });

  describe("slash command menu", () => {
    beforeEach(() => {
      mockChatState.sessionId = "s1";
      mockChatState.cliId = "claude";
      mockChatState.status = "ready";
    });

    it("shows slash command menu when input starts with /", () => {
      render(<ChatPanel />);
      const textarea = screen.getByPlaceholderText(/message/i);
      fireEvent.change(textarea, { target: { value: "/" } });
      expect(screen.getByTestId("slash-command-menu")).toBeDefined();
    });

    it("hides slash command menu when input does not start with /", () => {
      render(<ChatPanel />);
      const textarea = screen.getByPlaceholderText(/message/i);
      fireEvent.change(textarea, { target: { value: "hello" } });
      expect(screen.queryByTestId("slash-command-menu")).toBeNull();
    });

    it("hides slash command menu on empty input", () => {
      render(<ChatPanel />);
      expect(screen.queryByTestId("slash-command-menu")).toBeNull();
    });

    it("closes menu when Escape is pressed", () => {
      render(<ChatPanel />);
      const textarea = screen.getByPlaceholderText(/message/i);
      fireEvent.change(textarea, { target: { value: "/" } });
      expect(screen.getByTestId("slash-command-menu")).toBeDefined();
      fireEvent.keyDown(textarea, { key: "Escape" });
      expect(screen.queryByTestId("slash-command-menu")).toBeNull();
    });

    it("does not show menu when no session active", () => {
      mockChatState.sessionId = null;
      render(<ChatPanel />);
      expect(screen.queryByPlaceholderText(/message/i)).toBeNull();
      expect(screen.queryByTestId("slash-command-menu")).toBeNull();
    });

    it("ArrowDown navigates to next item in slash menu", () => {
      render(<ChatPanel />);
      const textarea = screen.getByPlaceholderText(/message/i);
      fireEvent.change(textarea, { target: { value: "/" } });

      fireEvent.keyDown(textarea, { key: "ArrowDown" });

      const items = screen.getAllByRole("option");
      expect(items[1]).toHaveAttribute("aria-selected", "true");
    });

    it("ArrowUp navigates to previous item in slash menu", () => {
      render(<ChatPanel />);
      const textarea = screen.getByPlaceholderText(/message/i);
      fireEvent.change(textarea, { target: { value: "/" } });

      fireEvent.keyDown(textarea, { key: "ArrowDown" });
      fireEvent.keyDown(textarea, { key: "ArrowUp" });

      const items = screen.getAllByRole("option");
      expect(items[0]).toHaveAttribute("aria-selected", "true");
    });

    it("Enter selects highlighted item and sends command", () => {
      render(<ChatPanel />);
      const textarea = screen.getByPlaceholderText(/message/i);
      fireEvent.change(textarea, { target: { value: "/" } });

      fireEvent.keyDown(textarea, { key: "Enter" });

      expect(mockSendMessage).toHaveBeenCalledWith("/context init");
    });

    it("Enter after ArrowDown selects second item", () => {
      render(<ChatPanel />);
      const textarea = screen.getByPlaceholderText(/message/i);
      fireEvent.change(textarea, { target: { value: "/" } });

      fireEvent.keyDown(textarea, { key: "ArrowDown" });
      fireEvent.keyDown(textarea, { key: "Enter" });

      expect(mockSendMessage).toHaveBeenCalledWith("/context status");
    });
  });
});
