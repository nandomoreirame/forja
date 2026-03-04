import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import * as path from "path";
import * as os from "os";

// Mock fs/promises module
vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

// Mock chokidar
const mockWatcher = {
  on: vi.fn().mockReturnThis(),
  close: vi.fn().mockResolvedValue(undefined),
};
vi.mock("chokidar", () => ({
  default: {
    watch: vi.fn(() => mockWatcher),
  },
}));

describe("user-settings module", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getUserSettingsPath returns ~/.config/forja/settings.json", async () => {
    const { getUserSettingsPath } = await import("../user-settings");
    const expected = path.join(os.homedir(), ".config", "forja", "settings.json");
    expect(getUserSettingsPath()).toBe(expected);
  });

  it("loadUserSettings returns defaults with 3 font groups when file does not exist", async () => {
    const fsp = await import("fs/promises");
    const enoentError = Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    vi.mocked(fsp.readFile).mockRejectedValue(enoentError);
    vi.mocked(fsp.mkdir).mockResolvedValue(undefined);
    vi.mocked(fsp.writeFile).mockResolvedValue(undefined);

    const { loadUserSettings } = await import("../user-settings");

    const result = await loadUserSettings();
    expect(result.statusbar.visible).toBe(true);
    expect(result.app.fontFamily).toBe("Geist Sans, Inter, system-ui, sans-serif");
    expect(result.app.fontSize).toBe(14);
    expect(result.editor.fontSize).toBe(13);
    expect(result.editor.fontFamily).toContain("JetBrains Mono");
    expect(result.terminal.fontSize).toBe(14);
    expect(result.terminal.fontFamily).toContain("JetBrains Mono");
    expect(result.window.zoomLevel).toBe(0);
    expect(result.window.opacity).toBe(1.0);
    expect(result.sessions).toEqual({});
  });

  it("loadUserSettings creates settings file with defaults when it does not exist", async () => {
    const fsp = await import("fs/promises");
    const enoentError = Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    vi.mocked(fsp.readFile).mockRejectedValue(enoentError);
    vi.mocked(fsp.mkdir).mockResolvedValue(undefined);
    vi.mocked(fsp.writeFile).mockResolvedValue(undefined);

    const { loadUserSettings } = await import("../user-settings");
    await loadUserSettings();

    expect(fsp.mkdir).toHaveBeenCalled();
    expect(fsp.writeFile).toHaveBeenCalled();
    const writtenContent = vi.mocked(fsp.writeFile).mock.calls[0][1] as string;
    const parsed = JSON.parse(writtenContent);
    expect(parsed.statusbar.visible).toBe(true);
    expect(parsed.app).toBeDefined();
    expect(parsed.terminal).toBeDefined();
  });

  it("loadUserSettings parses and merges valid JSON with new format", async () => {
    const fsp = await import("fs/promises");
    vi.mocked(fsp.readFile).mockResolvedValue(
      JSON.stringify({ terminal: { fontSize: 20 } }),
    );

    const { loadUserSettings } = await import("../user-settings");
    const result = await loadUserSettings();

    expect(result.terminal.fontSize).toBe(20);
    expect(result.statusbar.visible).toBe(true); // default preserved
  });

  it("loadUserSettings migrates old editor-only format to terminal (backward compat)", async () => {
    const fsp = await import("fs/promises");
    vi.mocked(fsp.readFile).mockResolvedValue(
      JSON.stringify({ editor: { fontSize: 18, fontFamily: "Custom Mono, monospace" } }),
    );

    const { loadUserSettings } = await import("../user-settings");
    const result = await loadUserSettings();

    expect(result.editor.fontSize).toBe(18);
    expect(result.terminal.fontSize).toBe(18);
    expect(result.terminal.fontFamily).toBe("Custom Mono, monospace");
  });

  it("loadUserSettings validates and clamps out-of-range values for all font groups", async () => {
    const fsp = await import("fs/promises");
    vi.mocked(fsp.readFile).mockResolvedValue(
      JSON.stringify({
        app: { fontSize: 100 },
        editor: { fontSize: 100 },
        terminal: { fontSize: 100 },
        window: { opacity: 0.1 },
      }),
    );

    const { loadUserSettings } = await import("../user-settings");
    const result = await loadUserSettings();

    expect(result.app.fontSize).toBe(32);
    expect(result.editor.fontSize).toBe(32);
    expect(result.terminal.fontSize).toBe(32);
    expect(result.window.opacity).toBe(0.3);
  });

  it("loadUserSettings returns defaults when JSON is malformed", async () => {
    const fsp = await import("fs/promises");
    vi.mocked(fsp.readFile).mockResolvedValue("{invalid json");

    const { loadUserSettings } = await import("../user-settings");

    const result = await loadUserSettings();
    expect(result.statusbar.visible).toBe(true);
    expect(result.terminal.fontSize).toBe(14);
  });

  it("getCachedSettings returns the same result as last loadUserSettings", async () => {
    const fsp = await import("fs/promises");
    vi.mocked(fsp.readFile).mockResolvedValue(
      JSON.stringify({ terminal: { fontSize: 18 } }),
    );

    const { loadUserSettings, getCachedSettings } = await import("../user-settings");
    await loadUserSettings();
    const cached = getCachedSettings();

    expect(cached.terminal.fontSize).toBe(18);
  });

  it("startSettingsWatcher sets up chokidar watching on settings file", async () => {
    const chokidar = await import("chokidar");

    const { startSettingsWatcher, getUserSettingsPath } = await import("../user-settings");
    startSettingsWatcher(() => []);

    expect(chokidar.default.watch).toHaveBeenCalledWith(
      getUserSettingsPath(),
      expect.objectContaining({ ignoreInitial: true }),
    );
  });

  it("stopSettingsWatcher closes the watcher", async () => {
    const { startSettingsWatcher, stopSettingsWatcher } = await import("../user-settings");
    startSettingsWatcher(() => []);
    stopSettingsWatcher();

    expect(mockWatcher.close).toHaveBeenCalled();
  });

  it("saveUserSettings writes valid JSON and returns validated settings", async () => {
    const fsp = await import("fs/promises");
    vi.mocked(fsp.mkdir).mockResolvedValue(undefined);
    vi.mocked(fsp.writeFile).mockResolvedValue(undefined);
    vi.mocked(fsp.readFile).mockResolvedValue(
      JSON.stringify({ terminal: { fontSize: 18 } }),
    );

    const { saveUserSettings } = await import("../user-settings");
    const content = JSON.stringify({ terminal: { fontSize: 18 } }, null, 2);
    const result = await saveUserSettings(content);

    expect(fsp.writeFile).toHaveBeenCalled();
    const writtenContent = vi.mocked(fsp.writeFile).mock.calls[0][1] as string;
    expect(writtenContent).toBe(content);
    expect(result.terminal.fontSize).toBe(18);
  });

  it("loadUserSettings strips session args with shell metacharacters", async () => {
    const fsp = await import("fs/promises");
    vi.mocked(fsp.readFile).mockResolvedValue(
      JSON.stringify({
        sessions: {
          claude: { args: ["--model", "opus", "; rm -rf /", "--safe"] },
        },
      }),
    );

    const { loadUserSettings } = await import("../user-settings");
    const result = await loadUserSettings();

    expect(result.sessions.claude.args).toEqual(["--model", "opus", "--safe"]);
  });

  it("loadUserSettings strips invalid env values from sessions", async () => {
    const fsp = await import("fs/promises");
    vi.mocked(fsp.readFile).mockResolvedValue(
      JSON.stringify({
        sessions: {
          claude: { env: { SAFE: "value", BAD: 123 } },
        },
      }),
    );

    const { loadUserSettings } = await import("../user-settings");
    const result = await loadUserSettings();

    expect(result.sessions.claude.env).toEqual({ SAFE: "value" });
  });

  it("saveUserSettings throws on invalid JSON", async () => {
    const { saveUserSettings } = await import("../user-settings");

    await expect(saveUserSettings("{invalid json")).rejects.toThrow();
  });

  it("saveUserSettings validates and clamps values after saving", async () => {
    const fsp = await import("fs/promises");
    vi.mocked(fsp.mkdir).mockResolvedValue(undefined);
    vi.mocked(fsp.writeFile).mockResolvedValue(undefined);
    vi.mocked(fsp.readFile).mockResolvedValue(
      JSON.stringify({ terminal: { fontSize: 100 } }),
    );

    const { saveUserSettings } = await import("../user-settings");
    const content = JSON.stringify({ terminal: { fontSize: 100 } }, null, 2);
    const result = await saveUserSettings(content);

    expect(result.terminal.fontSize).toBe(32); // clamped
  });
});
