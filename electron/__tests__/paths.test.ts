import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as path from "path";
import * as os from "os";

describe("paths", () => {
  const originalPlatform = process.platform;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
    process.env = originalEnv;
  });

  describe("getForjaConfigDir", () => {
    it("returns ~/.config/forja on Linux", async () => {
      Object.defineProperty(process, "platform", { value: "linux", configurable: true });
      const { getForjaConfigDir } = await import("../paths");
      expect(getForjaConfigDir()).toBe(path.join(os.homedir(), ".config", "forja"));
    });

    it("returns ~/.config/forja on macOS", async () => {
      Object.defineProperty(process, "platform", { value: "darwin", configurable: true });
      const { getForjaConfigDir } = await import("../paths");
      expect(getForjaConfigDir()).toBe(path.join(os.homedir(), ".config", "forja"));
    });

    it("returns %APPDATA%/forja on Windows", async () => {
      Object.defineProperty(process, "platform", { value: "win32", configurable: true });
      process.env.APPDATA = path.join("C:", "Users", "test", "AppData", "Roaming");

      const { getForjaConfigDir } = await import("../paths");
      expect(getForjaConfigDir()).toBe(
        path.join("C:", "Users", "test", "AppData", "Roaming", "forja")
      );
    });

    it("falls back to ~/AppData/Roaming/forja on Windows without APPDATA", async () => {
      Object.defineProperty(process, "platform", { value: "win32", configurable: true });
      delete process.env.APPDATA;

      const { getForjaConfigDir } = await import("../paths");
      expect(getForjaConfigDir()).toBe(
        path.join(os.homedir(), "AppData", "Roaming", "forja")
      );
    });
  });

  describe("getForjaSettingsPath", () => {
    it("returns config dir + settings.json", async () => {
      Object.defineProperty(process, "platform", { value: "linux", configurable: true });
      const { getForjaSettingsPath } = await import("../paths");
      expect(getForjaSettingsPath()).toBe(
        path.join(os.homedir(), ".config", "forja", "settings.json")
      );
    });
  });

  describe("getForjaContextDir", () => {
    it("returns config dir + context", async () => {
      Object.defineProperty(process, "platform", { value: "linux", configurable: true });
      const { getForjaContextDir } = await import("../paths");
      expect(getForjaContextDir()).toBe(
        path.join(os.homedir(), ".config", "forja", "context")
      );
    });
  });

  describe("getForjaPluginsDir", () => {
    it("returns config dir + plugins", async () => {
      Object.defineProperty(process, "platform", { value: "linux", configurable: true });
      const { getForjaPluginsDir } = await import("../paths");
      expect(getForjaPluginsDir()).toBe(
        path.join(os.homedir(), ".config", "forja", "plugins")
      );
    });
  });
});
