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

vi.mock("@xterm/xterm", () => ({
  Terminal: class MockTerminal {
    open = mockOpen;
    write = mockWrite;
    dispose = mockDispose;
    onData = mockOnData;
    loadAddon = mockLoadAddon;
    focus = mockFocus;
    attachCustomKeyEventHandler = vi.fn();
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

    it("disposes WebglAddon after 30s when hidden", () => {
      const { rerender } = render(
        <TerminalSession tabId="tab-1" path="/test" isVisible={true} />
      );
      expect(webglInstances).toHaveLength(1);
      const webgl = webglInstances[0];

      // Hide the terminal
      rerender(<TerminalSession tabId="tab-1" path="/test" isVisible={false} />);

      // Not yet disposed before 30s
      expect(webgl.dispose).not.toHaveBeenCalled();

      // Advance 30s
      vi.advanceTimersByTime(30_000);

      expect(webgl.dispose).toHaveBeenCalledOnce();
    });

    it("cancels WebGL disposal if terminal becomes visible before 30s", () => {
      const { rerender } = render(
        <TerminalSession tabId="tab-1" path="/test" isVisible={true} />
      );
      const webgl = webglInstances[0];

      // Hide
      rerender(<TerminalSession tabId="tab-1" path="/test" isVisible={false} />);

      // Advance 15s (before timer fires)
      vi.advanceTimersByTime(15_000);

      // Show again — should cancel the timer
      rerender(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);

      // Advance past original 30s
      vi.advanceTimersByTime(30_000);

      // WebGL should NOT have been disposed
      expect(webgl.dispose).not.toHaveBeenCalled();
    });

    it("recreates WebglAddon when terminal becomes visible after disposal", () => {
      const { rerender } = render(
        <TerminalSession tabId="tab-1" path="/test" isVisible={true} />
      );
      expect(webglInstances).toHaveLength(1);

      // Hide and wait for disposal
      rerender(<TerminalSession tabId="tab-1" path="/test" isVisible={false} />);
      vi.advanceTimersByTime(30_000);
      expect(webglInstances[0].dispose).toHaveBeenCalledOnce();

      // Show again — should create a new WebglAddon
      rerender(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);
      expect(webglInstances).toHaveLength(2);
    });

    it("clears virtualization timer on unmount", () => {
      const { unmount, rerender } = render(
        <TerminalSession tabId="tab-1" path="/test" isVisible={true} />
      );
      const webgl = webglInstances[0];

      // Hide to start timer
      rerender(<TerminalSession tabId="tab-1" path="/test" isVisible={false} />);

      // Unmount before timer fires
      unmount();

      // Advance past 30s — should not throw or call dispose on webgl
      // (terminal.dispose is called on unmount, but webglAddon timer should be cleared)
      vi.advanceTimersByTime(30_000);

      // The webgl dispose may or may not be called by terminal.dispose(),
      // but the timer-based disposal itself should be cleared
      // We verify no extra calls beyond what unmount cleanup does
      expect(webgl.dispose).not.toHaveBeenCalled();
    });
  });
});
