import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import * as path from "path";
import * as os from "os";
import { readFileSync, existsSync } from "fs";

// Mock fs/promises module
vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
}));

// Mock fs module (sync)
vi.mock("fs", () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

// Mock os module
vi.mock("os", () => ({
  totalmem: vi.fn(),
  homedir: vi.fn(() => "/home/testuser"),
}));

const GB = 1024 * 1024 * 1024;
const RAM_THRESHOLD_BYTES = 12 * GB;

describe("lite-mode module", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("detectPerformanceMode", () => {
    it("returns 'lite' when RAM < 12GB and mode is auto (mock os.totalmem to 8GB)", async () => {
      const fsp = await import("fs/promises");
      const osMod = await import("os");

      // File read fails (no settings file)
      vi.mocked(fsp.readFile).mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));
      vi.mocked(osMod.totalmem).mockReturnValue(8 * GB);

      const { detectPerformanceMode } = await import("../lite-mode.js");
      const result = await detectPerformanceMode();

      expect(result).toBe("lite");
    });

    it("returns 'full' when RAM >= 12GB and mode is auto (mock os.totalmem to 16GB)", async () => {
      const fsp = await import("fs/promises");
      const osMod = await import("os");

      vi.mocked(fsp.readFile).mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));
      vi.mocked(osMod.totalmem).mockReturnValue(16 * GB);

      const { detectPerformanceMode } = await import("../lite-mode.js");
      const result = await detectPerformanceMode();

      expect(result).toBe("full");
    });

    it("returns 'lite' when settings file has mode 'lite' regardless of RAM", async () => {
      const fsp = await import("fs/promises");
      const osMod = await import("os");

      vi.mocked(fsp.readFile).mockResolvedValue(
        JSON.stringify({ performance: { mode: "lite" } }),
      );
      vi.mocked(osMod.totalmem).mockReturnValue(32 * GB); // high RAM, but explicit lite

      const { detectPerformanceMode } = await import("../lite-mode.js");
      const result = await detectPerformanceMode();

      expect(result).toBe("lite");
    });

    it("returns 'full' when settings file has mode 'full' even on low RAM", async () => {
      const fsp = await import("fs/promises");
      const osMod = await import("os");

      vi.mocked(fsp.readFile).mockResolvedValue(
        JSON.stringify({ performance: { mode: "full" } }),
      );
      vi.mocked(osMod.totalmem).mockReturnValue(4 * GB); // low RAM, but explicit full

      const { detectPerformanceMode } = await import("../lite-mode.js");
      const result = await detectPerformanceMode();

      expect(result).toBe("full");
    });

    it("falls back to hardware detection when settings mode is 'auto'", async () => {
      const fsp = await import("fs/promises");
      const osMod = await import("os");

      vi.mocked(fsp.readFile).mockResolvedValue(
        JSON.stringify({ performance: { mode: "auto" } }),
      );
      vi.mocked(osMod.totalmem).mockReturnValue(8 * GB);

      const { detectPerformanceMode } = await import("../lite-mode.js");
      const result = await detectPerformanceMode();

      expect(result).toBe("lite");
    });

    it("falls back to hardware detection when settings file has no performance field", async () => {
      const fsp = await import("fs/promises");
      const osMod = await import("os");

      vi.mocked(fsp.readFile).mockResolvedValue(
        JSON.stringify({ theme: { active: "catppuccin-mocha" } }),
      );
      vi.mocked(osMod.totalmem).mockReturnValue(16 * GB);

      const { detectPerformanceMode } = await import("../lite-mode.js");
      const result = await detectPerformanceMode();

      expect(result).toBe("full");
    });

    it("reads settings from correct path (~/.config/forja/settings.json)", async () => {
      const fsp = await import("fs/promises");
      const osMod = await import("os");

      vi.mocked(fsp.readFile).mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));
      vi.mocked(osMod.totalmem).mockReturnValue(16 * GB);
      vi.mocked(osMod.homedir).mockReturnValue("/home/testuser");

      const { detectPerformanceMode } = await import("../lite-mode.js");
      await detectPerformanceMode();

      const expectedPath = path.join("/home/testuser", ".config", "forja", "settings.json");
      expect(fsp.readFile).toHaveBeenCalledWith(expectedPath, "utf-8");
    });

    it("returns 'full' when totalmem equals exactly 12GB (boundary)", async () => {
      const fsp = await import("fs/promises");
      const osMod = await import("os");

      vi.mocked(fsp.readFile).mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));
      vi.mocked(osMod.totalmem).mockReturnValue(RAM_THRESHOLD_BYTES); // exactly 12GB

      const { detectPerformanceMode } = await import("../lite-mode.js");
      const result = await detectPerformanceMode();

      expect(result).toBe("full");
    });
  });

  describe("getLiteModeConfig", () => {
    it("getLiteModeConfig('full') returns full mode config values", async () => {
      const { getLiteModeConfig } = await import("../lite-mode.js");
      const config = getLiteModeConfig("full");

      expect(config.mode).toBe("auto");
      expect(config.resolved).toBe("full");
      expect(config.metricsIntervalMs).toBe(2000);
      expect(config.fileWatcherDepth).toBe(3);
      expect(config.disableGpuAcceleration).toBe(false);
      expect(config.v8SemiSpaceSize).toBe(64);
    });

    it("getLiteModeConfig('lite') returns lite mode config values", async () => {
      const { getLiteModeConfig } = await import("../lite-mode.js");
      const config = getLiteModeConfig("lite");

      expect(config.mode).toBe("auto");
      expect(config.resolved).toBe("lite");
      expect(config.metricsIntervalMs).toBe(10000);
      expect(config.fileWatcherDepth).toBe(1);
      expect(config.disableGpuAcceleration).toBe(true);
      expect(config.v8SemiSpaceSize).toBe(32);
    });
  });

  describe("initLiteMode and getCachedLiteModeConfig", () => {
    it("initLiteMode caches config and getCachedLiteModeConfig returns it", async () => {
      const fsp = await import("fs/promises");
      const osMod = await import("os");

      vi.mocked(fsp.readFile).mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));
      vi.mocked(osMod.totalmem).mockReturnValue(16 * GB);

      const { initLiteMode, getCachedLiteModeConfig } = await import("../lite-mode.js");

      // Before init, cache should be null
      const beforeInit = getCachedLiteModeConfig();
      expect(beforeInit).toBeNull();

      // After init, cache should be set
      const config = await initLiteMode();
      const cached = getCachedLiteModeConfig();

      expect(cached).not.toBeNull();
      expect(cached).toEqual(config);
      expect(config.resolved).toBe("full");
    });

    it("initLiteMode returns lite config on low RAM machine", async () => {
      const fsp = await import("fs/promises");
      const osMod = await import("os");

      vi.mocked(fsp.readFile).mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));
      vi.mocked(osMod.totalmem).mockReturnValue(8 * GB);

      const { initLiteMode } = await import("../lite-mode.js");
      const config = await initLiteMode();

      expect(config.resolved).toBe("lite");
      expect(config.disableGpuAcceleration).toBe(true);
    });

    it("getCachedLiteModeConfig returns null before initLiteMode is called", async () => {
      const { getCachedLiteModeConfig } = await import("../lite-mode.js");
      const result = getCachedLiteModeConfig();
      expect(result).toBeNull();
    });
  });

  describe("readSettingsModeSync", () => {
    it("returns 'auto' when settings file does not exist", async () => {
      const fsMod = await import("fs");
      const osMod = await import("os");

      vi.mocked(fsMod.existsSync).mockReturnValue(false);
      vi.mocked(osMod.homedir).mockReturnValue("/home/testuser");

      const { readSettingsModeSync } = await import("../lite-mode.js");
      const result = readSettingsModeSync();

      expect(result).toBe("auto");
    });

    it("returns explicit mode from settings file when file exists", async () => {
      const fsMod = await import("fs");
      const osMod = await import("os");

      vi.mocked(fsMod.existsSync).mockReturnValue(true);
      vi.mocked(fsMod.readFileSync).mockReturnValue(
        JSON.stringify({ performance: { mode: "lite" } }),
      );
      vi.mocked(osMod.homedir).mockReturnValue("/home/testuser");

      const { readSettingsModeSync } = await import("../lite-mode.js");
      const result = readSettingsModeSync();

      expect(result).toBe("lite");
    });

    it("returns 'full' mode from settings file when explicitly set", async () => {
      const fsMod = await import("fs");
      const osMod = await import("os");

      vi.mocked(fsMod.existsSync).mockReturnValue(true);
      vi.mocked(fsMod.readFileSync).mockReturnValue(
        JSON.stringify({ performance: { mode: "full" } }),
      );
      vi.mocked(osMod.homedir).mockReturnValue("/home/testuser");

      const { readSettingsModeSync } = await import("../lite-mode.js");
      const result = readSettingsModeSync();

      expect(result).toBe("full");
    });

    it("returns 'auto' when JSON is invalid", async () => {
      const fsMod = await import("fs");
      const osMod = await import("os");

      vi.mocked(fsMod.existsSync).mockReturnValue(true);
      vi.mocked(fsMod.readFileSync).mockReturnValue("not-valid-json{{{");
      vi.mocked(osMod.homedir).mockReturnValue("/home/testuser");

      const { readSettingsModeSync } = await import("../lite-mode.js");
      const result = readSettingsModeSync();

      expect(result).toBe("auto");
    });
  });

  describe("resolveModeSyncFromHardware", () => {
    it("returns 'lite' for low RAM machine in auto mode", async () => {
      const osMod = await import("os");

      vi.mocked(osMod.totalmem).mockReturnValue(8 * GB); // 8GB < 12GB threshold

      const { resolveModeSyncFromHardware } = await import("../lite-mode.js");
      const result = resolveModeSyncFromHardware("auto");

      expect(result).toBe("lite");
    });

    it("returns 'full' for high RAM machine in auto mode", async () => {
      const osMod = await import("os");

      vi.mocked(osMod.totalmem).mockReturnValue(16 * GB); // 16GB >= 12GB threshold

      const { resolveModeSyncFromHardware } = await import("../lite-mode.js");
      const result = resolveModeSyncFromHardware("auto");

      expect(result).toBe("full");
    });

    it("returns 'full' when explicitly set to full, regardless of RAM", async () => {
      const osMod = await import("os");

      vi.mocked(osMod.totalmem).mockReturnValue(4 * GB); // low RAM, but explicit full

      const { resolveModeSyncFromHardware } = await import("../lite-mode.js");
      const result = resolveModeSyncFromHardware("full");

      expect(result).toBe("full");
    });

    it("returns 'lite' when explicitly set to lite, regardless of RAM", async () => {
      const osMod = await import("os");

      vi.mocked(osMod.totalmem).mockReturnValue(32 * GB); // high RAM, but explicit lite

      const { resolveModeSyncFromHardware } = await import("../lite-mode.js");
      const result = resolveModeSyncFromHardware("lite");

      expect(result).toBe("lite");
    });
  });
});
