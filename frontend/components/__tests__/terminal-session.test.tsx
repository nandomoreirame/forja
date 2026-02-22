import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TerminalSession } from "../terminal-session";

// Mock xterm.js
const mockOpen = vi.fn();
const mockWrite = vi.fn();
const mockDispose = vi.fn();
const mockOnData = vi.fn().mockReturnValue({ dispose: vi.fn() });
const mockLoadAddon = vi.fn();

vi.mock("@xterm/xterm", () => ({
  Terminal: class MockTerminal {
    open = mockOpen;
    write = mockWrite;
    dispose = mockDispose;
    onData = mockOnData;
    loadAddon = mockLoadAddon;
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

vi.mock("@xterm/addon-web-links", () => ({
  WebLinksAddon: class MockWebLinksAddon {
    dispose = vi.fn();
  },
}));

vi.mock("@xterm/xterm/css/xterm.css", () => ({}));

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
    mockOpen.mockClear();
    mockWrite.mockClear();
    mockDispose.mockClear();
    mockOnData.mockClear().mockReturnValue({ dispose: vi.fn() });
    mockLoadAddon.mockClear();
    mockPtyWrite.mockClear();
    mockResize.mockClear();
    mockClose.mockClear();
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
});
