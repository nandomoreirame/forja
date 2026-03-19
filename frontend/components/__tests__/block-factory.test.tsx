import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { blockFactory } from "../block-factory";
import type { TabNode } from "flexlayout-react";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
}));

vi.mock("@/components/blocks/terminal-block", () => ({
  TerminalBlock: ({ config }: { config: { sessionType?: string } }) => (
    <div data-testid="terminal-block">terminal:{config.sessionType}</div>
  ),
}));

vi.mock("@/components/blocks/file-preview-block", () => ({
  FilePreviewBlock: () => <div data-testid="file-preview-block">preview</div>,
}));

vi.mock("@/components/blocks/browser-block", () => ({
  BrowserBlock: () => <div data-testid="browser-block">browser</div>,
}));

vi.mock("@/components/blocks/plugin-block", () => ({
  PluginBlock: ({ config }: { config: { pluginName?: string } }) => (
    <div data-testid="plugin-block">plugin:{config.pluginName}</div>
  ),
}));

vi.mock("@/components/blocks/file-tree-block", () => ({
  FileTreeBlock: () => <div data-testid="file-tree-block">filetree</div>,
}));

vi.mock("@/components/blocks/agent-chat-block", () => ({
  AgentChatBlock: () => <div data-testid="agent-chat-block">chat</div>,
}));

vi.mock("@/components/blocks/marketplace-block", () => ({
  MarketplaceBlock: () => (
    <div data-testid="marketplace-block">marketplace</div>
  ),
}));

vi.mock("@/stores/projects", () => ({
  useProjectsStore: {
    getState: () => ({ activeProjectPath: "/test-project" }),
  },
}));

function createMockTabNode(
  component: string,
  config?: Record<string, unknown>,
): TabNode {
  return {
    getComponent: () => component,
    getConfig: () => config ?? { type: component },
    getId: () => `test-node-${component}`,
  } as unknown as TabNode;
}

describe("blockFactory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders TerminalBlock for terminal component", () => {
    const node = createMockTabNode("terminal", {
      type: "terminal",
      sessionType: "claude",
    });
    const element = blockFactory(node);
    render(<>{element}</>);
    expect(screen.getByTestId("terminal-block")).toHaveTextContent(
      "terminal:claude",
    );
  });

  it("renders FilePreviewBlock for file-preview component", () => {
    const node = createMockTabNode("file-preview");
    const element = blockFactory(node);
    render(<>{element}</>);
    expect(screen.getByTestId("file-preview-block")).toBeInTheDocument();
  });

  it("renders BrowserBlock for browser component", () => {
    const node = createMockTabNode("browser");
    const element = blockFactory(node);
    render(<>{element}</>);
    expect(screen.getByTestId("browser-block")).toBeInTheDocument();
  });

  it("renders PluginBlock for plugin component", () => {
    const node = createMockTabNode("plugin", {
      type: "plugin",
      pluginName: "test-plugin",
    });
    const element = blockFactory(node);
    render(<>{element}</>);
    expect(screen.getByTestId("plugin-block")).toHaveTextContent(
      "plugin:test-plugin",
    );
  });

  it("renders FileTreeBlock for file-tree component", () => {
    const node = createMockTabNode("file-tree");
    const element = blockFactory(node);
    render(<>{element}</>);
    expect(screen.getByTestId("file-tree-block")).toBeInTheDocument();
  });

  it("renders AgentChatBlock for agent-chat component", () => {
    const node = createMockTabNode("agent-chat");
    const element = blockFactory(node);
    render(<>{element}</>);
    expect(screen.getByTestId("agent-chat-block")).toBeInTheDocument();
  });

  it("renders MarketplaceBlock for marketplace component", () => {
    const node = createMockTabNode("marketplace");
    const element = blockFactory(node);
    render(<>{element}</>);
    expect(screen.getByTestId("marketplace-block")).toBeInTheDocument();
  });

  it("renders fallback for unknown component", () => {
    const node = createMockTabNode("unknown-component");
    const element = blockFactory(node);
    render(<>{element}</>);
    expect(screen.getByText(/Unknown block: unknown-component/)).toBeInTheDocument();
  });

  it("uses component type as fallback when config is null", () => {
    const node = {
      getComponent: () => "browser",
      getConfig: () => null,
      getId: () => "test-null-config",
    } as unknown as TabNode;
    const element = blockFactory(node);
    render(<>{element}</>);
    expect(screen.getByTestId("browser-block")).toBeInTheDocument();
  });
});
