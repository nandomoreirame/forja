import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock electron-store before importing config
vi.mock("electron-store", () => {
  class MockStore<T extends Record<string, unknown>> {
    private store: Record<string, unknown>;
    private defaults: Record<string, unknown>;
    constructor(opts?: { defaults?: T }) {
      this.defaults = { ...(opts?.defaults ?? {}) };
      this.store = { ...this.defaults };
    }
    get<K extends keyof T>(key: K): T[K] {
      return (this.store[key as string] ?? undefined) as T[K];
    }
    set<K extends keyof T>(key: K, value: T[K]): void {
      this.store[key as string] = value;
    }
    has(key: string): boolean {
      return key in this.store;
    }
    delete(key: string): void {
      delete this.store[key];
    }
    clear(): void {
      this.store = { ...this.defaults };
    }
  }

  return { default: MockStore };
});

vi.stubGlobal("crypto", {
  randomUUID: vi.fn().mockReturnValue("test-uuid-1"),
});

describe("beta disclaimer config", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns null by default (no disclaimer acknowledged)", async () => {
    const { getBetaDisclaimerVersion } = await import("../config");
    // MockStore returns undefined for unset keys; real electron-store returns null
    expect(getBetaDisclaimerVersion()).toBeFalsy();
  });

  it("stores and retrieves the acknowledged disclaimer version", async () => {
    const { getBetaDisclaimerVersion, setBetaDisclaimerVersion } =
      await import("../config");

    setBetaDisclaimerVersion("1.0");
    expect(getBetaDisclaimerVersion()).toBe("1.0");
  });

  it("overwrites previous version when updated", async () => {
    const { getBetaDisclaimerVersion, setBetaDisclaimerVersion } =
      await import("../config");

    setBetaDisclaimerVersion("1.0");
    setBetaDisclaimerVersion("2.0");
    expect(getBetaDisclaimerVersion()).toBe("2.0");
  });
});
