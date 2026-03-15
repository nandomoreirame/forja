import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TerminalSession } from "../terminal-session";

// Mock xterm.js — track all created instances for assertion
const mockOpen = vi.fn((container: HTMLElement) => {
  // xterm.js creates a textarea inside the container for input handling
  const textarea = document.createElement("textarea");
  container.appendChild(textarea);
});
const mockWrite = vi.fn();
const mockDispose = vi.fn();
const mockOnData = vi.fn().mockReturnValue({ dispose: vi.fn() });
const mockLoadAddon = vi.fn();
const mockFocus = vi.fn();
const mockGetSelection = vi.fn().mockReturnValue("");
let capturedKeyHandler: ((event: KeyboardEvent) => boolean) | undefined;

const terminalInstances: Array<{ options: Record<string, unknown> }> = [];

vi.mock("@xterm/xterm", () => ({
  Terminal: class MockTerminal {
    open = mockOpen;
    write = mockWrite;
    dispose = mockDispose;
    onData = mockOnData;
    loadAddon = mockLoadAddon;
    focus = mockFocus;
    getSelection = mockGetSelection;
    attachCustomKeyEventHandler = vi.fn(
      (handler: (event: KeyboardEvent) => boolean) => {
        capturedKeyHandler = handler;
      },
    );
    options: Record<string, unknown> = {};
    rows = 24;
    cols = 80;
    constructor() {
      terminalInstances.push(this);
    }
  },
}));

vi.mock("@xterm/addon-fit", () => ({
  FitAddon: class MockFitAddon {
    fit = vi.fn();
    proposeDimensions = vi.fn().mockReturnValue({ rows: 24, cols: 80 });
    dispose = vi.fn();
  },
}));

let capturedWebLinksHandler: ((event: MouseEvent, uri: string) => void) | undefined;
vi.mock("@xterm/addon-web-links", () => ({
  WebLinksAddon: class MockWebLinksAddon {
    dispose = vi.fn();
    constructor(handler?: (event: MouseEvent, uri: string) => void) {
      capturedWebLinksHandler = handler;
    }
  },
}));

// Track WebglAddon instances for virtualization tests
const webglInstances: Array<{ dispose: ReturnType<typeof vi.fn> }> = [];
vi.mock("@xterm/addon-webgl", () => ({
  WebglAddon: class MockWebglAddon {
    dispose = vi.fn();
    constructor() {
      webglInstances.push(this);
    }
  },
}));

vi.mock("@xterm/xterm/css/xterm.css", () => ({}));

// Mock terminal instance cache
const mockCacheHas = vi.fn().mockReturnValue(false);
const mockCacheGet = vi.fn().mockReturnValue(undefined);
const mockCachePark = vi.fn();
const mockCacheDispose = vi.fn();
const mockCacheClear = vi.fn();
vi.mock("@/lib/terminal-instance-cache", () => ({
  terminalCache: {
    has: (...args: unknown[]) => mockCacheHas(...args),
    get: (...args: unknown[]) => mockCacheGet(...args),
    park: (...args: unknown[]) => mockCachePark(...args),
    dispose: (...args: unknown[]) => mockCacheDispose(...args),
    clear: (...args: unknown[]) => mockCacheClear(...args),
  },
}));

// Mock terminal-tabs store for hasTab guard
const mockHasTab = vi.fn().mockReturnValue(true);
vi.mock("@/stores/terminal-tabs", () => ({
  useTerminalTabsStore: Object.assign(vi.fn(), {
    getState: () => ({
      hasTab: mockHasTab,
    }),
  }),
}));

const mockRouteLinkClick = vi.fn();
vi.mock("@/lib/link-router", () => ({
  routeLinkClick: (...args: unknown[]) => mockRouteLinkClick(...args),
}));

const mockPtyWrite = vi.fn().mockResolvedValue(undefined);
const mockResize = vi.fn().mockResolvedValue(undefined);
const mockClose = vi.fn().mockResolvedValue(undefined);

vi.mock("@/hooks/use-pty", () => ({
  usePty: (options: { tabId: string; onData?: (data: string) => void; onExit?: (code: number) => void }) => {
    if (options.onData) {
      (globalThis as Record<string, unknown>).__ptyOnData = options.onData;
    }
    if (options.onExit) {
      (globalThis as Record<string, unknown>).__ptyOnExit = options.onExit;
    }
    return {
      isRunning: true,
      spawn: vi.fn().mockResolvedValue(options.tabId),
      write: mockPtyWrite,
      resize: mockResize,
      close: mockClose,
    };
  },
}));

describe("TerminalSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockOpen.mockClear();
    mockWrite.mockClear();
    mockDispose.mockClear();
    mockOnData.mockClear().mockReturnValue({ dispose: vi.fn() });
    mockLoadAddon.mockClear();
    mockFocus.mockClear();
    mockPtyWrite.mockClear();
    mockResize.mockClear();
    mockClose.mockClear();
    mockRouteLinkClick.mockClear();
    mockHasTab.mockReset().mockReturnValue(true);
    capturedWebLinksHandler = undefined;
    capturedKeyHandler = undefined;
    mockGetSelection.mockReset().mockReturnValue("");
    webglInstances.length = 0;
    terminalInstances.length = 0;
    mockCacheHas.mockReset().mockReturnValue(false);
    mockCacheGet.mockReset().mockReturnValue(undefined);
    mockCachePark.mockClear();
    mockCacheDispose.mockClear();
    mockCacheClear.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders with correct aria-label including tab name", () => {
    render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);
    const container = screen.getByRole("region", { name: /terminal/i });
    expect(container).toBeInTheDocument();
  });

  it("applies hidden class when not visible", () => {
    render(<TerminalSession tabId="tab-1" path="/test" isVisible={false} />);
    const container = screen.getByRole("region", { name: /terminal/i });
    expect(container).toHaveClass("hidden");
  });

  it("does not apply hidden class when visible", () => {
    render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);
    const container = screen.getByRole("region", { name: /terminal/i });
    expect(container).not.toHaveClass("hidden");
  });

  it("creates xterm Terminal on mount", () => {
    render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);
    expect(mockOpen).toHaveBeenCalled();
  });

  it("disposes terminal and calls close on unmount when tab is removed", () => {
    const { unmount } = render(
      <TerminalSession tabId="tab-1" path="/test" isVisible={true} />
    );
    // Tab no longer exists in store (intentional close)
    mockHasTab.mockReturnValue(false);
    unmount();
    expect(mockClose).toHaveBeenCalled();
    expect(mockDispose).toHaveBeenCalled();
  });

  it("does NOT call close on unmount when tab still exists in store (reorder/remount)", () => {
    const { unmount } = render(
      <TerminalSession tabId="tab-1" path="/test" isVisible={true} />
    );
    // Advance rAF so PTY is spawned (simulates normal usage, not strict mode fast remount)
    vi.advanceTimersByTime(16);
    // Tab still exists (reorder or React remount)
    mockHasTab.mockReturnValue(true);
    unmount();
    expect(mockClose).not.toHaveBeenCalled();
    // Terminal is parked (not disposed) for later reattach
    expect(mockDispose).not.toHaveBeenCalled();
    expect(mockCachePark).toHaveBeenCalled();
  });

  describe("link routing", () => {
    it("passes a custom handler to WebLinksAddon", () => {
      render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);
      expect(capturedWebLinksHandler).toBeDefined();
      expect(typeof capturedWebLinksHandler).toBe("function");
    });

    it("calls routeLinkClick when link handler is invoked", () => {
      render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);
      expect(capturedWebLinksHandler).toBeDefined();

      capturedWebLinksHandler!(new MouseEvent("click"), "http://localhost:3000");

      expect(mockRouteLinkClick).toHaveBeenCalledWith("http://localhost:3000");
    });
  });

  describe("autofocus", () => {
    it("focuses terminal on initial mount", async () => {
      render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);

      // The focus happens inside a requestAnimationFrame (~16ms)
      await vi.advanceTimersByTimeAsync(16);

      expect(mockFocus).toHaveBeenCalled();
    });

    it("focuses terminal when becoming visible (tab switch)", async () => {
      const { rerender } = render(
        <TerminalSession tabId="tab-1" path="/test" isVisible={false} />
      );
      await vi.advanceTimersByTimeAsync(16);
      mockFocus.mockClear();

      rerender(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);

      // The focus happens inside a double-RAF (~32ms)
      await vi.advanceTimersByTimeAsync(32);

      expect(mockFocus).toHaveBeenCalled();
    });

    it("does not focus terminal when becoming hidden", async () => {
      const { rerender } = render(
        <TerminalSession tabId="tab-1" path="/test" isVisible={true} />
      );

      // Clear the focus from initial mount (single RAF + double RAF)
      await vi.advanceTimersByTimeAsync(32);
      mockFocus.mockClear();

      rerender(<TerminalSession tabId="tab-1" path="/test" isVisible={false} />);
      await vi.advanceTimersByTimeAsync(32);

      expect(mockFocus).not.toHaveBeenCalled();
    });
  });

  describe("WebGL virtualization", () => {
    it("loads WebglAddon on mount", () => {
      render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);
      expect(webglInstances).toHaveLength(1);
    });

    it("disposes WebglAddon immediately when hidden", () => {
      const { rerender } = render(
        <TerminalSession tabId="tab-1" path="/test" isVisible={true} />
      );
      expect(webglInstances).toHaveLength(1);
      const webgl = webglInstances[0];

      rerender(<TerminalSession tabId="tab-1" path="/test" isVisible={false} />);
      expect(webgl.dispose).toHaveBeenCalledOnce();
    });

    it("recreates WebglAddon when terminal becomes visible after disposal", () => {
      const { rerender } = render(
        <TerminalSession tabId="tab-1" path="/test" isVisible={true} />
      );
      expect(webglInstances).toHaveLength(1);

      rerender(<TerminalSession tabId="tab-1" path="/test" isVisible={false} />);
      expect(webglInstances[0].dispose).toHaveBeenCalledOnce();

      rerender(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);
      expect(webglInstances).toHaveLength(2);
    });

    it("does not dispose WebGL twice when unmounting after hide", () => {
      const { unmount, rerender } = render(
        <TerminalSession tabId="tab-1" path="/test" isVisible={true} />
      );
      const webgl = webglInstances[0];

      rerender(<TerminalSession tabId="tab-1" path="/test" isVisible={false} />);
      expect(webgl.dispose).toHaveBeenCalledTimes(1);

      unmount();
      expect(webgl.dispose).toHaveBeenCalledTimes(1);
    });
  });

  describe("copy/paste keyboard shortcuts", () => {
    const mockClipboardWriteText = vi.fn().mockResolvedValue(undefined);
    const mockClipboardReadText = vi.fn().mockResolvedValue("");

    beforeEach(() => {
      mockClipboardWriteText.mockClear().mockResolvedValue(undefined);
      mockClipboardReadText.mockClear().mockResolvedValue("");
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: mockClipboardWriteText,
          readText: mockClipboardReadText,
        },
        writable: true,
        configurable: true,
      });
    });

    it("Ctrl+Shift+C copies selected terminal text to clipboard", () => {
      mockGetSelection.mockReturnValue("selected text");
      render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);

      expect(capturedKeyHandler).toBeDefined();

      const event = new KeyboardEvent("keydown", {
        key: "C",
        ctrlKey: true,
        shiftKey: true,
      });
      const result = capturedKeyHandler!(event);

      expect(result).toBe(false);
      expect(mockClipboardWriteText).toHaveBeenCalledWith("selected text");
    });

    it("Ctrl+Shift+C does nothing when no text is selected", () => {
      mockGetSelection.mockReturnValue("");
      render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);

      const event = new KeyboardEvent("keydown", {
        key: "C",
        ctrlKey: true,
        shiftKey: true,
      });
      capturedKeyHandler!(event);

      expect(mockClipboardWriteText).not.toHaveBeenCalled();
    });

    it("Ctrl+Shift+V does NOT call handlePaste directly (relies on native paste event)", async () => {
      mockClipboardReadText.mockResolvedValue("pasted text");
      render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);

      const event = new KeyboardEvent("keydown", {
        key: "V",
        ctrlKey: true,
        shiftKey: true,
      });
      const result = capturedKeyHandler!(event);

      // Should return false (block xterm VT processing)
      expect(result).toBe(false);

      // Should NOT call clipboard.readText — paste handled by native browser event
      await vi.advanceTimersByTimeAsync(0);
      expect(mockClipboardReadText).not.toHaveBeenCalled();
      expect(mockPtyWrite).not.toHaveBeenCalled();
    });

    it("Ctrl+C (without Shift) passes through to xterm for SIGINT", () => {
      render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);

      const event = new KeyboardEvent("keydown", {
        key: "c",
        ctrlKey: true,
        shiftKey: false,
      });
      const result = capturedKeyHandler!(event);

      expect(result).toBe(true);
    });

    it("does not trigger copy on keyup events", () => {
      mockGetSelection.mockReturnValue("some text");
      render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);

      const event = new KeyboardEvent("keyup", {
        key: "C",
        ctrlKey: true,
        shiftKey: true,
      });
      capturedKeyHandler!(event);

      expect(mockClipboardWriteText).not.toHaveBeenCalled();
    });
  });

  describe("background opacity", () => {
    it("keeps terminal background opaque even when opacity changes", async () => {
      const { useUserSettingsStore } = await import("@/stores/user-settings");
      render(<TerminalSession tabId="tab-opacity" path="/test" isVisible={true} />);

      const terminal = terminalInstances[terminalInstances.length - 1];
      expect(terminal).toBeDefined();

      // Trigger opacity change via the real store
      const current = useUserSettingsStore.getState().settings;
      useUserSettingsStore.getState().setSettings({
        ...current,
        window: { ...current.window, opacity: 0.7 },
      });

      // WebGL renderer does not support rgba — background stays opaque
      const theme = terminal.options.theme as { background?: string };
      expect(theme).toBeDefined();
      expect(theme.background).not.toContain("rgba(");
      expect(theme.background).toBe("#1e1e2e");
    });

    it("keeps hex background regardless of opacity value", async () => {
      const { useUserSettingsStore } = await import("@/stores/user-settings");
      render(<TerminalSession tabId="tab-opacity2" path="/test" isVisible={true} />);

      const terminal = terminalInstances[terminalInstances.length - 1];
      const current = useUserSettingsStore.getState().settings;

      // Set opacity < 1
      useUserSettingsStore.getState().setSettings({
        ...current,
        window: { ...current.window, opacity: 0.5 },
      });

      // Set opacity back to 1
      useUserSettingsStore.getState().setSettings({
        ...current,
        window: { ...current.window, opacity: 1.0 },
      });

      const theme = terminal.options.theme as { background?: string };
      expect(theme.background).not.toContain("rgba(");
    });
  });

  describe("dead key / IME composition", () => {
    it("returns false for events during composition (isComposing)", () => {
      render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);
      expect(capturedKeyHandler).toBeDefined();

      const event = new KeyboardEvent("keydown", {
        key: "c",
        isComposing: true,
      });
      const result = capturedKeyHandler!(event);

      expect(result).toBe(false);
    });

    it("returns false for Dead key events", () => {
      render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);
      expect(capturedKeyHandler).toBeDefined();

      const event = new KeyboardEvent("keydown", {
        key: "Dead",
      });
      const result = capturedKeyHandler!(event);

      expect(result).toBe(false);
    });

    it("returns false for post-composition keydown on Linux (composingRef flag)", async () => {
      render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);
      expect(capturedKeyHandler).toBeDefined();

      // Simulate the Linux IME dead-key sequence:
      // 1. compositionstart fires on the textarea
      const container = screen.getByRole("region", { name: /terminal/i });
      const textarea = container.querySelector("textarea")!;
      expect(textarea).toBeTruthy();

      textarea.dispatchEvent(new Event("compositionstart"));

      // 2. compositionend fires (character already emitted by xterm's handler)
      textarea.dispatchEvent(new Event("compositionend"));

      // 3. Post-composition keydown fires with isComposing: false
      //    This should be blocked because composingRef is still true
      const postCompEvent = new KeyboardEvent("keydown", {
        key: "\u00e7", // ç
        isComposing: false,
      });
      const result = capturedKeyHandler!(postCompEvent);
      expect(result).toBe(false);

      // 4. After the setTimeout(0), composingRef resets and normal keys work again
      await vi.advanceTimersByTimeAsync(0);

      const normalEvent = new KeyboardEvent("keydown", {
        key: "a",
        isComposing: false,
      });
      expect(capturedKeyHandler!(normalEvent)).toBe(true);
    });

    it("still allows normal key events through", () => {
      render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);
      expect(capturedKeyHandler).toBeDefined();

      const event = new KeyboardEvent("keydown", {
        key: "a",
        isComposing: false,
      });
      const result = capturedKeyHandler!(event);

      expect(result).toBe(true);
    });
  });

  describe("terminal instance cache", () => {
    it("parks terminal on unmount when tab still exists in store", () => {
      const { unmount } = render(
        <TerminalSession tabId="tab-cache-1" path="/test" isVisible={true} />
      );
      // Advance rAF so spawn() runs and PTY is marked as started
      vi.advanceTimersByTime(16);
      mockHasTab.mockReturnValue(true);
      unmount();

      expect(mockCachePark).toHaveBeenCalledWith(
        "tab-cache-1",
        expect.anything(), // Terminal instance
        expect.anything(), // FitAddon instance
        expect.anything(), // hostElement
      );
      expect(mockClose).not.toHaveBeenCalled();
    });

    it("disposes cache and calls close on unmount when tab is removed", () => {
      const { unmount } = render(
        <TerminalSession tabId="tab-cache-2" path="/test" isVisible={true} />
      );
      mockHasTab.mockReturnValue(false);
      unmount();

      expect(mockCachePark).not.toHaveBeenCalled();
      expect(mockClose).toHaveBeenCalled();
      expect(mockCacheDispose).toHaveBeenCalledWith("tab-cache-2");
    });

    it("reattaches cached terminal on mount without calling spawn", async () => {
      // Simulate a cached terminal entry
      const mockTerminal = {
        write: vi.fn(),
        dispose: vi.fn(),
        onData: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        loadAddon: vi.fn(),
        focus: vi.fn(),
        getSelection: vi.fn().mockReturnValue(""),
        attachCustomKeyEventHandler: vi.fn(),
        options: {},
      };
      const mockFitAddonCached = {
        fit: vi.fn(),
        proposeDimensions: vi.fn().mockReturnValue({ rows: 24, cols: 80 }),
        dispose: vi.fn(),
      };
      const mockHost = document.createElement("div");

      mockCacheGet.mockReturnValue({
        terminal: mockTerminal,
        fitAddon: mockFitAddonCached,
        hostElement: mockHost,
      });

      render(
        <TerminalSession tabId="tab-cached" path="/test" isVisible={true} />
      );

      // Should NOT create a new Terminal (mockOpen is for new xterm instances)
      expect(mockOpen).not.toHaveBeenCalled();

      // The hostElement should be appended to the container
      const container = screen.getByRole("region", { name: /terminal/i });
      const innerContainer = container.querySelector(".h-full.w-full.pt-3");
      expect(innerContainer?.querySelector("div")?.contains(mockHost)).toBe(true);
    });

    it("does not call terminal.dispose() when parking", () => {
      const { unmount } = render(
        <TerminalSession tabId="tab-park" path="/test" isVisible={true} />
      );
      mockHasTab.mockReturnValue(true);
      mockDispose.mockClear();

      // Advance so spawn() fires (rAF)
      vi.advanceTimersByTime(16);
      unmount();

      // terminal.dispose() should NOT be called when parking
      expect(mockDispose).not.toHaveBeenCalled();
    });

    it("disposes terminal without parking when PTY was never spawned (strict mode fast remount)", () => {
      const { unmount } = render(
        <TerminalSession tabId="tab-strict" path="/test" isVisible={true} />
      );
      // Unmount BEFORE rAF fires (simulates React strict mode fast cleanup)
      mockHasTab.mockReturnValue(true);
      unmount();

      // Should NOT park (PTY never started)
      expect(mockCachePark).not.toHaveBeenCalled();
      // Should dispose the terminal
      expect(mockDispose).toHaveBeenCalled();
    });
  });
});
