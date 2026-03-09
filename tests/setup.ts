import "@testing-library/jest-dom/vitest";

// Polyfill ResizeObserver for jsdom
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Polyfill requestIdleCallback / cancelIdleCallback for jsdom
// Polyfill scrollIntoView for jsdom (used by cmdk)
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? function () {};

if (typeof globalThis.requestIdleCallback === "undefined") {
  globalThis.requestIdleCallback = ((cb: IdleRequestCallback) =>
    setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline), 0)) as typeof requestIdleCallback;
  globalThis.cancelIdleCallback = ((id: number) => clearTimeout(id)) as typeof cancelIdleCallback;
}
