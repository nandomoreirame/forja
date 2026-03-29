import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
}));

import { useMarketplaceStore } from "../stores/marketplace";
import { invoke } from "@/lib/ipc";
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
      version: "1.0.0",
      downloadUrl: "https://example.com/tasks.tar.gz",
      sha256: "",
      tags: ["productivity", "tasks"],
      downloads: 200,
      permissions: ["project.active"],
    },
  ],
};

describe("marketplace store", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useMarketplaceStore.setState({
      registry: null,
      loading: false,
      error: null,
      searchQuery: "",
      activeTag: null,
      installProgress: {},
    });
  });

  describe("fetchRegistry", () => {
    it("fetches and stores registry data", async () => {
      vi.mocked(invoke).mockResolvedValueOnce(mockRegistry);

      await useMarketplaceStore.getState().fetchRegistry();

      const state = useMarketplaceStore.getState();
      expect(state.registry).toEqual(mockRegistry);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(invoke).toHaveBeenCalledWith("plugin:fetch-registry");
    });

    it("sets loading state during fetch", async () => {
      let resolvePromise: (v: unknown) => void;
      const promise = new Promise((resolve) => { resolvePromise = resolve; });
      vi.mocked(invoke).mockReturnValueOnce(promise as any);

      const fetchPromise = useMarketplaceStore.getState().fetchRegistry();
      expect(useMarketplaceStore.getState().loading).toBe(true);

      resolvePromise!(mockRegistry);
      await fetchPromise;
      expect(useMarketplaceStore.getState().loading).toBe(false);
    });

    it("handles fetch error", async () => {
      vi.mocked(invoke).mockRejectedValueOnce(new Error("Network error"));

      await useMarketplaceStore.getState().fetchRegistry();

      const state = useMarketplaceStore.getState();
      expect(state.error).toBe("Network error");
      expect(state.loading).toBe(false);
    });
  });

  describe("search filtering", () => {
    it("filters plugins by name", () => {
      useMarketplaceStore.setState({ registry: mockRegistry, searchQuery: "pomodoro" });
      const filtered = useMarketplaceStore.getState().getFilteredPlugins();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe("forja-plugin-pomodoro");
    });

    it("filters plugins by description", () => {
      useMarketplaceStore.setState({ registry: mockRegistry, searchQuery: "manage" });
      const filtered = useMarketplaceStore.getState().getFilteredPlugins();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe("forja-plugin-tasks");
    });

    it("filters plugins by tag", () => {
      useMarketplaceStore.setState({ registry: mockRegistry, activeTag: "timer" });
      const filtered = useMarketplaceStore.getState().getFilteredPlugins();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe("forja-plugin-pomodoro");
    });

    it("combines search query and tag filter", () => {
      useMarketplaceStore.setState({
        registry: mockRegistry,
        searchQuery: "pomodoro",
        activeTag: "timer",
      });
      const filtered = useMarketplaceStore.getState().getFilteredPlugins();
      expect(filtered).toHaveLength(1);
    });

    it("returns all plugins when no filters active", () => {
      useMarketplaceStore.setState({ registry: mockRegistry });
      const filtered = useMarketplaceStore.getState().getFilteredPlugins();
      expect(filtered).toHaveLength(2);
    });

    it("returns empty array when registry is null", () => {
      const filtered = useMarketplaceStore.getState().getFilteredPlugins();
      expect(filtered).toHaveLength(0);
    });
  });

  describe("install/uninstall", () => {
    it("calls IPC to install plugin and reloads plugins", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      await useMarketplaceStore.getState().installPlugin("test-plugin");

      expect(invoke).toHaveBeenCalledWith("plugin:install", { name: "test-plugin" });
    });

    it("calls IPC to uninstall plugin", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      await useMarketplaceStore.getState().uninstallPlugin("test-plugin");

      expect(invoke).toHaveBeenCalledWith("plugin:uninstall", { name: "test-plugin" });
    });

    it("tracks install progress per plugin", () => {
      useMarketplaceStore.getState().setInstallProgress("test-plugin", { stage: "downloading", percent: 50 });
      expect(useMarketplaceStore.getState().installProgress["test-plugin"]).toEqual({
        stage: "downloading",
        percent: 50,
      });
    });
  });

  describe("setSearchQuery", () => {
    it("updates search query", () => {
      useMarketplaceStore.getState().setSearchQuery("hello");
      expect(useMarketplaceStore.getState().searchQuery).toBe("hello");
    });
  });

  describe("setActiveTag", () => {
    it("updates active tag", () => {
      useMarketplaceStore.getState().setActiveTag("productivity");
      expect(useMarketplaceStore.getState().activeTag).toBe("productivity");
    });

    it("clears active tag with null", () => {
      useMarketplaceStore.setState({ activeTag: "old" });
      useMarketplaceStore.getState().setActiveTag(null);
      expect(useMarketplaceStore.getState().activeTag).toBeNull();
    });
  });

  describe("getAllTags", () => {
    it("returns unique tags from all plugins", () => {
      useMarketplaceStore.setState({ registry: mockRegistry });
      const tags = useMarketplaceStore.getState().getAllTags();
      expect(tags).toContain("productivity");
      expect(tags).toContain("timer");
      expect(tags).toContain("tasks");
      // No duplicates
      expect(new Set(tags).size).toBe(tags.length);
    });

    it("returns empty array when no registry", () => {
      const tags = useMarketplaceStore.getState().getAllTags();
      expect(tags).toHaveLength(0);
    });
  });
});
