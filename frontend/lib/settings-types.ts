export interface FontSettings {
  fontFamily: string;
  fontSize: number;
  lineHeight?: number;
}

export interface ThemeSettings {
  active: string;
  custom: Array<{
    id: string;
    name: string;
    type: "dark" | "light";
    colors: Record<string, string>;
    terminal: Record<string, string>;
  }>;
}

export interface UserSettings {
  app: FontSettings;
  editor: FontSettings;
  terminal: FontSettings;
  window: { zoomLevel: number; opacity: number };
  sessions: Record<string, { args?: string[]; env?: Record<string, string> }>;
  theme: ThemeSettings;
}

export const DEFAULT_SETTINGS: UserSettings = {
  app: {
    fontFamily: "Geist Sans, Inter, system-ui, sans-serif",
    fontSize: 14,
  },
  editor: {
    fontFamily:
      "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
    fontSize: 13,
    lineHeight: 1.5,
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
  theme: {
    active: "catppuccin-mocha",
    custom: [],
  },
};

function clamp(value: number, min: number, max: number): number {
  if (isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export function mergeWithDefaults(
  partial: Partial<UserSettings> | undefined | null,
): UserSettings {
  const input = partial ?? {};

  const editor = {
    ...DEFAULT_SETTINGS.editor,
    ...(input.editor ?? {}),
  };

  // Backward compat: if terminal section is absent but editor was explicitly
  // provided, use editor values for terminal (old format had only editor)
  const hasTerminal = input.terminal !== undefined;
  const hasEditor = input.editor !== undefined;
  const terminal = hasTerminal
    ? { ...DEFAULT_SETTINGS.terminal, ...(input.terminal ?? {}) }
    : hasEditor
      ? { ...DEFAULT_SETTINGS.terminal, ...editor }
      : { ...DEFAULT_SETTINGS.terminal };

  return {
    app: {
      ...DEFAULT_SETTINGS.app,
      ...(input.app ?? {}),
    },
    editor,
    terminal,
    window: {
      ...DEFAULT_SETTINGS.window,
      ...(input.window ?? {}),
    },
    sessions: {
      ...DEFAULT_SETTINGS.sessions,
      ...(input.sessions ?? {}),
    },
    theme: {
      ...DEFAULT_SETTINGS.theme,
      ...(input.theme ?? {}),
      custom: input.theme?.custom ?? DEFAULT_SETTINGS.theme.custom,
    },
  };
}

export function validateSettings(settings: UserSettings): UserSettings {
  return {
    ...settings,
    app: {
      ...settings.app,
      fontSize: clamp(settings.app.fontSize, 8, 32),
    },
    editor: {
      ...settings.editor,
      fontSize: clamp(settings.editor.fontSize, 8, 32),
      lineHeight: settings.editor.lineHeight
        ? clamp(settings.editor.lineHeight, 1.0, 3.0)
        : undefined,
    },
    terminal: {
      ...settings.terminal,
      fontSize: clamp(settings.terminal.fontSize, 8, 32),
    },
    window: {
      ...settings.window,
      zoomLevel: clamp(settings.window.zoomLevel, -5, 5),
      opacity: clamp(settings.window.opacity, 0.3, 1.0),
    },
  };
}
