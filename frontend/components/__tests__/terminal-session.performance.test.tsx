import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TerminalSession } from "../terminal-session";

const mockOpen = vi.fn();
const mockWrite = vi.fn();
const mockDispose = vi.fn();
const mockOnData = vi.fn().mockReturnValue({ dispose: vi.fn() });
const mockLoadAddon = vi.fn();
const mockFocus = vi.fn();
const mockResize = vi.fn().mockResolvedValue(undefined);
const mockClose = vi.fn().mockResolvedValue(undefined);
const mockSpawn = vi.fn().mockResolvedValue("tab-1");
const mockTerminalCtor = vi.fn();

let resizeObserverCallback: ResizeObserverCallback | undefined;

vi.mock("@xterm/xterm", () => ({
  Terminal: class MockTerminal {
    constructor() {
      mockTerminalCtor();
    }
    open = mockOpen;
    write = mockWrite;
    dispose = mockDispose;
    onData = mockOnData;
    loadAddon = mockLoadAddon;
    focus = mockFocus;
    attachCustomKeyEventHandler = vi.fn();
    getSelection = vi.fn(() => "");
    options = {};
  },
}));

vi.mock("@xterm/addon-fit", () => ({
  FitAddon: class MockFitAddon {
    fit = vi.fn();
    proposeDimensions = vi.fn(() => ({ rows: 24, cols: 80 }));
  },
}));

vi.mock("@xterm/addon-web-links", () => ({
  WebLinksAddon: class MockWebLinksAddon {},
}));

vi.mock("@xterm/addon-webgl", () => ({
  WebglAddon: class MockWebglAddon {
    dispose = vi.fn();
  },
}));

vi.mock("@xterm/xterm/css/xterm.css", () => ({}));

vi.mock("@/hooks/use-pty", () => ({
  usePty: () => ({
    isRunning: true,
    spawn: mockSpawn,
    write: vi.fn().mockResolvedValue(undefined),
    resize: mockResize,
    close: mockClose,
  }),
}));

vi.mock("@/stores/theme", () => ({
  useThemeStore: {
    getState: () => ({
      getActiveTheme: () => ({
        id: "catppuccin-mocha",
        type: "dark",
        colors: {
          base: "#1e1e2e",
          mantle: "#181825",
          surface: "#313244",
          overlay: "#45475a",
          highlight: "#585b70",
          text: "#cdd6f4",
          subtext: "#bac2de",
          muted: "#6c7086",
          accent: "#cba6f7",
          accentHover: "#b4befe",
          accentSubtle: "#313244",
          success: "#a6e3a1",
          warning: "#f9e2af",
          error: "#f38ba8",
          info: "#89b4fa",
        },
        terminal: {
          black: "#45475a",
          red: "#f38ba8",
          green: "#a6e3a1",
          yellow: "#f9e2af",
          blue: "#89b4fa",
          magenta: "#cba6f7",
          cyan: "#94e2d5",
          white: "#bac2de",
          brightBlack: "#585b70",
          brightRed: "#f38ba8",
          brightGreen: "#a6e3a1",
          brightYellow: "#f9e2af",
          brightBlue: "#89b4fa",
          brightMagenta: "#cba6f7",
          brightCyan: "#94e2d5",
          brightWhite: "#a6adc8",
        },
      }),
    }),
    subscribe: vi.fn(() => () => {}),
  },
}));

vi.mock("@/themes/apply", () => ({
  buildTerminalTheme: () => ({ background: "#1e1e2e", foreground: "#cdd6f4" }),
}));

describe("TerminalSession performance guardrails", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockOpen.mockClear();
    mockWrite.mockClear();
    mockDispose.mockClear();
    mockOnData.mockClear().mockReturnValue({ dispose: vi.fn() });
    mockLoadAddon.mockClear();
    mockFocus.mockClear();
    mockResize.mockClear();
    mockClose.mockClear();
    mockSpawn.mockClear();
    mockTerminalCtor.mockClear();

    vi.stubGlobal(
      "ResizeObserver",
      class MockResizeObserver {
        constructor(cb: ResizeObserverCallback) {
          resizeObserverCallback = cb;
        }
        observe = vi.fn();
        disconnect = vi.fn();
      },
    );
  });

  it("does not send resize updates while hidden even if ResizeObserver fires", async () => {
    render(<TerminalSession tabId="tab-1" path="/test" isVisible={false} />);

    await vi.advanceTimersByTimeAsync(16);
    mockResize.mockClear();

    resizeObserverCallback?.([], {} as ResizeObserver);
    await vi.advanceTimersByTimeAsync(200);

    expect(mockResize).not.toHaveBeenCalled();
  });

  it("does not recreate the terminal instance on visibility-only rerenders", async () => {
    const { rerender } = render(
      <TerminalSession tabId="tab-1" path="/test" isVisible={true} />,
    );

    await vi.advanceTimersByTimeAsync(32);

    rerender(<TerminalSession tabId="tab-1" path="/test" isVisible={false} />);
    rerender(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);

    expect(mockTerminalCtor).toHaveBeenCalledTimes(1);
  });
});
