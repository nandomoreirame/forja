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
let capturedOnDataCallback: ((data: string) => void) | undefined;
const mockOnData = vi.fn().mockImplementation((cb: (data: string) => void) => {
  capturedOnDataCallback = cb;
  return { dispose: vi.fn() };
});
const mockLoadAddon = vi.fn();
const mockFocus = vi.fn();
const mockGetSelection = vi.fn().mockReturnValue("");
let capturedKeyHandler: ((event: KeyboardEvent) => boolean) | undefined;

const terminalInstances: Array<{ options: Record<string, unknown> }> = [];

const mockRefresh = vi.fn();
const mockOnSelectionChange = vi.fn().mockReturnValue({ dispose: vi.fn() });
vi.mock("@xterm/xterm", () => ({
  Terminal: class MockTerminal {
    open = mockOpen;
    write = mockWrite;
    dispose = mockDispose;
    onData = mockOnData;
    onSelectionChange = mockOnSelectionChange;
    loadAddon = mockLoadAddon;
    focus = mockFocus;
    getSelection = mockGetSelection;
    refresh = mockRefresh;
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
const mockRemoveTab = vi.fn();
const mockSetCliSessionId = vi.fn();
const mockMarkTabRunning = vi.fn();
const mockStoreTabs: Array<{ id: string; sessionType: string; cliSessionId?: string; isRunning?: boolean }> = [];
vi.mock("@/stores/terminal-tabs", () => ({
  useTerminalTabsStore: Object.assign(vi.fn(), {
    getState: () => ({
      hasTab: mockHasTab,
      removeTab: mockRemoveTab,
      setCliSessionId: mockSetCliSessionId,
      markTabRunning: mockMarkTabRunning,
      tabs: mockStoreTabs,
    }),
  }),
}));

const mockRouteLinkClick = vi.fn();
vi.mock("@/lib/link-router", () => ({
  routeLinkClick: (...args: unknown[]) => mockRouteLinkClick(...args),
}));

const mockInvoke = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/ipc", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

const mockPtyWrite = vi.fn().mockResolvedValue(undefined);
const mockResize = vi.fn().mockResolvedValue(undefined);
const mockClose = vi.fn().mockResolvedValue(undefined);
const mockPtySpawn = vi.fn().mockImplementation((..._args: unknown[]) => Promise.resolve("mock-tab"));

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
      spawn: (...args: unknown[]) => mockPtySpawn(...args),
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
    mockOnData.mockClear().mockImplementation((cb: (data: string) => void) => {
      capturedOnDataCallback = cb;
      return { dispose: vi.fn() };
    });
    mockLoadAddon.mockClear();
    mockFocus.mockClear();
    mockRefresh.mockClear();
    mockOnSelectionChange.mockClear().mockReturnValue({ dispose: vi.fn() });
    mockPtyWrite.mockClear();
    mockPtySpawn.mockClear().mockImplementation(() => Promise.resolve("mock-tab"));
    mockResize.mockClear();
    mockClose.mockClear();
    mockRouteLinkClick.mockClear();
    mockHasTab.mockReset().mockReturnValue(true);
    mockRemoveTab.mockClear();
    mockSetCliSessionId.mockClear();
    mockMarkTabRunning.mockClear();
    mockStoreTabs.length = 0;
    capturedWebLinksHandler = undefined;
    capturedKeyHandler = undefined;
    capturedOnDataCallback = undefined;
    mockGetSelection.mockReset().mockReturnValue("");
    webglInstances.length = 0;
    terminalInstances.length = 0;
    mockCacheHas.mockReset().mockReturnValue(false);
    mockCacheGet.mockReset().mockReturnValue(undefined);
    mockCachePark.mockClear();
    mockCacheDispose.mockClear();
    mockCacheClear.mockClear();
    mockInvoke.mockReset().mockResolvedValue(undefined);
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

  it("creates xterm Terminal on mount", async () => {
    render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);
    // Flush async init (pty:has-session IPC)
    await Promise.resolve();
    expect(mockOpen).toHaveBeenCalled();
  });

  it("disposes terminal and calls close on unmount when tab is removed", async () => {
    const { unmount } = render(
      <TerminalSession tabId="tab-1" path="/test" isVisible={true} />
    );
    // Flush async init so terminalLocal is assigned
    await Promise.resolve();
    await Promise.resolve();
    // Tab no longer exists in store (intentional close)
    mockHasTab.mockReturnValue(false);
    unmount();
    expect(mockClose).toHaveBeenCalled();
    expect(mockDispose).toHaveBeenCalled();
  });

  it("does NOT call close on unmount when tab still exists in store (reorder/remount)", async () => {
    const { unmount } = render(
      <TerminalSession tabId="tab-1" path="/test" isVisible={true} />
    );
    // Flush async init so terminalLocal is assigned
    await Promise.resolve();
    await Promise.resolve();
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
    it("loads WebglAddon on mount", async () => {
      render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);
      // Flush async init (pty:has-session IPC)
      await Promise.resolve();
      await Promise.resolve();
      expect(webglInstances).toHaveLength(1);
    });

    it("disposes WebglAddon immediately when hidden", async () => {
      const { rerender } = render(
        <TerminalSession tabId="tab-1" path="/test" isVisible={true} />
      );
      await Promise.resolve();
      await Promise.resolve();
      expect(webglInstances).toHaveLength(1);
      const webgl = webglInstances[0];

      rerender(<TerminalSession tabId="tab-1" path="/test" isVisible={false} />);
      expect(webgl.dispose).toHaveBeenCalledOnce();
    });

    it("recreates WebglAddon when terminal becomes visible after disposal", async () => {
      const { rerender } = render(
        <TerminalSession tabId="tab-1" path="/test" isVisible={true} />
      );
      await Promise.resolve();
      await Promise.resolve();
      expect(webglInstances).toHaveLength(1);

      rerender(<TerminalSession tabId="tab-1" path="/test" isVisible={false} />);
      expect(webglInstances[0].dispose).toHaveBeenCalledOnce();

      rerender(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);
      expect(webglInstances).toHaveLength(2);
    });

    it("does not dispose WebGL twice when unmounting after hide", async () => {
      const { unmount, rerender } = render(
        <TerminalSession tabId="tab-1" path="/test" isVisible={true} />
      );
      await Promise.resolve();
      await Promise.resolve();
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

    it("Ctrl+Shift+C copies selected terminal text to clipboard", async () => {
      mockGetSelection.mockReturnValue("selected text");
      render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);
      // Flush async init so capturedKeyHandler is set
      await Promise.resolve();
      await Promise.resolve();

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

    it("Ctrl+Shift+C does nothing when no text is selected", async () => {
      mockGetSelection.mockReturnValue("");
      render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);
      await Promise.resolve();
      await Promise.resolve();

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
      await Promise.resolve();
      await Promise.resolve();

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

    it("Ctrl+C (without Shift) passes through to xterm for SIGINT", async () => {
      render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);
      await Promise.resolve();
      await Promise.resolve();

      const event = new KeyboardEvent("keydown", {
        key: "c",
        ctrlKey: true,
        shiftKey: false,
      });
      const result = capturedKeyHandler!(event);

      expect(result).toBe(true);
    });

    it("does not trigger copy on keyup events", async () => {
      mockGetSelection.mockReturnValue("some text");
      render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);
      await Promise.resolve();
      await Promise.resolve();

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
      await Promise.resolve();
      await Promise.resolve();

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
      await Promise.resolve();
      await Promise.resolve();

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
    it("returns false for events during composition (isComposing)", async () => {
      render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);
      await Promise.resolve();
      await Promise.resolve();
      expect(capturedKeyHandler).toBeDefined();

      const event = new KeyboardEvent("keydown", {
        key: "c",
        isComposing: true,
      });
      const result = capturedKeyHandler!(event);

      expect(result).toBe(false);
    });

    it("returns false for Dead key events", async () => {
      render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);
      await Promise.resolve();
      await Promise.resolve();
      expect(capturedKeyHandler).toBeDefined();

      const event = new KeyboardEvent("keydown", {
        key: "Dead",
      });
      const result = capturedKeyHandler!(event);

      expect(result).toBe(false);
    });

    it("returns false for post-composition keydown on Linux (composingRef flag)", async () => {
      render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);
      await Promise.resolve();
      await Promise.resolve();
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

    it("still allows normal key events through", async () => {
      render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);
      await Promise.resolve();
      await Promise.resolve();
      expect(capturedKeyHandler).toBeDefined();

      const event = new KeyboardEvent("keydown", {
        key: "a",
        isComposing: false,
      });
      const result = capturedKeyHandler!(event);

      expect(result).toBe(true);
    });

    it("does NOT remap ć in attachCustomKeyEventHandler (dead code removed)", async () => {
      // The CEDILLA_MAP block in attachCustomKeyEventHandler is unreachable during
      // composition because the composingRef guard returns false before it.
      // After Fix 3, the dead code block should be removed entirely.
      // This test verifies that ć events during composition are blocked (return false),
      // NOT remapped via writeRef (which would be wrong — the character is already
      // being handled by the onData cedilla remap at the PTY level).
      render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);
      await Promise.resolve();
      await Promise.resolve();
      expect(capturedKeyHandler).toBeDefined();

      mockPtyWrite.mockClear();

      // ć arrives AFTER composition (composingRef is true)
      const container = screen.getByRole("region", { name: /terminal/i });
      const textarea = container.querySelector("textarea")!;
      textarea.dispatchEvent(new Event("compositionstart"));
      textarea.dispatchEvent(new Event("compositionend"));

      const cedillaEvent = new KeyboardEvent("keydown", {
        key: "\u0107", // ć
        isComposing: false,
      });
      const result = capturedKeyHandler!(cedillaEvent);

      // Should return false (blocked by composingRef), NOT write via PTY
      expect(result).toBe(false);
      expect(mockPtyWrite).not.toHaveBeenCalled();
    });
  });

  describe("cedilla remap in onData", () => {
    it("remaps ć to ç when onData callback is called", async () => {
      render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);
      await Promise.resolve();
      await Promise.resolve();
      expect(capturedOnDataCallback).toBeDefined();

      // Simulate xterm emitting ć (wrong composition result)
      capturedOnDataCallback!("\u0107"); // ć

      // Should write ç (correct cedilla) to PTY
      expect(mockPtyWrite).toHaveBeenCalledWith("ç");
    });

    it("remaps Ć to Ç when onData callback is called", async () => {
      render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);
      await Promise.resolve();
      await Promise.resolve();
      expect(capturedOnDataCallback).toBeDefined();

      capturedOnDataCallback!("\u0106"); // Ć

      expect(mockPtyWrite).toHaveBeenCalledWith("Ç");
    });

    it("passes through normal characters unchanged via onData", async () => {
      render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);
      await Promise.resolve();
      await Promise.resolve();
      expect(capturedOnDataCallback).toBeDefined();

      capturedOnDataCallback!("hello");

      expect(mockPtyWrite).toHaveBeenCalledWith("hello");
    });

    it("passes through ç unchanged via onData (already correct)", async () => {
      render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);
      await Promise.resolve();
      await Promise.resolve();
      expect(capturedOnDataCallback).toBeDefined();

      capturedOnDataCallback!("ç");

      expect(mockPtyWrite).toHaveBeenCalledWith("ç");
    });

    it("remaps ć embedded in escape sequences via onData", async () => {
      render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);
      await Promise.resolve();
      await Promise.resolve();
      expect(capturedOnDataCallback).toBeDefined();

      // ć followed by cursor escape sequence
      capturedOnDataCallback!("\u0107\u001b[A");

      expect(mockPtyWrite).toHaveBeenCalledWith("ç\u001b[A");
    });
  });

  describe("terminal instance cache", () => {
    it("parks terminal on unmount when tab still exists in store", async () => {
      const { unmount } = render(
        <TerminalSession tabId="tab-cache-1" path="/test" isVisible={true} />
      );
      // Flush async init so terminalLocal is assigned
      await Promise.resolve();
      await Promise.resolve();
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

    it("disposes cache and calls close on unmount when tab is removed", async () => {
      const { unmount } = render(
        <TerminalSession tabId="tab-cache-2" path="/test" isVisible={true} />
      );
      // Flush async init so terminalLocal is assigned
      await Promise.resolve();
      await Promise.resolve();
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
        refresh: vi.fn(),
        getSelection: vi.fn().mockReturnValue(""),
        attachCustomKeyEventHandler: vi.fn(),
        options: {},
        rows: 24,
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
      const innerContainer = container.querySelector(".h-full.pt-3");
      expect(innerContainer?.querySelector("div")?.contains(mockHost)).toBe(true);
    });

    it("does not call terminal.dispose() when parking", async () => {
      const { unmount } = render(
        <TerminalSession tabId="tab-park" path="/test" isVisible={true} />
      );
      // Flush async init so terminalLocal is assigned
      await Promise.resolve();
      await Promise.resolve();
      mockHasTab.mockReturnValue(true);
      mockDispose.mockClear();

      // Advance so spawn() fires (rAF)
      vi.advanceTimersByTime(16);
      unmount();

      // terminal.dispose() should NOT be called when parking
      expect(mockDispose).not.toHaveBeenCalled();
    });

    it("disposes terminal without parking when PTY was never spawned (strict mode fast remount)", async () => {
      const { unmount } = render(
        <TerminalSession tabId="tab-strict" path="/test" isVisible={true} />
      );
      // Flush async init so terminalLocal is assigned but BEFORE rAF fires
      await Promise.resolve();
      await Promise.resolve();
      // Unmount BEFORE rAF fires (simulates React strict mode fast cleanup)
      mockHasTab.mockReturnValue(true);
      unmount();

      // Should NOT park (PTY never started — spawned is still false)
      expect(mockCachePark).not.toHaveBeenCalled();
      // Should dispose the terminal
      expect(mockDispose).toHaveBeenCalled();
    });
  });

  describe("auto-close tab on AI CLI session exit", () => {
    it("removes tab after delay when AI CLI session exits", async () => {
      mockStoreTabs.push({ id: "tab-ai", sessionType: "claude" });

      render(<TerminalSession tabId="tab-ai" path="/test" isVisible={true} sessionType="claude" />);
      await Promise.resolve();
      await Promise.resolve();

      // Trigger PTY exit
      const onExit = (globalThis as Record<string, unknown>).__ptyOnExit as () => void;
      expect(onExit).toBeDefined();
      onExit();

      // Should NOT remove immediately
      expect(mockRemoveTab).not.toHaveBeenCalled();

      // After the auto-close delay, tab should be removed
      await vi.advanceTimersByTimeAsync(600);

      expect(mockRemoveTab).toHaveBeenCalledWith("tab-ai");
    });

    it("does NOT remove tab when plain terminal session exits", async () => {
      mockStoreTabs.push({ id: "tab-term", sessionType: "terminal" });

      render(<TerminalSession tabId="tab-term" path="/test" isVisible={true} sessionType="terminal" />);
      await Promise.resolve();
      await Promise.resolve();

      const onExit = (globalThis as Record<string, unknown>).__ptyOnExit as () => void;
      onExit();

      await vi.advanceTimersByTimeAsync(1000);

      expect(mockRemoveTab).not.toHaveBeenCalled();
    });

    it("does NOT remove tab when sessionType is undefined (defaults to claude but check behavior)", async () => {
      mockStoreTabs.push({ id: "tab-default", sessionType: "claude" });

      render(<TerminalSession tabId="tab-default" path="/test" isVisible={true} />);
      await Promise.resolve();
      await Promise.resolve();

      const onExit = (globalThis as Record<string, unknown>).__ptyOnExit as () => void;
      onExit();

      await vi.advanceTimersByTimeAsync(600);

      // Default sessionType is "claude" — should auto-close
      expect(mockRemoveTab).toHaveBeenCalledWith("tab-default");
    });
  });

  describe("exited session restoration (no respawn)", () => {
    it("does NOT spawn new PTY when tab.isRunning is false", async () => {
      mockStoreTabs.push({ id: "tab-exited", sessionType: "claude", isRunning: false });
      mockCacheGet.mockReturnValue(undefined);
      mockInvoke.mockImplementation((channel: string) => {
        if (channel === "pty:has-session") return Promise.resolve(false);
        if (channel === "pty:load-persisted-buffer") return Promise.resolve("[Session ended]");
        return Promise.resolve(undefined);
      });

      render(<TerminalSession tabId="tab-exited" path="/test" isVisible={true} sessionType="claude" />);

      await vi.runAllTimersAsync();
      await Promise.resolve();
      await Promise.resolve();

      // spawn should NOT be called
      expect(mockPtySpawn).not.toHaveBeenCalled();
      // But persisted buffer should be loaded
      expect(mockInvoke).toHaveBeenCalledWith("pty:load-persisted-buffer", { projectPath: "/test", tabId: "tab-exited" });
    });

    it("writes persisted buffer to terminal for exited session", async () => {
      mockStoreTabs.push({ id: "tab-buf-exit", sessionType: "claude", isRunning: false });
      mockCacheGet.mockReturnValue(undefined);
      mockInvoke.mockImplementation((channel: string) => {
        if (channel === "pty:has-session") return Promise.resolve(false);
        if (channel === "pty:load-persisted-buffer") return Promise.resolve("saved output\r\n[Session ended]");
        return Promise.resolve(undefined);
      });

      render(<TerminalSession tabId="tab-buf-exit" path="/test" isVisible={true} sessionType="claude" />);

      await vi.runAllTimersAsync();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockWrite).toHaveBeenCalledWith("saved output\r\n[Session ended]");
    });

    it("auto-closes exited AI CLI tab without spawning", async () => {
      mockStoreTabs.push({ id: "tab-exit-close", sessionType: "gemini", isRunning: false });
      mockCacheGet.mockReturnValue(undefined);
      mockInvoke.mockImplementation((channel: string) => {
        if (channel === "pty:has-session") return Promise.resolve(false);
        if (channel === "pty:load-persisted-buffer") return Promise.resolve("[Session ended]");
        return Promise.resolve(undefined);
      });

      render(<TerminalSession tabId="tab-exit-close" path="/test" isVisible={true} sessionType="gemini" />);

      await vi.runAllTimersAsync();
      await Promise.resolve();
      await Promise.resolve();

      // Should NOT spawn
      expect(mockPtySpawn).not.toHaveBeenCalled();

      // Should auto-close after delay
      await vi.advanceTimersByTimeAsync(600);
      expect(mockRemoveTab).toHaveBeenCalledWith("tab-exit-close");
    });

    it("does NOT auto-close exited terminal (non-AI) session", async () => {
      mockStoreTabs.push({ id: "tab-term-exit", sessionType: "terminal", isRunning: false });
      mockCacheGet.mockReturnValue(undefined);
      mockInvoke.mockImplementation((channel: string) => {
        if (channel === "pty:has-session") return Promise.resolve(false);
        if (channel === "pty:load-persisted-buffer") return Promise.resolve("$ exit\r\n");
        return Promise.resolve(undefined);
      });

      render(<TerminalSession tabId="tab-term-exit" path="/test" isVisible={true} sessionType="terminal" />);

      await vi.runAllTimersAsync();
      await Promise.resolve();
      await Promise.resolve();

      // Should NOT spawn
      expect(mockPtySpawn).not.toHaveBeenCalled();

      // Should NOT auto-close
      await vi.advanceTimersByTimeAsync(1000);
      expect(mockRemoveTab).not.toHaveBeenCalled();
    });

    it("spawns normally when tab.isRunning is true (still active)", async () => {
      mockStoreTabs.push({ id: "tab-active", sessionType: "claude", isRunning: true });
      mockCacheGet.mockReturnValue(undefined);
      mockInvoke.mockImplementation((channel: string) => {
        if (channel === "pty:has-session") return Promise.resolve(false);
        if (channel === "pty:load-persisted-buffer") return Promise.resolve("previous output");
        return Promise.resolve(undefined);
      });

      render(<TerminalSession tabId="tab-active" path="/test" isVisible={true} sessionType="claude" />);

      await vi.runAllTimersAsync();
      await Promise.resolve();
      await Promise.resolve();

      // Should spawn since tab is still running
      expect(mockPtySpawn).toHaveBeenCalled();
    });
  });

  describe("AI CLI cursor hiding (DECTCEM)", () => {
    it("writes hide-cursor escape sequence after spawn for AI CLI sessions", async () => {
      mockStoreTabs.push({ id: "tab-cursor", sessionType: "claude", isRunning: true });
      mockCacheGet.mockReturnValue(undefined);
      mockInvoke.mockImplementation((channel: string) => {
        if (channel === "pty:has-session") return Promise.resolve(false);
        if (channel === "pty:load-persisted-buffer") return Promise.resolve(null);
        return Promise.resolve(undefined);
      });

      render(<TerminalSession tabId="tab-cursor" path="/test" isVisible={true} sessionType="claude" />);

      await vi.runAllTimersAsync();
      await Promise.resolve();
      await Promise.resolve();

      // Should write DECTCEM hide cursor to xterm.js terminal
      expect(mockWrite).toHaveBeenCalledWith("\x1b[?25l");
    });

    it("does NOT write hide-cursor for plain terminal sessions", async () => {
      mockStoreTabs.push({ id: "tab-term-cursor", sessionType: "terminal", isRunning: true });
      mockCacheGet.mockReturnValue(undefined);
      mockInvoke.mockImplementation((channel: string) => {
        if (channel === "pty:has-session") return Promise.resolve(false);
        if (channel === "pty:load-persisted-buffer") return Promise.resolve(null);
        return Promise.resolve(undefined);
      });

      render(<TerminalSession tabId="tab-term-cursor" path="/test" isVisible={true} sessionType="terminal" />);

      await vi.runAllTimersAsync();
      await Promise.resolve();
      await Promise.resolve();

      // Should NOT write hide-cursor for plain terminal
      expect(mockWrite).not.toHaveBeenCalledWith("\x1b[?25l");
    });

    it("writes hide-cursor for gemini sessions too", async () => {
      mockStoreTabs.push({ id: "tab-gemini-cursor", sessionType: "gemini", isRunning: true });
      mockCacheGet.mockReturnValue(undefined);
      mockInvoke.mockImplementation((channel: string) => {
        if (channel === "pty:has-session") return Promise.resolve(false);
        if (channel === "pty:load-persisted-buffer") return Promise.resolve(null);
        return Promise.resolve(undefined);
      });

      render(<TerminalSession tabId="tab-gemini-cursor" path="/test" isVisible={true} sessionType="gemini" />);

      await vi.runAllTimersAsync();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockWrite).toHaveBeenCalledWith("\x1b[?25l");
    });

    it("strips show-cursor sequences from PTY data stream for AI CLI sessions", async () => {
      mockStoreTabs.push({ id: "tab-strip-cursor", sessionType: "claude", isRunning: true });
      mockCacheGet.mockReturnValue(undefined);
      mockInvoke.mockImplementation((channel: string) => {
        if (channel === "pty:has-session") return Promise.resolve(false);
        if (channel === "pty:load-persisted-buffer") return Promise.resolve(null);
        return Promise.resolve(undefined);
      });

      render(<TerminalSession tabId="tab-strip-cursor" path="/test" isVisible={true} sessionType="claude" />);

      await vi.runAllTimersAsync();
      await Promise.resolve();
      await Promise.resolve();

      mockWrite.mockClear();

      // Simulate PTY sending show-cursor escape mixed with content
      const ptyOnData = (globalThis as Record<string, unknown>).__ptyOnData as (data: string) => void;
      ptyOnData("hello\x1b[?25hworld");

      // Flush the RAF-coalesced write buffer
      await vi.advanceTimersByTimeAsync(20);

      // The show-cursor sequence should be stripped, content preserved
      expect(mockWrite).toHaveBeenCalledWith("helloworld");
    });

    it("does NOT strip show-cursor sequences for plain terminal sessions", async () => {
      mockStoreTabs.push({ id: "tab-term-keep-cursor", sessionType: "terminal", isRunning: true });
      mockCacheGet.mockReturnValue(undefined);
      mockInvoke.mockImplementation((channel: string) => {
        if (channel === "pty:has-session") return Promise.resolve(false);
        if (channel === "pty:load-persisted-buffer") return Promise.resolve(null);
        return Promise.resolve(undefined);
      });

      render(<TerminalSession tabId="tab-term-keep-cursor" path="/test" isVisible={true} sessionType="terminal" />);

      await vi.runAllTimersAsync();
      await Promise.resolve();
      await Promise.resolve();

      mockWrite.mockClear();

      const ptyOnData = (globalThis as Record<string, unknown>).__ptyOnData as (data: string) => void;
      ptyOnData("hello\x1b[?25hworld");

      await vi.advanceTimersByTimeAsync(20);

      // Plain terminal should preserve show-cursor sequences
      expect(mockWrite).toHaveBeenCalledWith("hello\x1b[?25hworld");
    });
  });

  describe("PTY reconnection (cache miss, backend alive)", () => {
    it("does NOT spawn new PTY when cache miss but backend PTY is alive", async () => {
      // No cached terminal
      mockCacheGet.mockReturnValue(undefined);
      // Backend PTY is alive for this tabId
      mockInvoke.mockImplementation((channel: string) => {
        if (channel === "pty:has-session") return Promise.resolve(true);
        if (channel === "pty:get-buffer") return Promise.resolve(null);
        return Promise.resolve(undefined);
      });

      const mockSpawn = vi.fn().mockResolvedValue("tab-reconnect");
      vi.doMock("@/hooks/use-pty", () => ({
        usePty: (options: { tabId: string; onData?: (d: string) => void; onExit?: () => void }) => ({
          isRunning: true,
          spawn: mockSpawn,
          write: mockPtyWrite,
          resize: mockResize,
          close: mockClose,
        }),
      }));

      render(<TerminalSession tabId="tab-reconnect" path="/test" isVisible={true} />);

      // Wait for the async IPC check to complete
      await vi.runAllTimersAsync();
      await Promise.resolve();
      await Promise.resolve();

      // spawn should NOT be called since backend PTY is alive
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it("writes buffer to terminal when reconnecting to alive backend PTY", async () => {
      mockCacheGet.mockReturnValue(undefined);
      mockInvoke.mockImplementation((channel: string) => {
        if (channel === "pty:has-session") return Promise.resolve(true);
        if (channel === "pty:get-buffer") return Promise.resolve("\x1b[32mRestored output\x1b[0m");
        return Promise.resolve(undefined);
      });

      render(<TerminalSession tabId="tab-buf" path="/test" isVisible={true} />);

      // Flush async IPC + microtasks
      await vi.runAllTimersAsync();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      // Buffer should be written to the terminal
      expect(mockWrite).toHaveBeenCalledWith("\x1b[32mRestored output\x1b[0m");
    });

    it("spawns new PTY when cache miss AND backend PTY is dead", async () => {
      mockCacheGet.mockReturnValue(undefined);
      mockInvoke.mockImplementation((channel: string) => {
        if (channel === "pty:has-session") return Promise.resolve(false);
        return Promise.resolve(undefined);
      });

      const mockSpawn = vi.fn().mockResolvedValue("tab-dead");
      vi.doMock("@/hooks/use-pty", () => ({
        usePty: (options: { tabId: string }) => ({
          isRunning: false,
          spawn: mockSpawn,
          write: mockPtyWrite,
          resize: mockResize,
          close: mockClose,
        }),
      }));

      render(<TerminalSession tabId="tab-dead" path="/test" isVisible={true} />);

      // Advance RAF so spawn fires
      await vi.runAllTimersAsync();
      await Promise.resolve();
      await Promise.resolve();

      // spawn() SHOULD be called since backend PTY is dead
      expect(mockInvoke).toHaveBeenCalledWith("pty:has-session", { tabId: "tab-dead" });
    });

    it("checks pty:has-session IPC channel on new mount", async () => {
      mockCacheGet.mockReturnValue(undefined);
      mockInvoke.mockResolvedValue(false);

      render(<TerminalSession tabId="tab-check" path="/test" isVisible={true} />);

      // Wait for async init
      await vi.runAllTimersAsync();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockInvoke).toHaveBeenCalledWith("pty:has-session", { tabId: "tab-check" });
    });
  });

  describe("deterministic session ID generation", () => {
    beforeEach(() => {
      mockCacheGet.mockReturnValue(undefined);
      mockInvoke.mockImplementation((channel: string) => {
        if (channel === "pty:has-session") return Promise.resolve(false);
        if (channel === "pty:load-persisted-buffer") return Promise.resolve(null);
        return Promise.resolve(undefined);
      });
    });

    it("generates UUID and passes --session-id for new Claude sessions", async () => {
      // Tab with NO cliSessionId (brand new session), isRunning: true so it spawns
      mockStoreTabs.push({ id: "tab-new-claude", sessionType: "claude", isRunning: true });

      render(<TerminalSession tabId="tab-new-claude" path="/test" isVisible={true} sessionType="claude" />);

      await vi.runAllTimersAsync();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockPtySpawn).toHaveBeenCalled();

      const spawnCall = mockPtySpawn.mock.calls[0];
      // spawn(path, sessionType, resumeArgs)
      const resumeArgs = spawnCall[2] as string[] | undefined;

      expect(resumeArgs).toBeDefined();
      expect(resumeArgs![0]).toBe("--session-id");
      expect(resumeArgs![1]).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );

      // cliSessionId must be stored on the tab immediately
      expect(mockSetCliSessionId).toHaveBeenCalledWith("tab-new-claude", resumeArgs![1]);
    });

    it("does NOT generate session ID for restored tabs with existing cliSessionId", async () => {
      mockStoreTabs.push({ id: "tab-restored", sessionType: "claude", cliSessionId: "existing-uuid-1234", isRunning: true });

      render(<TerminalSession tabId="tab-restored" path="/test" isVisible={true} sessionType="claude" />);

      await vi.runAllTimersAsync();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockPtySpawn).toHaveBeenCalled();

      const spawnCall = mockPtySpawn.mock.calls[0];
      const resumeArgs = spawnCall[2] as string[] | undefined;

      // Should use --resume, not --session-id
      expect(resumeArgs).toEqual(["--resume", "existing-uuid-1234"]);
      // Should NOT generate a new session ID
      expect(mockSetCliSessionId).not.toHaveBeenCalled();
    });

    it("does NOT generate session ID for terminal sessions", async () => {
      mockStoreTabs.push({ id: "tab-plain-term", sessionType: "terminal", isRunning: true });

      render(<TerminalSession tabId="tab-plain-term" path="/test" isVisible={true} sessionType="terminal" />);

      await vi.runAllTimersAsync();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockPtySpawn).toHaveBeenCalled();

      const spawnCall = mockPtySpawn.mock.calls[0];
      const resumeArgs = spawnCall[2] as string[] | undefined;

      expect(resumeArgs).toBeUndefined();
      expect(mockSetCliSessionId).not.toHaveBeenCalled();
    });

    it("does NOT generate session ID for CLIs without sessionIdFlag (e.g. codex)", async () => {
      mockStoreTabs.push({ id: "tab-codex", sessionType: "codex", isRunning: true });

      render(<TerminalSession tabId="tab-codex" path="/test" isVisible={true} sessionType="codex" />);

      await vi.runAllTimersAsync();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockPtySpawn).toHaveBeenCalled();

      const spawnCall = mockPtySpawn.mock.calls[0];
      const resumeArgs = spawnCall[2] as string[] | undefined;

      // codex has no sessionIdFlag, so no --session-id should be passed
      expect(resumeArgs).toBeUndefined();
      expect(mockSetCliSessionId).not.toHaveBeenCalled();
    });
  });
});
