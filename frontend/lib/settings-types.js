export const DEFAULT_SETTINGS = {
    statusbar: { visible: true },
    app: {
        fontFamily: "Geist Sans, Inter, system-ui, sans-serif",
        fontSize: 14,
    },
    editor: {
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
        fontSize: 13,
    },
    terminal: {
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
        fontSize: 14,
    },
    window: { zoomLevel: 0, opacity: 1.0 },
    sessions: {},
};
function clamp(value, min, max) {
    if (isNaN(value))
        return min;
    return Math.min(Math.max(value, min), max);
}
export function mergeWithDefaults(partial) {
    const input = partial ?? {};
    const editor = {
        ...DEFAULT_SETTINGS.editor,
        ...(input.editor ?? {}),
    };
    const hasTerminal = input.terminal !== undefined;
    const hasEditor = input.editor !== undefined;
    const terminal = hasTerminal
        ? { ...DEFAULT_SETTINGS.terminal, ...(input.terminal ?? {}) }
        : hasEditor
            ? { ...DEFAULT_SETTINGS.terminal, ...editor }
            : { ...DEFAULT_SETTINGS.terminal };
    return {
        statusbar: {
            ...DEFAULT_SETTINGS.statusbar,
            ...(input.statusbar ?? {}),
        },
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
        sessions: input.sessions ?? {},
    };
}
export function validateSettings(settings) {
    return {
        ...settings,
        app: {
            ...settings.app,
            fontSize: clamp(settings.app.fontSize, 8, 32),
        },
        editor: {
            ...settings.editor,
            fontSize: clamp(settings.editor.fontSize, 8, 32),
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
