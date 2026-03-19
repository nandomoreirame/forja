import { describe, it, expect, beforeEach, vi } from "vitest";
import { paneFocusRegistry } from "../pane-focus-registry";

describe("paneFocusRegistry", () => {
  beforeEach(() => {
    // Clear all registrations between tests
    paneFocusRegistry.clear();
  });

  it("calls registered focus callback and returns true", () => {
    const focusFn = vi.fn();
    paneFocusRegistry.register("node-1", focusFn);

    const result = paneFocusRegistry.focus("node-1");

    expect(result).toBe(true);
    expect(focusFn).toHaveBeenCalledTimes(1);
  });

  it("returns false when focusing an unregistered nodeId", () => {
    const result = paneFocusRegistry.focus("unknown-node");

    expect(result).toBe(false);
  });

  it("removes callback on unregister", () => {
    const focusFn = vi.fn();
    paneFocusRegistry.register("node-1", focusFn);
    paneFocusRegistry.unregister("node-1");

    const result = paneFocusRegistry.focus("node-1");

    expect(result).toBe(false);
    expect(focusFn).not.toHaveBeenCalled();
  });

  it("overwrites previous callback when registering same nodeId", () => {
    const first = vi.fn();
    const second = vi.fn();
    paneFocusRegistry.register("node-1", first);
    paneFocusRegistry.register("node-1", second);

    paneFocusRegistry.focus("node-1");

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
