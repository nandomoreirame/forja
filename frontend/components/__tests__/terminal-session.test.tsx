import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TerminalSession } from "../terminal-session";

// Mock xterm.js
const mockOpen = vi.fn();
const mockWrite = vi.fn();
const mockDispose = vi.fn();
const mockOnData = vi.fn().mockReturnValue({ dispose: vi.fn() });
const mockLoadAddon = vi.fn();
const mockFocus = vi.fn();
const mockGetSelection = vi.fn().mockReturnValue("");
let capturedKeyHandler: ((event: KeyboardEvent) => boolean) | undefined;

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
    options = {};
    rows = 24;
    cols = 80;
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
    capturedWebLinksHandler = undefined;
    capturedKeyHandler = undefined;
    mockGetSelection.mockReset().mockReturnValue("");
    webglInstances.length = 0;
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

  it("disposes terminal and calls close on unmount", () => {
    const { unmount } = render(
      <TerminalSession tabId="tab-1" path="/test" isVisible={true} />
    );
    unmount();
    expect(mockClose).toHaveBeenCalled();
    expect(mockDispose).toHaveBeenCalled();
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
});
