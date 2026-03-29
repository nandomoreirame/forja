import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock node-pty before any import
vi.mock("node-pty", () => ({
  spawn: vi.fn(() => ({
    onData: vi.fn(),
    onExit: vi.fn(),
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
  })),
}));

describe("pty - Windows support", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe("resolveShellPath", () => {
    it("includes Unix-specific paths on Linux", async () => {
      const { resolveShellPath } = await import("../pty");
      const resolved = resolveShellPath();
      expect(resolved).toContain("/usr/local/bin");
      expect(resolved).toContain("/usr/bin");
    });

    it("includes Windows-specific paths on win32", async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", { value: "win32", configurable: true });

      try {
        const { resolveShellPath } = await import("../pty");
        const resolved = resolveShellPath();

        // Should contain Windows npm global path
        expect(resolved).toContain("AppData");
        expect(resolved).toContain("npm");
        // Should contain Python path
        expect(resolved).toContain("Programs");
      } finally {
        Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
      }
    });
  });

  describe("SAFE_ENV_KEYS (via buildSafeEnv)", () => {
    it("includes Windows env vars on win32", async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", { value: "win32", configurable: true });

      // Set Windows env vars so buildSafeEnv can pick them up
      const originalEnv = { ...process.env };
      process.env.USERPROFILE = "C:\\Users\\test";
      process.env.APPDATA = "C:\\Users\\test\\AppData\\Roaming";
      process.env.COMSPEC = "C:\\Windows\\system32\\cmd.exe";
      process.env.SYSTEMROOT = "C:\\Windows";

      try {
        const mod = await import("../pty");
        // buildSafeEnv is not exported, but we can test via getSafeEnvKeys
        expect(mod.getSafeEnvKeys()).toContain("USERPROFILE");
        expect(mod.getSafeEnvKeys()).toContain("APPDATA");
        expect(mod.getSafeEnvKeys()).toContain("COMSPEC");
        expect(mod.getSafeEnvKeys()).toContain("TEMP");
        expect(mod.getSafeEnvKeys()).toContain("TMP");
        expect(mod.getSafeEnvKeys()).toContain("PATHEXT");
        expect(mod.getSafeEnvKeys()).toContain("USERNAME");
        expect(mod.getSafeEnvKeys()).toContain("SystemRoot");
      } finally {
        Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
        process.env = originalEnv;
      }
    });

    it("does not include Windows env vars on Linux", async () => {
      const { getSafeEnvKeys } = await import("../pty");
      const keys = getSafeEnvKeys();
      expect(keys).not.toContain("USERPROFILE");
      expect(keys).not.toContain("APPDATA");
      expect(keys).not.toContain("COMSPEC");
    });
  });
});
