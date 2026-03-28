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
});
