import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  mergeWithDefaults,
  validateSettings,
  type UserSettings,
} from "../settings-types";

describe("DEFAULT_SETTINGS", () => {
  it("has expected default values with 3 font groups", () => {
    expect(DEFAULT_SETTINGS).toEqual({
      app: {
        fontFamily: "Geist Sans, Inter, system-ui, sans-serif",
        fontSize: 14,
      },
      editor: {
        fontFamily:
          "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
        fontSize: 13,
      },
      terminal: {
        fontFamily:
          "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
        fontSize: 14,
      },
      window: { zoomLevel: 0, opacity: 1.0 },
      sessions: {
        claude: { args: ["--verbose", "--dangerously-skip-permissions"] },
        gemini: { args: ["--yolo"] },
        codex: { args: ["--full-auto"] },
      },
    });
  });
});

describe("mergeWithDefaults", () => {
  it("returns defaults when given empty object", () => {
    const result = mergeWithDefaults({});
    expect(result).toEqual(DEFAULT_SETTINGS);
  });

  it("returns defaults when given undefined", () => {
    const result = mergeWithDefaults(undefined as unknown as Partial<UserSettings>);
    expect(result).toEqual(DEFAULT_SETTINGS);
  });

  it("deep merges app.fontSize preserving other app fields", () => {
    const result = mergeWithDefaults({ app: { fontSize: 16 } } as Partial<UserSettings>);
    expect(result.app.fontSize).toBe(16);
    expect(result.app.fontFamily).toBe(DEFAULT_SETTINGS.app.fontFamily);
  });

  it("deep merges editor.fontSize preserving other editor fields", () => {
    const result = mergeWithDefaults({ editor: { fontSize: 20 } } as Partial<UserSettings>);
    expect(result.editor.fontSize).toBe(20);
    expect(result.editor.fontFamily).toBe(DEFAULT_SETTINGS.editor.fontFamily);
  });

  it("deep merges terminal settings", () => {
    const result = mergeWithDefaults({ terminal: { fontSize: 18 } } as Partial<UserSettings>);
    expect(result.terminal.fontSize).toBe(18);
    expect(result.terminal.fontFamily).toBe(DEFAULT_SETTINGS.terminal.fontFamily);
  });

  it("deep merges window preserving other fields", () => {
    const result = mergeWithDefaults({
      window: { opacity: 0.8 },
    } as Partial<UserSettings>);
    expect(result.window.opacity).toBe(0.8);
    expect(result.window.zoomLevel).toBe(0);
  });

  it("preserves sessions from input", () => {
    const result = mergeWithDefaults({
      sessions: {
        claude: { args: ["--verbose"] },
      },
    });
    expect(result.sessions.claude).toEqual({ args: ["--verbose"] });
  });

  it("ignores unknown top-level keys", () => {
    const input = { unknownKey: "whatever", app: { fontSize: 16 } } as unknown as Partial<UserSettings>;
    const result = mergeWithDefaults(input);
    expect(result.app.fontSize).toBe(16);
    expect((result as Record<string, unknown>).unknownKey).toBeUndefined();
  });

  // Backward compatibility: old format with editor.fontFamily/fontSize maps to terminal too
  it("migrates old format editor settings to terminal when terminal is absent", () => {
    const oldFormat = {
      editor: {
        fontSize: 16,
        fontFamily: "Custom Mono, monospace",
      },
    } as Partial<UserSettings>;
    const result = mergeWithDefaults(oldFormat);
    // editor keeps its values
    expect(result.editor.fontSize).toBe(16);
    expect(result.editor.fontFamily).toBe("Custom Mono, monospace");
    // terminal gets editor values when terminal section is missing (backward compat)
    expect(result.terminal.fontSize).toBe(16);
    expect(result.terminal.fontFamily).toBe("Custom Mono, monospace");
  });

  it("does not override terminal with editor when terminal is explicitly set", () => {
    const input = {
      editor: { fontSize: 16, fontFamily: "Custom Mono, monospace" },
      terminal: { fontSize: 20, fontFamily: "Another Font, monospace" },
    } as Partial<UserSettings>;
    const result = mergeWithDefaults(input);
    expect(result.terminal.fontSize).toBe(20);
    expect(result.terminal.fontFamily).toBe("Another Font, monospace");
  });
});

describe("validateSettings", () => {
  it("clamps app.fontSize below minimum to 8", () => {
    const settings = mergeWithDefaults({ app: { fontSize: 2 } } as Partial<UserSettings>);
    const result = validateSettings(settings);
    expect(result.app.fontSize).toBe(8);
  });

  it("clamps app.fontSize above maximum to 32", () => {
    const settings = mergeWithDefaults({ app: { fontSize: 100 } } as Partial<UserSettings>);
    const result = validateSettings(settings);
    expect(result.app.fontSize).toBe(32);
  });

  it("clamps editor.fontSize below minimum to 8", () => {
    const settings = mergeWithDefaults({ editor: { fontSize: 2 } } as Partial<UserSettings>);
    const result = validateSettings(settings);
    expect(result.editor.fontSize).toBe(8);
  });

  it("clamps editor.fontSize above maximum to 32", () => {
    const settings = mergeWithDefaults({ editor: { fontSize: 100 } } as Partial<UserSettings>);
    const result = validateSettings(settings);
    expect(result.editor.fontSize).toBe(32);
  });

  it("clamps terminal.fontSize below minimum to 8", () => {
    const settings = mergeWithDefaults({ terminal: { fontSize: 2 } } as Partial<UserSettings>);
    const result = validateSettings(settings);
    expect(result.terminal.fontSize).toBe(8);
  });

  it("clamps terminal.fontSize above maximum to 32", () => {
    const settings = mergeWithDefaults({ terminal: { fontSize: 100 } } as Partial<UserSettings>);
    const result = validateSettings(settings);
    expect(result.terminal.fontSize).toBe(32);
  });

  it("clamps opacity below minimum to 0.3", () => {
    const settings = mergeWithDefaults({ window: { opacity: 0.1 } } as Partial<UserSettings>);
    const result = validateSettings(settings);
    expect(result.window.opacity).toBe(0.3);
  });

  it("clamps opacity above maximum to 1.0", () => {
    const settings = mergeWithDefaults({ window: { opacity: 2.0 } } as Partial<UserSettings>);
    const result = validateSettings(settings);
    expect(result.window.opacity).toBe(1.0);
  });

  it("clamps zoomLevel below minimum to -5", () => {
    const settings = mergeWithDefaults({ window: { zoomLevel: -10 } } as Partial<UserSettings>);
    const result = validateSettings(settings);
    expect(result.window.zoomLevel).toBe(-5);
  });

  it("clamps zoomLevel above maximum to 5", () => {
    const settings = mergeWithDefaults({ window: { zoomLevel: 10 } } as Partial<UserSettings>);
    const result = validateSettings(settings);
    expect(result.window.zoomLevel).toBe(5);
  });

  it("passes through valid values unchanged", () => {
    const settings = mergeWithDefaults({
      app: { fontSize: 14 },
      editor: { fontSize: 13 },
      terminal: { fontSize: 16 },
      window: { opacity: 0.9, zoomLevel: 2 },
    } as Partial<UserSettings>);
    const result = validateSettings(settings);
    expect(result.app.fontSize).toBe(14);
    expect(result.editor.fontSize).toBe(13);
    expect(result.terminal.fontSize).toBe(16);
    expect(result.window.opacity).toBe(0.9);
    expect(result.window.zoomLevel).toBe(2);
  });

  it("handles NaN fontSize by clamping to minimum", () => {
    const settings = mergeWithDefaults({});
    settings.editor.fontSize = NaN;
    settings.terminal.fontSize = NaN;
    settings.app.fontSize = NaN;
    const result = validateSettings(settings);
    expect(result.editor.fontSize).toBe(8);
    expect(result.terminal.fontSize).toBe(8);
    expect(result.app.fontSize).toBe(8);
  });
});
