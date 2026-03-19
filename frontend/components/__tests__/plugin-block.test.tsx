import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PluginBlock } from "../blocks/plugin-block";
import type { BlockConfig } from "@/lib/block-registry";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
}));

vi.mock("@/components/plugin-host", () => ({
  PluginHost: ({ pluginName }: { pluginName: string }) => (
    <div data-testid="plugin-host">{pluginName}</div>
  ),
}));

describe("PluginBlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the plugin host when pluginName is provided", () => {
    const config: BlockConfig = { type: "plugin", pluginName: "test-plugin" };
    render(<PluginBlock config={config} />);
    expect(screen.getByTestId("plugin-host")).toHaveTextContent("test-plugin");
  });

  it("renders fallback when no pluginName is given", () => {
    const config: BlockConfig = { type: "plugin" };
    render(<PluginBlock config={config} />);
    expect(screen.getByText(/No plugin specified/)).toBeInTheDocument();
  });
});
