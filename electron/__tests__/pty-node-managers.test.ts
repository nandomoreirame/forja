import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

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

describe("resolveNodeManagerPaths", () => {
  const REAL_HOME = os.homedir();
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    vi.resetModules();
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("detects nvm bin directory from alias/default", async () => {
    const nvmDir = path.join(REAL_HOME, ".nvm");
    const versionsDir = path.join(nvmDir, "versions", "node");

    // Only run if nvm is actually installed
    if (!fs.existsSync(versionsDir)) return;

    process.env.NVM_DIR = nvmDir;

    const { resolveNodeManagerPaths } = await import("../pty.js");
    const paths = resolveNodeManagerPaths();

    // Should find at least one nvm bin directory
    const nvmPaths = paths.filter((p) => p.includes(".nvm"));
    expect(nvmPaths.length).toBeGreaterThan(0);
    // Each path should end with /bin
    for (const p of nvmPaths) {
      expect(p).toMatch(/\/bin$/);
    }
  });

  it("returns nvm paths from NVM_DIR env var", async () => {
    const nvmDir = process.env.NVM_DIR || path.join(REAL_HOME, ".nvm");
    const versionsDir = path.join(nvmDir, "versions", "node");

    if (!fs.existsSync(versionsDir)) return;

    const { resolveNodeManagerPaths } = await import("../pty.js");
    const paths = resolveNodeManagerPaths();

    // At least one path should contain the nvm versions directory
    expect(paths.some((p) => p.startsWith(versionsDir))).toBe(true);
  });

  it("includes volta bin if installed", async () => {
    const voltaBin = path.join(REAL_HOME, ".volta", "bin");

    const { resolveNodeManagerPaths } = await import("../pty.js");
    const paths = resolveNodeManagerPaths();

    if (fs.existsSync(voltaBin)) {
      expect(paths).toContain(voltaBin);
    }
    // If not installed, just verify it doesn't crash
  });

  it("includes asdf shims if installed", async () => {
    const asdfShims = path.join(REAL_HOME, ".asdf", "shims");

    const { resolveNodeManagerPaths } = await import("../pty.js");
    const paths = resolveNodeManagerPaths();

    if (fs.existsSync(asdfShims)) {
      expect(paths).toContain(asdfShims);
    }
  });

  it("includes mise shims if installed", async () => {
    const miseShims = path.join(REAL_HOME, ".local", "share", "mise", "shims");

    const { resolveNodeManagerPaths } = await import("../pty.js");
    const paths = resolveNodeManagerPaths();

    if (fs.existsSync(miseShims)) {
      expect(paths).toContain(miseShims);
    }
  });

  it("includes fnm default bin if installed", async () => {
    const fnmBin = path.join(REAL_HOME, ".local", "share", "fnm", "aliases", "default", "bin");

    const { resolveNodeManagerPaths } = await import("../pty.js");
    const paths = resolveNodeManagerPaths();

    if (fs.existsSync(fnmBin)) {
      expect(paths).toContain(fnmBin);
    }
  });

  it("does not crash when no version managers are installed", async () => {
    // Point NVM_DIR to a nonexistent directory
    process.env.NVM_DIR = "/tmp/nonexistent-nvm-dir-test";
    process.env.FNM_DIR = "/tmp/nonexistent-fnm-dir-test";
    process.env.MISE_DATA_DIR = "/tmp/nonexistent-mise-dir-test";

    const { resolveNodeManagerPaths } = await import("../pty.js");
    const paths = resolveNodeManagerPaths();

    // Should return an array (possibly empty) without throwing
    expect(Array.isArray(paths)).toBe(true);
  });

  it("resolveShellPath includes node manager paths on Linux", async () => {
    const { resolveShellPath, resolveNodeManagerPaths } = await import("../pty.js");
    const managerPaths = resolveNodeManagerPaths();
    const resolved = resolveShellPath();

    // Every manager path should be included in the resolved PATH
    for (const p of managerPaths) {
      expect(resolved).toContain(p);
    }
  });
});
