import { describe, it, expect, vi, beforeEach } from "vitest";
import * as path from "path";
import * as os from "os";

// Mock fs/promises
vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  access: vi.fn(),
  chmod: vi.fn(),
}));

// Mock os to control homedir
vi.mock("os", async (importOriginal) => {
  const original = await importOriginal<typeof os>();
  return {
    ...original,
    homedir: vi.fn(() => "/home/testuser"),
  };
});

import * as fsPromises from "fs/promises";

const mockReadFile = vi.mocked(fsPromises.readFile);
const mockWriteFile = vi.mocked(fsPromises.writeFile);
const mockMkdir = vi.mocked(fsPromises.mkdir);
const mockAccess = vi.mocked(fsPromises.access);
const mockChmod = vi.mocked(fsPromises.chmod);

describe("notification-hooks-setup", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    // Default: all file reads fail (not configured)
    mockReadFile.mockRejectedValue(new Error("ENOENT"));
    mockWriteFile.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    mockAccess.mockRejectedValue(new Error("ENOENT"));
    mockChmod.mockResolvedValue(undefined);
  });

  describe("getNotificationHooksStatus", () => {
    it("returns all unconfigured when no hook files exist", async () => {
      const { getNotificationHooksStatus } = await import("../notification-hooks-setup.js");
      const result = await getNotificationHooksStatus();

      expect(result.statuses).toHaveLength(5);
      expect(result.statuses.every((s) => s.configured === false)).toBe(true);
      expect(result.scriptExists).toBe(false);
    });

    it("detects claude as configured when notify.sh contains emit_osc_for_forja", async () => {
      mockReadFile.mockImplementation((filePath) => {
        const p = filePath as string;
        if (p.includes(".claude/hooks/notify.sh")) {
          return Promise.resolve("#!/bin/bash\nemit_osc_for_forja\n");
        }
        return Promise.reject(new Error("ENOENT"));
      });

      const { getNotificationHooksStatus } = await import("../notification-hooks-setup.js");
      const result = await getNotificationHooksStatus();

      const claude = result.statuses.find((s) => s.cliId === "claude");
      expect(claude?.configured).toBe(true);
    });

    it("detects codex as configured when hooks.json contains forja-osc-notify.sh", async () => {
      mockReadFile.mockImplementation((filePath) => {
        const p = filePath as string;
        if (p.includes(".codex/superpowers/hooks/hooks.json")) {
          return Promise.resolve(JSON.stringify({
            hooks: {
              Stop: [{ hooks: [{ type: "command", command: "/path/to/forja-osc-notify.sh" }] }],
            },
          }));
        }
        return Promise.reject(new Error("ENOENT"));
      });

      const { getNotificationHooksStatus } = await import("../notification-hooks-setup.js");
      const result = await getNotificationHooksStatus();

      const codex = result.statuses.find((s) => s.cliId === "codex");
      expect(codex?.configured).toBe(true);
    });

    it("detects gemini as configured when settings.json contains forja-osc-notify.sh", async () => {
      mockReadFile.mockImplementation((filePath) => {
        const p = filePath as string;
        if (p.includes(".gemini/settings.json")) {
          return Promise.resolve(JSON.stringify({
            hooks: {
              AfterAgent: [{ hooks: [{ type: "command", command: "/path/to/forja-osc-notify.sh" }] }],
            },
          }));
        }
        return Promise.reject(new Error("ENOENT"));
      });

      const { getNotificationHooksStatus } = await import("../notification-hooks-setup.js");
      const result = await getNotificationHooksStatus();

      const gemini = result.statuses.find((s) => s.cliId === "gemini");
      expect(gemini?.configured).toBe(true);
    });

    it("detects cursor as configured when hooks.json contains forja-osc-notify.sh", async () => {
      mockReadFile.mockImplementation((filePath) => {
        const p = filePath as string;
        if (p.includes(".cursor/hooks.json")) {
          return Promise.resolve(JSON.stringify({
            version: 1,
            hooks: {
              stop: [{ command: "/path/to/forja-osc-notify.sh" }],
            },
          }));
        }
        return Promise.reject(new Error("ENOENT"));
      });

      const { getNotificationHooksStatus } = await import("../notification-hooks-setup.js");
      const result = await getNotificationHooksStatus();

      const cursor = result.statuses.find((s) => s.cliId === "cursor");
      expect(cursor?.configured).toBe(true);
    });

    it("detects gh-copilot as configured when hooks.json contains forja-osc-notify.sh", async () => {
      mockReadFile.mockImplementation((filePath) => {
        const p = filePath as string;
        if (p.includes(".copilot/hooks.json")) {
          return Promise.resolve(JSON.stringify({
            version: 1,
            hooks: {
              agentStop: [{ command: "/path/to/forja-osc-notify.sh" }],
            },
          }));
        }
        return Promise.reject(new Error("ENOENT"));
      });

      const { getNotificationHooksStatus } = await import("../notification-hooks-setup.js");
      const result = await getNotificationHooksStatus();

      const copilot = result.statuses.find((s) => s.cliId === "gh-copilot");
      expect(copilot?.configured).toBe(true);
    });

    it("reports scriptExists=true when OSC script file is accessible", async () => {
      mockAccess.mockResolvedValue(undefined);

      const { getNotificationHooksStatus } = await import("../notification-hooks-setup.js");
      const result = await getNotificationHooksStatus();

      expect(result.scriptExists).toBe(true);
    });
  });

  describe("setupNotificationHook", () => {
    it("does nothing for claude (already handled by notify.sh)", async () => {
      const { setupNotificationHook } = await import("../notification-hooks-setup.js");
      await setupNotificationHook("claude");

      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it("creates codex hooks.json with Stop hook when file does not exist", async () => {
      const { setupNotificationHook } = await import("../notification-hooks-setup.js");
      await setupNotificationHook("codex");

      expect(mockWriteFile).toHaveBeenCalledOnce();
      const [writePath, content] = mockWriteFile.mock.calls[0];
      expect(writePath).toContain(".codex/superpowers/hooks/hooks.json");
      const parsed = JSON.parse(content as string);
      expect(parsed.hooks.Stop).toHaveLength(1);
      expect(parsed.hooks.Stop[0].hooks[0].type).toBe("command");
      expect(parsed.hooks.Stop[0].hooks[0].command).toContain("forja-osc-notify.sh");
      expect(parsed.hooks.Stop[0].hooks[0].timeout).toBe(5000);
    });

    it("preserves existing codex Stop hooks when adding new one", async () => {
      const existingConfig = {
        hooks: {
          Stop: [{ hooks: [{ type: "command", command: "/existing/hook.sh" }] }],
        },
      };
      mockReadFile.mockImplementation((filePath) => {
        const p = filePath as string;
        if (p.includes(".codex/superpowers/hooks/hooks.json")) {
          return Promise.resolve(JSON.stringify(existingConfig));
        }
        return Promise.reject(new Error("ENOENT"));
      });

      const { setupNotificationHook } = await import("../notification-hooks-setup.js");
      await setupNotificationHook("codex");

      const [, content] = mockWriteFile.mock.calls[0];
      const parsed = JSON.parse(content as string);
      expect(parsed.hooks.Stop).toHaveLength(2);
      expect(parsed.hooks.Stop[0].hooks[0].command).toBe("/existing/hook.sh");
      expect(parsed.hooks.Stop[1].hooks[0].command).toContain("forja-osc-notify.sh");
    });

    it("is idempotent for codex — does not add duplicate hook", async () => {
      const existingConfig = {
        hooks: {
          Stop: [{ hooks: [{ type: "command", command: "/home/testuser/.config/forja/hooks/forja-osc-notify.sh", timeout: 5000 }] }],
        },
      };
      mockReadFile.mockImplementation((filePath) => {
        const p = filePath as string;
        if (p.includes(".codex/superpowers/hooks/hooks.json")) {
          return Promise.resolve(JSON.stringify(existingConfig));
        }
        return Promise.reject(new Error("ENOENT"));
      });

      const { setupNotificationHook } = await import("../notification-hooks-setup.js");
      await setupNotificationHook("codex");

      const [, content] = mockWriteFile.mock.calls[0];
      const parsed = JSON.parse(content as string);
      expect(parsed.hooks.Stop).toHaveLength(1);
    });

    it("creates gemini settings.json with AfterAgent hook", async () => {
      const { setupNotificationHook } = await import("../notification-hooks-setup.js");
      await setupNotificationHook("gemini");

      expect(mockWriteFile).toHaveBeenCalledOnce();
      const [writePath, content] = mockWriteFile.mock.calls[0];
      expect(writePath).toContain(".gemini/settings.json");
      const parsed = JSON.parse(content as string);
      expect(parsed.hooks.AfterAgent).toHaveLength(1);
      expect(parsed.hooks.AfterAgent[0].hooks[0].command).toContain("forja-osc-notify.sh");
    });

    it("preserves existing gemini settings when adding AfterAgent hook", async () => {
      const existingConfig = {
        model: "gemini-2.0-flash",
        hooks: {
          AfterAgent: [{ hooks: [{ type: "command", command: "/existing/hook.sh" }] }],
        },
      };
      mockReadFile.mockImplementation((filePath) => {
        const p = filePath as string;
        if (p.includes(".gemini/settings.json")) {
          return Promise.resolve(JSON.stringify(existingConfig));
        }
        return Promise.reject(new Error("ENOENT"));
      });

      const { setupNotificationHook } = await import("../notification-hooks-setup.js");
      await setupNotificationHook("gemini");

      const [, content] = mockWriteFile.mock.calls[0];
      const parsed = JSON.parse(content as string);
      expect(parsed.model).toBe("gemini-2.0-flash");
      expect(parsed.hooks.AfterAgent).toHaveLength(2);
    });

    it("creates cursor hooks.json with stop hook", async () => {
      const { setupNotificationHook } = await import("../notification-hooks-setup.js");
      await setupNotificationHook("cursor");

      expect(mockWriteFile).toHaveBeenCalledOnce();
      const [writePath, content] = mockWriteFile.mock.calls[0];
      expect(writePath).toContain(".cursor/hooks.json");
      const parsed = JSON.parse(content as string);
      expect(parsed.version).toBe(1);
      expect(parsed.hooks.stop).toHaveLength(1);
      expect(parsed.hooks.stop[0].command).toContain("forja-osc-notify.sh");
    });

    it("preserves existing cursor stop hooks", async () => {
      const existingConfig = {
        version: 1,
        hooks: {
          stop: [{ command: "/existing/hook.sh" }],
        },
      };
      mockReadFile.mockImplementation((filePath) => {
        const p = filePath as string;
        if (p.includes(".cursor/hooks.json")) {
          return Promise.resolve(JSON.stringify(existingConfig));
        }
        return Promise.reject(new Error("ENOENT"));
      });

      const { setupNotificationHook } = await import("../notification-hooks-setup.js");
      await setupNotificationHook("cursor");

      const [, content] = mockWriteFile.mock.calls[0];
      const parsed = JSON.parse(content as string);
      expect(parsed.hooks.stop).toHaveLength(2);
      expect(parsed.hooks.stop[0].command).toBe("/existing/hook.sh");
    });

    it("is idempotent for cursor — does not add duplicate hook", async () => {
      const existingConfig = {
        version: 1,
        hooks: {
          stop: [{ command: "/home/testuser/.config/forja/hooks/forja-osc-notify.sh" }],
        },
      };
      mockReadFile.mockImplementation((filePath) => {
        const p = filePath as string;
        if (p.includes(".cursor/hooks.json")) {
          return Promise.resolve(JSON.stringify(existingConfig));
        }
        return Promise.reject(new Error("ENOENT"));
      });

      const { setupNotificationHook } = await import("../notification-hooks-setup.js");
      await setupNotificationHook("cursor");

      const [, content] = mockWriteFile.mock.calls[0];
      const parsed = JSON.parse(content as string);
      expect(parsed.hooks.stop).toHaveLength(1);
    });

    it("creates gh-copilot hooks.json with agentStop hook", async () => {
      const { setupNotificationHook } = await import("../notification-hooks-setup.js");
      await setupNotificationHook("gh-copilot");

      expect(mockWriteFile).toHaveBeenCalledOnce();
      const [writePath, content] = mockWriteFile.mock.calls[0];
      expect(writePath).toContain(".copilot/hooks.json");
      const parsed = JSON.parse(content as string);
      expect(parsed.version).toBe(1);
      expect(parsed.hooks.agentStop).toHaveLength(1);
      expect(parsed.hooks.agentStop[0].command).toContain("forja-osc-notify.sh");
    });

    it("preserves existing gh-copilot agentStop hooks", async () => {
      const existingConfig = {
        version: 1,
        hooks: {
          agentStop: [{ command: "/existing/hook.sh" }],
        },
      };
      mockReadFile.mockImplementation((filePath) => {
        const p = filePath as string;
        if (p.includes(".copilot/hooks.json")) {
          return Promise.resolve(JSON.stringify(existingConfig));
        }
        return Promise.reject(new Error("ENOENT"));
      });

      const { setupNotificationHook } = await import("../notification-hooks-setup.js");
      await setupNotificationHook("gh-copilot");

      const [, content] = mockWriteFile.mock.calls[0];
      const parsed = JSON.parse(content as string);
      expect(parsed.hooks.agentStop).toHaveLength(2);
    });

    it("is idempotent for gh-copilot — does not add duplicate hook", async () => {
      const existingConfig = {
        version: 1,
        hooks: {
          agentStop: [{ command: "/home/testuser/.config/forja/hooks/forja-osc-notify.sh" }],
        },
      };
      mockReadFile.mockImplementation((filePath) => {
        const p = filePath as string;
        if (p.includes(".copilot/hooks.json")) {
          return Promise.resolve(JSON.stringify(existingConfig));
        }
        return Promise.reject(new Error("ENOENT"));
      });

      const { setupNotificationHook } = await import("../notification-hooks-setup.js");
      await setupNotificationHook("gh-copilot");

      const [, content] = mockWriteFile.mock.calls[0];
      const parsed = JSON.parse(content as string);
      expect(parsed.hooks.agentStop).toHaveLength(1);
    });

    it("throws for unknown CLI id", async () => {
      const { setupNotificationHook } = await import("../notification-hooks-setup.js");
      await expect(setupNotificationHook("unknown-cli")).rejects.toThrow("Unknown CLI: unknown-cli");
    });

    it("creates parent directories if they do not exist", async () => {
      const { setupNotificationHook } = await import("../notification-hooks-setup.js");
      await setupNotificationHook("codex");

      expect(mockMkdir).toHaveBeenCalledWith(
        path.join("/home/testuser", ".codex", "superpowers", "hooks"),
        { recursive: true }
      );
    });
  });

  describe("ensureForjaOscScript", () => {
    it("creates the script file when it does not exist", async () => {
      // File doesn't exist — readFile throws
      mockReadFile.mockRejectedValue(new Error("ENOENT"));

      const { ensureForjaOscScript } = await import("../notification-hooks-setup.js");
      await ensureForjaOscScript();

      expect(mockMkdir).toHaveBeenCalledWith(
        path.join("/home/testuser", ".config", "forja", "hooks"),
        { recursive: true }
      );
      expect(mockWriteFile).toHaveBeenCalledOnce();
      const [writePath, , opts] = mockWriteFile.mock.calls[0];
      expect(writePath).toContain("forja-osc-notify.sh");
      expect((opts as { mode?: number })?.mode).toBe(0o755);
    });

    it("writes content that reads stdin JSON and emits OSC 9", async () => {
      mockReadFile.mockRejectedValue(new Error("ENOENT"));

      const { ensureForjaOscScript } = await import("../notification-hooks-setup.js");
      await ensureForjaOscScript();

      const [, content] = mockWriteFile.mock.calls[0];
      const script = content as string;
      expect(script).toContain("FORJA_TERMINAL");
      expect(script).toContain("OSC 9");
      expect(script).toContain("command -v jq");
      expect(script).toContain("jq");
      expect(script).toContain("last_assistant_message");
      expect(script).toContain("\\033]9;1;");
    });

    it("does not rewrite when script content already matches", async () => {
      // Simulate the correct content already existing
      // We need to match exactly what the module writes, so we trigger a write first
      // then simulate reading back the same content
      mockReadFile.mockRejectedValue(new Error("ENOENT"));
      const { ensureForjaOscScript } = await import("../notification-hooks-setup.js");
      await ensureForjaOscScript();
      const writtenContent = mockWriteFile.mock.calls[0][1] as string;

      // Reset and simulate existing correct file
      vi.clearAllMocks();
      mockReadFile.mockResolvedValue(writtenContent);
      mockMkdir.mockResolvedValue(undefined);
      mockChmod.mockResolvedValue(undefined);

      await ensureForjaOscScript();

      // writeFile should NOT be called again (content already correct)
      expect(mockWriteFile).not.toHaveBeenCalled();
      // But chmod should be called to ensure executable
      expect(mockChmod).toHaveBeenCalledWith(
        expect.stringContaining("forja-osc-notify.sh"),
        0o755
      );
    });

    it("rewrites when script exists but content is different (stale)", async () => {
      mockReadFile.mockResolvedValue("#!/bin/bash\n# old version\n");

      const { ensureForjaOscScript } = await import("../notification-hooks-setup.js");
      await ensureForjaOscScript();

      expect(mockWriteFile).toHaveBeenCalledOnce();
    });

    it("writes to ~/.config/forja/hooks/forja-osc-notify.sh", async () => {
      mockReadFile.mockRejectedValue(new Error("ENOENT"));

      const { ensureForjaOscScript } = await import("../notification-hooks-setup.js");
      await ensureForjaOscScript();

      const [writePath] = mockWriteFile.mock.calls[0];
      expect(writePath).toBe(
        path.join("/home/testuser", ".config", "forja", "hooks", "forja-osc-notify.sh")
      );
    });
  });
});
