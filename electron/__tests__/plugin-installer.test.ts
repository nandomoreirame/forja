import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";

// Mock modules before imports
vi.mock("fs/promises");
vi.mock("../paths.js", () => ({
  getForjaPluginsDir: () => "/mock/plugins",
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import {
  installPlugin,
  uninstallPlugin,
  getInstalledVersions,
} from "../plugins/plugin-installer.js";
import type { RegistryPlugin } from "../plugins/types.js";

const samplePlugin: RegistryPlugin = {
  name: "test-plugin",
  displayName: "Test Plugin",
  description: "A test plugin",
  author: "test",
  icon: "Sparkles",
  version: "1.0.0",
  downloadUrl: "https://example.com/test-plugin-1.0.0.tar.gz",
  sha256: "",
  tags: ["test"],
  downloads: 0,
  permissions: [],
};

describe("plugin-installer", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockFetch.mockReset();
  });

  describe("getInstalledVersions", () => {
    it("returns map of installed plugin versions", async () => {
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: "my-plugin", isDirectory: () => true } as any,
      ]);
      vi.mocked(fs.readFile).mockResolvedValue(
        JSON.stringify({ name: "my-plugin", version: "1.2.0" })
      );
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      const versions = await getInstalledVersions();
      expect(versions.get("my-plugin")).toBe("1.2.0");
    });

    it("skips directories without valid manifests", async () => {
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: "bad-plugin", isDirectory: () => true } as any,
      ]);
      vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      const versions = await getInstalledVersions();
      expect(versions.size).toBe(0);
    });

    it("creates plugins dir if it does not exist", async () => {
      vi.mocked(fs.readdir).mockResolvedValue([]);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await getInstalledVersions();
      expect(fs.mkdir).toHaveBeenCalledWith("/mock/plugins", { recursive: true });
    });
  });

  describe("installPlugin", () => {
    it("throws on download failure", async () => {
      const progressEvents: any[] = [];
      mockFetch.mockRejectedValueOnce(new Error("Download failed"));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await expect(
        installPlugin(samplePlugin, (p) => progressEvents.push(p))
      ).rejects.toThrow("Download failed");
    });

    it("throws on checksum mismatch", async () => {
      const progressEvents: any[] = [];
      const pluginWithHash: RegistryPlugin = { ...samplePlugin, sha256: "abc123" };

      // Download returns some bytes
      const fakeBuffer = new ArrayBuffer(10);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(fakeBuffer),
        headers: { get: () => "10" },
      });

      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await expect(
        installPlugin(pluginWithHash, (p) => progressEvents.push(p))
      ).rejects.toThrow(/checksum/i);

      expect(progressEvents.some((p) => p.stage === "downloading")).toBe(true);
      expect(progressEvents.some((p) => p.stage === "verifying")).toBe(true);
    });

    it("reports progress stages in correct order", async () => {
      const progressEvents: any[] = [];

      // We can't easily test the full flow without real tar files,
      // so we test that download failure happens after downloading stage
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await expect(
        installPlugin(samplePlugin, (p) => progressEvents.push(p))
      ).rejects.toThrow();

      expect(progressEvents[0]).toEqual({ stage: "downloading", percent: 0 });
    });
  });

  describe("uninstallPlugin", () => {
    it("removes the plugin directory", async () => {
      vi.mocked(fs.rm).mockResolvedValue(undefined);

      await uninstallPlugin("test-plugin");
      expect(fs.rm).toHaveBeenCalledWith(
        path.join("/mock/plugins", "test-plugin"),
        { recursive: true, force: true }
      );
    });

    it("throws if removal fails", async () => {
      vi.mocked(fs.rm).mockRejectedValue(new Error("EPERM"));

      await expect(uninstallPlugin("test-plugin")).rejects.toThrow("EPERM");
    });
  });
});
