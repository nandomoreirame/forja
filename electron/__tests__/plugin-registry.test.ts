import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchRegistry, clearRegistryCache, clearFallbackCache } from "../plugins/plugin-registry.js";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const validRegistryResponse = {
  version: 1,
  plugins: [
    {
      name: "forja-plugin-pomodoro",
      displayName: "Pomodoro Timer",
      description: "A simple pomodoro timer",
      author: "nandomoreira",
      icon: "Timer",
      version: "1.0.0",
      downloadUrl:
        "https://github.com/nandomoreirame/forja-plugins/releases/download/v1.0.0/forja-plugin-pomodoro-1.0.0.tar.gz",
      sha256: "",
      tags: ["productivity"],
      downloads: 100,
      permissions: ["notifications"] as const,
    },
  ],
};

describe("plugin-registry", () => {
  beforeEach(() => {
    clearRegistryCache();
    clearFallbackCache();
    mockFetch.mockReset();
  });

  describe("fetchRegistry", () => {
    it("fetches and returns valid registry data", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(validRegistryResponse),
      });

      const result = await fetchRegistry("https://example.com/registry.json");
      expect(result.plugins).toHaveLength(1);
      expect(result.plugins[0].name).toBe("forja-plugin-pomodoro");
    });

    it("uses cached data on subsequent calls within TTL", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(validRegistryResponse),
      });

      await fetchRegistry("https://example.com/registry.json");
      const result = await fetchRegistry("https://example.com/registry.json");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.plugins).toHaveLength(1);
    });

    it("re-fetches after cache is cleared", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(validRegistryResponse),
      });

      await fetchRegistry("https://example.com/registry.json");
      clearRegistryCache();
      await fetchRegistry("https://example.com/registry.json");

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("throws on network error when no cache exists", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(fetchRegistry("https://example.com/registry.json")).rejects.toThrow(
        "Network error"
      );
    });

    it("returns stale cache on network error (offline fallback)", async () => {
      // First successful fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(validRegistryResponse),
      });
      await fetchRegistry("https://example.com/registry.json");

      // Clear cache timing but keep the data for offline fallback
      clearRegistryCache();

      // Second fetch fails
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      const result = await fetchRegistry("https://example.com/registry.json");
      expect(result.plugins).toHaveLength(1);
    });

    it("throws on HTTP error with no fallback", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      await expect(fetchRegistry("https://example.com/registry.json")).rejects.toThrow("500");
    });

    it("throws on invalid registry data", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: true }),
      });

      await expect(fetchRegistry("https://example.com/registry.json")).rejects.toThrow();
    });
  });
});
