import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

import {
  getForjaConfigPath,
  readProjectConfig,
  writeProjectConfig,
  patchProjectConfig,
  patchProjectUi,
  clearProjectUi,
  ensureGitignore,
} from "../project-config.js";

describe("project-config", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "forja-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("getForjaConfigPath", () => {
    it("returns path to .forja/config.json inside project", () => {
      const result = getForjaConfigPath("/home/user/my-project");
      expect(result).toBe(
        path.join("/home/user/my-project", ".forja", "config.json"),
      );
    });
  });

  describe("readProjectConfig", () => {
    it("returns null when no config exists", () => {
      const result = readProjectConfig(tmpDir);
      expect(result).toBeNull();
    });

    it("reads a valid config file", () => {
      const forjaDir = path.join(tmpDir, ".forja");
      fs.mkdirSync(forjaDir);
      fs.writeFileSync(
        path.join(forjaDir, "config.json"),
        JSON.stringify({ name: "my-project", ui: { sidebarOpen: true } }),
      );

      const result = readProjectConfig(tmpDir);
      expect(result).toEqual({
        name: "my-project",
        ui: { sidebarOpen: true },
      });
    });

    it("returns null for corrupted JSON", () => {
      const forjaDir = path.join(tmpDir, ".forja");
      fs.mkdirSync(forjaDir);
      fs.writeFileSync(path.join(forjaDir, "config.json"), "{invalid json");

      const result = readProjectConfig(tmpDir);
      expect(result).toBeNull();
    });

    it("returns null for empty file", () => {
      const forjaDir = path.join(tmpDir, ".forja");
      fs.mkdirSync(forjaDir);
      fs.writeFileSync(path.join(forjaDir, "config.json"), "");

      const result = readProjectConfig(tmpDir);
      expect(result).toBeNull();
    });
  });

  describe("writeProjectConfig", () => {
    it("creates .forja directory and config.json", () => {
      const config = { name: "test-project", ui: {} };
      writeProjectConfig(tmpDir, config);

      const configPath = path.join(tmpDir, ".forja", "config.json");
      expect(fs.existsSync(configPath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      expect(content.name).toBe("test-project");
    });

    it("auto-adds .forja/ to .gitignore in a git repo", () => {
      fs.mkdirSync(path.join(tmpDir, ".git"));
      fs.writeFileSync(path.join(tmpDir, ".gitignore"), "node_modules/\n");

      writeProjectConfig(tmpDir, { name: "test", ui: {} });

      const content = fs.readFileSync(path.join(tmpDir, ".gitignore"), "utf-8");
      expect(content).toContain(".forja/");
    });

    it("does not create .gitignore in non-git directories", () => {
      writeProjectConfig(tmpDir, { name: "test", ui: {} });

      expect(fs.existsSync(path.join(tmpDir, ".gitignore"))).toBe(false);
    });

    it("overwrites existing config", () => {
      writeProjectConfig(tmpDir, { name: "v1", ui: {} });
      writeProjectConfig(tmpDir, { name: "v2", ui: { sidebarOpen: false } });

      const result = readProjectConfig(tmpDir);
      expect(result!.name).toBe("v2");
      expect(result!.ui).toEqual({ sidebarOpen: false });
    });

    it("uses atomic write (tmp + rename)", () => {
      writeProjectConfig(tmpDir, { name: "atomic-test", ui: {} });

      // After write, no .tmp file should remain
      const forjaDir = path.join(tmpDir, ".forja");
      const files = fs.readdirSync(forjaDir);
      expect(files).not.toContain("config.json.tmp");
      expect(files).toContain("config.json");
    });
  });

  describe("ensureGitignore", () => {
    it("is a no-op when .git does not exist", () => {
      ensureGitignore(tmpDir);

      const gitignorePath = path.join(tmpDir, ".gitignore");
      expect(fs.existsSync(gitignorePath)).toBe(false);
    });

    it("is a no-op when .gitignore does not exist even with .git", () => {
      fs.mkdirSync(path.join(tmpDir, ".git"));

      ensureGitignore(tmpDir);

      const gitignorePath = path.join(tmpDir, ".gitignore");
      expect(fs.existsSync(gitignorePath)).toBe(false);
    });

    it("appends .forja/ to existing .gitignore in a git repo", () => {
      fs.mkdirSync(path.join(tmpDir, ".git"));
      const gitignorePath = path.join(tmpDir, ".gitignore");
      fs.writeFileSync(gitignorePath, "node_modules/\ndist/\n");

      ensureGitignore(tmpDir);

      const content = fs.readFileSync(gitignorePath, "utf-8");
      expect(content).toContain("node_modules/");
      expect(content).toContain(".forja/");
    });

    it("does not duplicate .forja/ entry", () => {
      fs.mkdirSync(path.join(tmpDir, ".git"));
      const gitignorePath = path.join(tmpDir, ".gitignore");
      fs.writeFileSync(gitignorePath, ".forja/\n");

      ensureGitignore(tmpDir);

      const content = fs.readFileSync(gitignorePath, "utf-8");
      const matches = content.match(/\.forja\//g);
      expect(matches).toHaveLength(1);
    });

    it("detects .forja/ even without trailing newline", () => {
      fs.mkdirSync(path.join(tmpDir, ".git"));
      const gitignorePath = path.join(tmpDir, ".gitignore");
      fs.writeFileSync(gitignorePath, "node_modules/\n.forja/");

      ensureGitignore(tmpDir);

      const content = fs.readFileSync(gitignorePath, "utf-8");
      const matches = content.match(/\.forja\//g);
      expect(matches).toHaveLength(1);
    });
  });

  describe("patchProjectConfig", () => {
    it("creates config if it does not exist", () => {
      patchProjectConfig(tmpDir, { name: "new-project" });

      const result = readProjectConfig(tmpDir);
      expect(result!.name).toBe("new-project");
    });

    it("merges top-level fields", () => {
      writeProjectConfig(tmpDir, {
        name: "original",
        last_opened: "2026-01-01",
        ui: {},
      });

      patchProjectConfig(tmpDir, { name: "updated" });

      const result = readProjectConfig(tmpDir);
      expect(result!.name).toBe("updated");
      expect(result!.last_opened).toBe("2026-01-01");
    });

    it("deep-merges ui fields", () => {
      writeProjectConfig(tmpDir, {
        name: "test",
        ui: { sidebarOpen: true, sidebarSize: 20 },
      });

      patchProjectConfig(tmpDir, { ui: { sidebarOpen: false } });

      const result = readProjectConfig(tmpDir);
      expect(result!.ui!.sidebarOpen).toBe(false);
      expect(result!.ui!.sidebarSize).toBe(20);
    });
  });

  describe("patchProjectUi", () => {
    it("creates config with ui fields if no config exists", () => {
      patchProjectUi(tmpDir, { sidebarOpen: false, sidebarSize: 30 });

      const result = readProjectConfig(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.ui!.sidebarOpen).toBe(false);
      expect(result!.ui!.sidebarSize).toBe(30);
    });

    it("merges into existing ui without losing other ui fields", () => {
      writeProjectConfig(tmpDir, {
        name: "test",
        ui: {
          sidebarOpen: true,
          sidebarSize: 20,
          previewFile: "/src/main.ts",
        },
      });

      patchProjectUi(tmpDir, { sidebarOpen: false });

      const result = readProjectConfig(tmpDir);
      expect(result!.ui!.sidebarOpen).toBe(false);
      expect(result!.ui!.sidebarSize).toBe(20);
      expect(result!.ui!.previewFile).toBe("/src/main.ts");
    });

    it("does not modify non-ui fields", () => {
      writeProjectConfig(tmpDir, {
        name: "test",
        icon_path: "/icon.svg",
        ui: { sidebarOpen: true },
      });

      patchProjectUi(tmpDir, { sidebarOpen: false });

      const result = readProjectConfig(tmpDir);
      expect(result!.name).toBe("test");
      expect(result!.icon_path).toBe("/icon.svg");
    });

    it("handles tabs and layoutJson fields", () => {
      patchProjectUi(tmpDir, {
        tabs: [{ sessionType: "claude" }],
        activeTabIndex: 0,
        layoutJson: { global: {}, layout: {} },
      });

      const result = readProjectConfig(tmpDir);
      expect(result!.ui!.tabs).toHaveLength(1);
      expect(result!.ui!.tabs![0].sessionType).toBe("claude");
      expect(result!.ui!.activeTabIndex).toBe(0);
      expect(result!.ui!.layoutJson).toBeDefined();
    });

    it("patchProjectUi preserves cliSessionId in tabs", () => {
      patchProjectUi(tmpDir, {
        tabs: [
          { id: "tab-1", sessionType: "claude", cliSessionId: "session-xyz-456" },
          { id: "tab-2", sessionType: "terminal" },
        ],
        activeTabIndex: 0,
      });

      const result = readProjectConfig(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.ui!.tabs).toHaveLength(2);
      expect(result!.ui!.tabs![0].cliSessionId).toBe("session-xyz-456");
      expect(result!.ui!.tabs![1].cliSessionId).toBeUndefined();
    });
  });

  describe("clearProjectUi", () => {
    it("removes ui field while preserving other fields", () => {
      writeProjectConfig(tmpDir, {
        name: "my-project",
        icon_path: "/icon.png",
        last_opened: "2026-03-18",
        ui: {
          sidebarOpen: true,
          sidebarSize: 25,
          tabs: [{ sessionType: "claude" }],
          activeTabIndex: 0,
        },
      });

      clearProjectUi(tmpDir);

      const result = readProjectConfig(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.name).toBe("my-project");
      expect(result!.icon_path).toBe("/icon.png");
      expect(result!.last_opened).toBe("2026-03-18");
      expect(result!.ui).toBeUndefined();
    });

    it("is a no-op when no config exists", () => {
      clearProjectUi(tmpDir);

      const result = readProjectConfig(tmpDir);
      expect(result).toBeNull();
    });

    it("is a no-op when config has no ui field", () => {
      writeProjectConfig(tmpDir, {
        name: "no-ui-project",
        last_opened: "2026-03-18",
      });

      clearProjectUi(tmpDir);

      const result = readProjectConfig(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.name).toBe("no-ui-project");
      expect(result!.last_opened).toBe("2026-03-18");
      expect(result!.ui).toBeUndefined();
    });
  });

  describe("error handling", () => {
    it("handles read-only filesystem gracefully on write", () => {
      // Use a path that definitely doesn't exist and can't be created
      const badPath = "/nonexistent-root-12345/project";
      expect(() => writeProjectConfig(badPath, { name: "test", ui: {} })).toThrow();
    });

    it("handles read-only filesystem gracefully on read", () => {
      const badPath = "/nonexistent-root-12345/project";
      const result = readProjectConfig(badPath);
      expect(result).toBeNull();
    });
  });
});
