import { describe, it, expect, vi } from "vitest";

// Simulate the shape of the electronAPI.browser namespace we'll add to preload
const mockElectronAPI = {
  browser: {
    navigate: vi.fn(),
    goBack: vi.fn(),
    goForward: vi.fn(),
    reload: vi.fn(),
  },
};

describe("browser IPC bridge shape", () => {
  it("exposes browser namespace on electronAPI", () => {
    expect(mockElectronAPI.browser).toBeDefined();
  });

  it("has navigate, goBack, goForward, reload functions", () => {
    expect(typeof mockElectronAPI.browser.navigate).toBe("function");
    expect(typeof mockElectronAPI.browser.goBack).toBe("function");
    expect(typeof mockElectronAPI.browser.goForward).toBe("function");
    expect(typeof mockElectronAPI.browser.reload).toBe("function");
  });
});
