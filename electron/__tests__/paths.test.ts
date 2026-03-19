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
    process.env = { ...originalEnv };
  });

  describe("getForjaConfigDir", () => {
    it("returns ~/.config/forja on Linux in production", async () => {
      Object.defineProperty(process, "platform", { value: "linux", configurable: true });
      delete process.env.FORJA_DEV_MODE;
      const { getForjaConfigDir } = await import("../paths");
      expect(getForjaConfigDir()).toBe(path.join(os.homedir(), ".config", "forja"));
    });

    it("returns ~/.config/forja-dev on Linux in dev mode", async () => {
      Object.defineProperty(process, "platform", { value: "linux", configurable: true });
      process.env.FORJA_DEV_MODE = "1";
      const { getForjaConfigDir } = await import("../paths");
      expect(getForjaConfigDir()).toBe(path.join(os.homedir(), ".config", "forja-dev"));
    });

    it("returns ~/.config/forja on macOS in production", async () => {
      Object.defineProperty(process, "platform", { value: "darwin", configurable: true });
      delete process.env.FORJA_DEV_MODE;
      const { getForjaConfigDir } = await import("../paths");
      expect(getForjaConfigDir()).toBe(path.join(os.homedir(), ".config", "forja"));
    });

    it("returns ~/.config/forja-dev on macOS in dev mode", async () => {
      Object.defineProperty(process, "platform", { value: "darwin", configurable: true });
      process.env.FORJA_DEV_MODE = "1";
      const { getForjaConfigDir } = await import("../paths");
      expect(getForjaConfigDir()).toBe(path.join(os.homedir(), ".config", "forja-dev"));
    });

    it("returns %APPDATA%/forja on Windows in production", async () => {
      Object.defineProperty(process, "platform", { value: "win32", configurable: true });
      delete process.env.FORJA_DEV_MODE;
      process.env.APPDATA = path.join("C:", "Users", "test", "AppData", "Roaming");

      const { getForjaConfigDir } = await import("../paths");
      expect(getForjaConfigDir()).toBe(
        path.join("C:", "Users", "test", "AppData", "Roaming", "forja")
      );
    });

    it("returns %APPDATA%/forja-dev on Windows in dev mode", async () => {
      Object.defineProperty(process, "platform", { value: "win32", configurable: true });
      process.env.FORJA_DEV_MODE = "1";
      process.env.APPDATA = path.join("C:", "Users", "test", "AppData", "Roaming");

      const { getForjaConfigDir } = await import("../paths");
      expect(getForjaConfigDir()).toBe(
        path.join("C:", "Users", "test", "AppData", "Roaming", "forja-dev")
      );
    });

    it("falls back to ~/AppData/Roaming/forja on Windows without APPDATA", async () => {
      Object.defineProperty(process, "platform", { value: "win32", configurable: true });
      delete process.env.APPDATA;
      delete process.env.FORJA_DEV_MODE;

      const { getForjaConfigDir } = await import("../paths");
      expect(getForjaConfigDir()).toBe(
        path.join(os.homedir(), "AppData", "Roaming", "forja")
      );
    });
  });

  describe("getForjaSettingsPath", () => {
    it("returns forja/settings.json in production mode", async () => {
      Object.defineProperty(process, "platform", { value: "linux", configurable: true });
      delete process.env.FORJA_DEV_MODE;
      const { getForjaSettingsPath } = await import("../paths");
      expect(getForjaSettingsPath()).toBe(
        path.join(os.homedir(), ".config", "forja", "settings.json")
      );
    });

    it("returns forja-dev/settings.json in dev mode", async () => {
      Object.defineProperty(process, "platform", { value: "linux", configurable: true });
      process.env.FORJA_DEV_MODE = "1";
      const { getForjaSettingsPath } = await import("../paths");
      expect(getForjaSettingsPath()).toBe(
        path.join(os.homedir(), ".config", "forja-dev", "settings.json")
      );
    });
  });

  describe("getForjaConfigName", () => {
    it("returns 'config' always (directory isolation handles dev/prod)", async () => {
      delete process.env.FORJA_DEV_MODE;
      const { getForjaConfigName } = await import("../paths");
      expect(getForjaConfigName()).toBe("config");
    });

    it("returns 'config' in dev mode too", async () => {
      process.env.FORJA_DEV_MODE = "1";
      const { getForjaConfigName } = await import("../paths");
      expect(getForjaConfigName()).toBe("config");
    });
  });

  describe("getForjaContextDir", () => {
    it("returns forja/context in production", async () => {
      Object.defineProperty(process, "platform", { value: "linux", configurable: true });
      delete process.env.FORJA_DEV_MODE;
      const { getForjaContextDir } = await import("../paths");
      expect(getForjaContextDir()).toBe(
        path.join(os.homedir(), ".config", "forja", "context")
      );
    });

    it("returns forja-dev/context in dev mode", async () => {
      Object.defineProperty(process, "platform", { value: "linux", configurable: true });
      process.env.FORJA_DEV_MODE = "1";
      const { getForjaContextDir } = await import("../paths");
      expect(getForjaContextDir()).toBe(
        path.join(os.homedir(), ".config", "forja-dev", "context")
      );
    });
  });

  describe("getForjaPluginsDir", () => {
    it("returns forja/plugins in production mode", async () => {
      Object.defineProperty(process, "platform", { value: "linux", configurable: true });
      delete process.env.FORJA_DEV_MODE;
      const { getForjaPluginsDir } = await import("../paths");
      expect(getForjaPluginsDir()).toBe(
        path.join(os.homedir(), ".config", "forja", "plugins")
      );
    });

    it("returns forja-dev/plugins in dev mode", async () => {
      Object.defineProperty(process, "platform", { value: "linux", configurable: true });
      process.env.FORJA_DEV_MODE = "1";
      const { getForjaPluginsDir } = await import("../paths");
      expect(getForjaPluginsDir()).toBe(
        path.join(os.homedir(), ".config", "forja-dev", "plugins")
      );
    });
  });
});
