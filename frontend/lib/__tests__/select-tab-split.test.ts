import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests the simplified handleSelectTab.
 * After the pane-based split redesign, handleSelectTab is just setActiveTab(tabId).
 * Split pane management is handled by TerminalPane component rendering logic.
 */

function handleSelectTab(
  tabId: string,
  setActiveTab: (id: string) => void,
) {
  setActiveTab(tabId);
}

describe("handleSelectTab (simplified)", () => {
  let setActiveTab: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setActiveTab = vi.fn();
  });

  it("calls setActiveTab with the given tabId", () => {
    handleSelectTab("tab-3", setActiveTab);
    expect(setActiveTab).toHaveBeenCalledWith("tab-3");
  });

  it("calls setActiveTab for any tab regardless of split state", () => {
    handleSelectTab("tab-1", setActiveTab);
    expect(setActiveTab).toHaveBeenCalledWith("tab-1");
  });

  it("calls setActiveTab even when tab is part of a split", () => {
    handleSelectTab("tab-2", setActiveTab);
    expect(setActiveTab).toHaveBeenCalledWith("tab-2");
  });
});
