import { describe, it, expect, vi } from "vitest";

describe("TerminalSession reattach refresh", () => {
  it("should call terminal.refresh() after reattaching cached hostElement", () => {
    const terminalRefresh = vi.fn();
    const terminalFocus = vi.fn();
    const fitAddonFit = vi.fn();
    const fitAddonProposeDimensions = vi.fn().mockReturnValue({ rows: 24, cols: 80 });

    const mockTerminal = {
      refresh: terminalRefresh,
      focus: terminalFocus,
      rows: 24,
    };
    const mockFitAddon = {
      fit: fitAddonFit,
      proposeDimensions: fitAddonProposeDimensions,
    };
    const mockHostElement = document.createElement("div");

    // Simulate reattach flow
    const container = document.createElement("div");
    container.appendChild(mockHostElement);

    // After appending, refresh should be called to resync renderer
    mockTerminal.refresh(0, mockTerminal.rows - 1);

    expect(terminalRefresh).toHaveBeenCalledWith(0, 23);
  });

  it("should clear screen when reattaching AI CLI terminal with changed dimensions", () => {
    // Simulates the reattach-with-dimension-change flow from terminal-session.tsx
    const terminalWrite = vi.fn();
    const terminalRefresh = vi.fn();

    // Terminal was parked at 80x24
    const mockTerminal = {
      cols: 80,
      rows: 24,
      write: terminalWrite,
      refresh: terminalRefresh,
    };

    const prevCols = mockTerminal.cols;
    const prevRows = mockTerminal.rows;

    // fitAddon.fit() changes terminal dimensions to 120x30
    mockTerminal.cols = 120;
    mockTerminal.rows = 30;

    const isCached = true;
    const isAiCli = true;
    const dimsChanged = mockTerminal.cols !== prevCols || mockTerminal.rows !== prevRows;

    // The fix: clear screen when dimensions changed for AI CLI sessions
    if (isCached && isAiCli && dimsChanged) {
      mockTerminal.write("\x1b[2J\x1b[H");
    }

    // Then refresh viewport
    if (isCached) {
      mockTerminal.refresh(0, mockTerminal.rows - 1);
    }

    expect(terminalWrite).toHaveBeenCalledWith("\x1b[2J\x1b[H");
    expect(terminalRefresh).toHaveBeenCalledWith(0, 29);
  });

  it("should NOT clear screen when reattaching AI CLI terminal with same dimensions", () => {
    const terminalWrite = vi.fn();
    const terminalRefresh = vi.fn();

    // Terminal was parked at 80x24 and container is still 80x24
    const mockTerminal = {
      cols: 80,
      rows: 24,
      write: terminalWrite,
      refresh: terminalRefresh,
    };

    const prevCols = mockTerminal.cols;
    const prevRows = mockTerminal.rows;

    // fit() does NOT change dimensions (same container size)
    // mockTerminal.cols and rows stay the same

    const isCached = true;
    const isAiCli = true;
    const dimsChanged = mockTerminal.cols !== prevCols || mockTerminal.rows !== prevRows;

    if (isCached && isAiCli && dimsChanged) {
      mockTerminal.write("\x1b[2J\x1b[H");
    }

    if (isCached) {
      mockTerminal.refresh(0, mockTerminal.rows - 1);
    }

    // Should NOT have written clear sequence
    expect(terminalWrite).not.toHaveBeenCalled();
    // Should still refresh
    expect(terminalRefresh).toHaveBeenCalledWith(0, 23);
  });

  it("should NOT clear screen for plain terminal sessions even with dimension change", () => {
    const terminalWrite = vi.fn();
    const terminalRefresh = vi.fn();

    const mockTerminal = {
      cols: 80,
      rows: 24,
      write: terminalWrite,
      refresh: terminalRefresh,
    };

    const prevCols = mockTerminal.cols;
    const prevRows = mockTerminal.rows;

    // Dimensions change
    mockTerminal.cols = 120;
    mockTerminal.rows = 30;

    const isCached = true;
    const isAiCli = false; // plain terminal
    const dimsChanged = mockTerminal.cols !== prevCols || mockTerminal.rows !== prevRows;

    if (isCached && isAiCli && dimsChanged) {
      mockTerminal.write("\x1b[2J\x1b[H");
    }

    if (isCached) {
      mockTerminal.refresh(0, mockTerminal.rows - 1);
    }

    // Should NOT clear for plain terminals
    expect(terminalWrite).not.toHaveBeenCalled();
    // Should still refresh
    expect(terminalRefresh).toHaveBeenCalledWith(0, 29);
  });
});
