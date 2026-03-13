import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
}));

// Mock the MarketplacePluginCard to keep tests focused on MarketplacePane
vi.mock("../components/marketplace-plugin-card", () => ({
  MarketplacePluginCard: ({ plugin, installed }: { plugin: { name: string; displayName: string }; installed: boolean }) => (
    <div data-testid={`plugin-card-${plugin.name}`} data-installed={installed}>
      {plugin.displayName}
    </div>
  ),
}));

import { MarketplacePane } from "../components/marketplace-pane";
import { useMarketplaceStore } from "../stores/marketplace";
import { usePluginsStore } from "../stores/plugins";
import type { RegistryData } from "@/lib/plugin-types";

const mockRegistry: RegistryData = {
  version: 1,
  plugins: [
    {
      name: "forja-plugin-pomodoro",
      displayName: "Pomodoro Timer",
      description: "A simple pomodoro timer for focus sessions",
      author: "nandomoreira",
      icon: "Timer",
      version: "1.0.0",
      downloadUrl: "https://example.com/pomodoro.tar.gz",
      sha256: "",
      tags: ["productivity", "timer"],
      downloads: 150,
      permissions: ["notifications"],
    },
    {
      name: "forja-plugin-tasks",
      displayName: "Tasks Manager",
      description: "Track and manage project tasks",
      author: "nandomoreira",
      icon: "ListTodo",
      version: "2.0.0",
      downloadUrl: "https://example.com/tasks.tar.gz",
      sha256: "",
      tags: ["productivity", "tasks"],
      downloads: 200,
      permissions: ["project.active"],
    },
  ],
};

const defaultMarketplaceState = {
  registry: null,
  loading: false,
  error: null,
  searchQuery: "",
  activeTag: null,
  installProgress: {},
  fetchRegistry: vi.fn(),
  setSearchQuery: vi.fn(),
  setActiveTag: vi.fn(),
  installPlugin: vi.fn(),
  uninstallPlugin: vi.fn(),
  setInstallProgress: vi.fn(),
  getFilteredPlugins: vi.fn(() => []),
  getAllTags: vi.fn(() => []),
};

const defaultPluginsState = {
  plugins: [],
  pluginOrder: [],
  activePluginName: null,
  pinnedPluginName: null,
  pluginBadges: {},
  loading: false,
  permissionPrompt: null,
  activePluginNameByProject: {},
};

describe("MarketplacePane", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMarketplaceStore.setState({
      ...defaultMarketplaceState,
      registry: null,
      loading: false,
      error: null,
      searchQuery: "",
      activeTag: null,
      installProgress: {},
    });
    usePluginsStore.setState(defaultPluginsState);
  });

  it("renders Marketplace header title", () => {
    render(<MarketplacePane />);
    expect(screen.getByText("Marketplace")).toBeTruthy();
  });

  it("renders search input with placeholder", () => {
    render(<MarketplacePane />);
    const input = screen.getByPlaceholderText(/search plugins/i);
    expect(input).toBeTruthy();
  });

  it("renders refresh button with RotateCw icon", () => {
    render(<MarketplacePane />);
    const refreshBtn = screen.getByLabelText(/refresh/i);
    expect(refreshBtn).toBeTruthy();
  });

  it("shows loading spinner when loading is true", () => {
    useMarketplaceStore.setState({ loading: true });
    render(<MarketplacePane />);
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeTruthy();
  });

  it("does not show plugin list while loading", () => {
    useMarketplaceStore.setState({ loading: true });
    render(<MarketplacePane />);
    expect(screen.queryByText("Installed")).toBeNull();
    expect(screen.queryByText("Available")).toBeNull();
  });

  it("shows error message when error is set", () => {
    useMarketplaceStore.setState({ error: "Network error", loading: false });
    render(<MarketplacePane />);
    expect(screen.getByText(/network error/i)).toBeTruthy();
  });

  it("shows retry button when error is set", () => {
    useMarketplaceStore.setState({ error: "Network error", loading: false });
    render(<MarketplacePane />);
    const retryBtn = screen.getByRole("button", { name: /retry/i });
    expect(retryBtn).toBeTruthy();
  });

  it("renders Installed section with installed plugins", () => {
    useMarketplaceStore.setState({
      registry: mockRegistry,
      loading: false,
      error: null,
      getFilteredPlugins: () => mockRegistry.plugins,
      getAllTags: () => ["productivity", "timer", "tasks"],
    });
    usePluginsStore.setState({
      ...defaultPluginsState,
      plugins: [
        {
          manifest: {
            name: "forja-plugin-pomodoro",
            version: "1.0.0",
            displayName: "Pomodoro Timer",
            description: "A timer",
            author: "nandomoreira",
            icon: "Timer",
            entry: "index.html",
            permissions: [],
          },
          path: "/plugins/pomodoro",
          entryUrl: "file:///plugins/pomodoro/index.html",
          enabled: true,
        },
      ],
    });
    render(<MarketplacePane />);
    expect(screen.getByText(/^Installed/)).toBeTruthy();
  });

  it("renders Available section with non-installed plugins", () => {
    useMarketplaceStore.setState({
      registry: mockRegistry,
      loading: false,
      error: null,
      getFilteredPlugins: () => mockRegistry.plugins,
      getAllTags: () => ["productivity", "timer", "tasks"],
    });
    usePluginsStore.setState(defaultPluginsState);
    render(<MarketplacePane />);
    expect(screen.getByText(/^Available/)).toBeTruthy();
  });

  it("renders tag filter chips from registry getAllTags", () => {
    useMarketplaceStore.setState({
      registry: mockRegistry,
      loading: false,
      error: null,
      getAllTags: () => ["productivity", "timer", "tasks"],
      getFilteredPlugins: () => [],
    });
    render(<MarketplacePane />);
    expect(screen.getByRole("button", { name: "productivity" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "timer" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "tasks" })).toBeTruthy();
  });

  it("renders All chip by default and it appears selected", () => {
    useMarketplaceStore.setState({
      registry: mockRegistry,
      loading: false,
      error: null,
      activeTag: null,
      getAllTags: () => ["productivity"],
      getFilteredPlugins: () => [],
    });
    render(<MarketplacePane />);
    const allChip = screen.getByRole("button", { name: "All" });
    expect(allChip).toBeTruthy();
    // All chip should have active styling (bg-ctp-mauve class)
    expect(allChip.className).toContain("ctp-mauve");
  });

  it("calls setSearchQuery on search input change", async () => {
    const mockSetSearchQuery = vi.fn();
    useMarketplaceStore.setState({
      setSearchQuery: mockSetSearchQuery,
      getAllTags: () => [],
      getFilteredPlugins: () => [],
    });
    render(<MarketplacePane />);
    const input = screen.getByPlaceholderText(/search plugins/i);
    fireEvent.change(input, { target: { value: "pomodoro" } });
    await waitFor(() => {
      expect(mockSetSearchQuery).toHaveBeenCalledWith("pomodoro");
    }, { timeout: 500 });
  });

  it("shows No plugins found when filtered list is empty and registry is loaded", () => {
    useMarketplaceStore.setState({
      registry: mockRegistry,
      loading: false,
      error: null,
      getFilteredPlugins: () => [],
      getAllTags: () => [],
      searchQuery: "nonexistent",
    });
    render(<MarketplacePane />);
    expect(screen.getByText(/no plugins found/i)).toBeTruthy();
  });

  it("calls fetchRegistry on mount", async () => {
    const mockFetchRegistry = vi.fn().mockResolvedValue(undefined);
    useMarketplaceStore.setState({
      fetchRegistry: mockFetchRegistry,
      getAllTags: () => [],
      getFilteredPlugins: () => [],
    });
    render(<MarketplacePane />);
    await waitFor(() => {
      expect(mockFetchRegistry).toHaveBeenCalledOnce();
    });
  });

  it("calls fetchRegistry when refresh button is clicked", async () => {
    const mockFetchRegistry = vi.fn().mockResolvedValue(undefined);
    useMarketplaceStore.setState({
      fetchRegistry: mockFetchRegistry,
      getAllTags: () => [],
      getFilteredPlugins: () => [],
    });
    render(<MarketplacePane />);
    const refreshBtn = screen.getByLabelText(/refresh/i);
    await act(async () => {
      fireEvent.click(refreshBtn);
    });
    expect(mockFetchRegistry).toHaveBeenCalledTimes(2); // once on mount, once on click
  });

  it("clicking a tag chip calls setActiveTag with that tag", () => {
    const mockSetActiveTag = vi.fn();
    useMarketplaceStore.setState({
      registry: mockRegistry,
      activeTag: null,
      loading: false,
      error: null,
      setActiveTag: mockSetActiveTag,
      getAllTags: () => ["productivity", "timer"],
      getFilteredPlugins: () => [],
    });
    render(<MarketplacePane />);
    fireEvent.click(screen.getByRole("button", { name: "productivity" }));
    expect(mockSetActiveTag).toHaveBeenCalledWith("productivity");
  });

  it("clicking active tag chip calls setActiveTag with null to deselect", () => {
    const mockSetActiveTag = vi.fn();
    useMarketplaceStore.setState({
      registry: mockRegistry,
      activeTag: "productivity",
      loading: false,
      error: null,
      setActiveTag: mockSetActiveTag,
      getAllTags: () => ["productivity", "timer"],
      getFilteredPlugins: () => [],
    });
    render(<MarketplacePane />);
    fireEvent.click(screen.getByRole("button", { name: "productivity" }));
    expect(mockSetActiveTag).toHaveBeenCalledWith(null);
  });

  it("shows correct installed/available count in section headers", () => {
    useMarketplaceStore.setState({
      registry: mockRegistry,
      loading: false,
      error: null,
      getFilteredPlugins: () => mockRegistry.plugins,
      getAllTags: () => [],
    });
    usePluginsStore.setState({
      ...defaultPluginsState,
      plugins: [
        {
          manifest: {
            name: "forja-plugin-pomodoro",
            version: "1.0.0",
            displayName: "Pomodoro Timer",
            description: "A timer",
            author: "nandomoreira",
            icon: "Timer",
            entry: "index.html",
            permissions: [],
          },
          path: "/plugins/pomodoro",
          entryUrl: "file:///plugins/pomodoro/index.html",
          enabled: true,
        },
      ],
    });
    render(<MarketplacePane />);
    // 1 installed, 1 available
    expect(screen.getByText("Installed (1)")).toBeTruthy();
    expect(screen.getByText("Available (1)")).toBeTruthy();
  });

  it("does not show Installed section when there are no installed registry plugins", () => {
    useMarketplaceStore.setState({
      registry: mockRegistry,
      loading: false,
      error: null,
      getFilteredPlugins: () => mockRegistry.plugins,
      getAllTags: () => [],
    });
    usePluginsStore.setState(defaultPluginsState);
    render(<MarketplacePane />);
    expect(screen.queryByText(/Installed \(/)).toBeNull();
  });
});
