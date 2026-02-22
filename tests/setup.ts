import "@testing-library/jest-dom/vitest";

// Polyfill ResizeObserver for jsdom
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
