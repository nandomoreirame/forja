import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock all dependencies
vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
  getCurrentWindow: vi.fn(() => ({
    isMaximized: vi.fn(() => Promise.resolve(false)),
    onResized: vi.fn(() => Promise.resolve(() => {})),
    minimize: vi.fn(),
    maximize: vi.fn(),
    close: vi.fn(),
  })),
  isDev: vi.fn(() => Promise.resolve(false)),
  isTilingDesktop: vi.fn(() => Promise.resolve(false)),
}));

// Mock stores
vi.mock("@/stores/app-dialogs", () => {
  const store = { aboutOpen: false, setAboutOpen: vi.fn(), shortcutsOpen: false, setShortcutsOpen: vi.fn(), settingsOpen: false, setSettingsOpen: vi.fn() };
  return { useAppDialogsStore: Object.assign((sel?: (s: typeof store) => unknown) => sel ? sel(store) : store, { getState: () => store, setState: vi.fn(), subscribe: vi.fn(() => () => {}) }) };
});
vi.mock("@/stores/command-palette", () => ({ useCommandPaletteStore: { getState: vi.fn(() => ({ open: vi.fn() })) } }));
vi.mock("@/stores/file-tree", () => {
  const store = { tree: null, openProject: vi.fn() };
  return { APP_NAME: "Forja", useFileTreeStore: Object.assign((sel?: (s: typeof store) => unknown) => sel ? sel(store) : store, { getState: () => store }) };
});
vi.mock("@/stores/performance", () => {
  const store = { isLite: false, toggleLiteMode: vi.fn() };
  return { usePerformanceStore: Object.assign((sel?: (s: typeof store) => unknown) => sel ? sel(store) : store, { getState: () => store }) };
});
vi.mock("@/lib/platform", () => ({ IS_MAC: false, MOD_KEY: "Ctrl" }));

// Mock child components with data-testid
vi.mock("../quick-actions", () => ({
  QuickActions: ({ position }: { position: string }) => <div data-testid={`quick-actions-${position}`} />,
}));
vi.mock("../workspace-switcher", () => ({ WorkspaceSwitcher: () => <div data-testid="workspace-switcher" /> }));
vi.mock("../about-dialog", () => ({ AboutDialog: () => null }));
vi.mock("../keyboard-shortcuts-dialog", () => ({ KeyboardShortcutsDialog: () => null }));
vi.mock("../settings-dialog", () => ({ SettingsDialog: () => null }));
vi.mock("../resource-usage-popover", () => ({ ResourceUsagePopover: () => null }));

import { Titlebar } from "../titlebar";

describe("Titlebar with QuickActions", () => {
  it("renders left and right QuickActions components", () => {
    render(<Titlebar />);
    expect(screen.getByTestId("quick-actions-left")).toBeDefined();
    expect(screen.getByTestId("quick-actions-right")).toBeDefined();
  });

  it("places left QuickActions after the workspace switcher", () => {
    render(<Titlebar />);
    const ws = screen.getByTestId("workspace-switcher");
    const qa = screen.getByTestId("quick-actions-left");
    expect(ws.compareDocumentPosition(qa) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
