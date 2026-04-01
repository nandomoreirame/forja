/**
 * Unit tests for terminal-session.tsx spawnWithResume logic:
 * verifies that a stale cliSessionId is cleared when resolveResumeArgs
 * reports sessionIdValid=false, and preserved when valid=true.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { TerminalSession } from "../terminal-session";

// ── xterm.js mocks (minimal) ─────────────────────────────────────────────────
const mockOpen = vi.fn((container: HTMLElement) => {
  const textarea = document.createElement("textarea");
  container.appendChild(textarea);
});
const mockWrite = vi.fn();
const mockDispose = vi.fn();
const mockOnData = vi.fn().mockReturnValue({ dispose: vi.fn() });
const mockLoadAddon = vi.fn();
const mockFocus = vi.fn();
const mockGetSelection = vi.fn().mockReturnValue("");
const mockRefresh = vi.fn();
const mockOnSelectionChange = vi.fn().mockReturnValue({ dispose: vi.fn() });

vi.mock("@xterm/xterm", () => ({
  Terminal: class MockTerminal {
    open = mockOpen;
    write = mockWrite;
    dispose = mockDispose;
    onData = mockOnData;
    onSelectionChange = mockOnSelectionChange;
    loadAddon = mockLoadAddon;
    focus = mockFocus;
    getSelection = mockGetSelection;
    refresh = mockRefresh;
    attachCustomKeyEventHandler = vi.fn();
    parser = { registerOscHandler: vi.fn(() => ({ dispose: vi.fn() })) };
    options: Record<string, unknown> = {};
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

// ── terminal-instance-cache mock ─────────────────────────────────────────────
vi.mock("@/lib/terminal-instance-cache", () => ({
  terminalCache: {
    has: vi.fn().mockReturnValue(false),
    get: vi.fn().mockReturnValue(undefined),
    park: vi.fn(),
    dispose: vi.fn(),
    clear: vi.fn(),
  },
}));

// ── link-router mock ─────────────────────────────────────────────────────────
vi.mock("@/lib/link-router", () => ({
  routeLinkClick: vi.fn(),
}));

// ── IPC mock ─────────────────────────────────────────────────────────────────
const mockInvoke = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/ipc", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
  listen: vi.fn(() => () => {}),
}));

// ── usePty mock ───────────────────────────────────────────────────────────────
const mockPtySpawn = vi.fn().mockResolvedValue("mock-session");
const mockResize = vi.fn().mockResolvedValue(undefined);
const mockClose = vi.fn().mockResolvedValue(undefined);

vi.mock("@/hooks/use-pty", () => ({
  usePty: (options: { tabId: string; onData?: (data: string) => void; onExit?: (code: number) => void }) => {
    if (options.onData) (globalThis as Record<string, unknown>).__ptyOnData = options.onData;
    if (options.onExit) (globalThis as Record<string, unknown>).__ptyOnExit = options.onExit;
    return {
      isRunning: true,
      spawn: (...args: unknown[]) => mockPtySpawn(...args),
      write: vi.fn().mockResolvedValue(undefined),
      resize: mockResize,
      close: mockClose,
    };
  },
}));

// ── terminal-tabs store mock ──────────────────────────────────────────────────
const mockSetCliSessionId = vi.fn();
const mockMarkTabRunning = vi.fn();
const mockMarkTabResumed = vi.fn();
const mockRemoveTab = vi.fn();
const mockHasTab = vi.fn().mockReturnValue(true);

// Mutable tabs array — tests push entries before render
const mockStoreTabs: Array<{
  id: string;
  sessionType: string;
  cliSessionId?: string;
  isRunning?: boolean;
}> = [];

vi.mock("@/stores/terminal-tabs", () => ({
  useTerminalTabsStore: Object.assign(vi.fn(), {
    getState: () => ({
      hasTab: mockHasTab,
      removeTab: mockRemoveTab,
      setCliSessionId: mockSetCliSessionId,
      markTabRunning: mockMarkTabRunning,
      markTabResumed: mockMarkTabResumed,
      tabs: mockStoreTabs,
    }),
  }),
}));

// ── resolveResumeArgs mock ────────────────────────────────────────────────────
const mockResolveResumeArgs = vi.fn();
vi.mock("@/lib/resolve-resume-args", () => ({
  resolveResumeArgs: (...args: unknown[]) => mockResolveResumeArgs(...args),
}));

// ── helpers ───────────────────────────────────────────────────────────────────
async function flushAllMicrotasks() {
  // Drain promise queues multiple times to allow chained async/await to settle
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

// ── tests ─────────────────────────────────────────────────────────────────────
describe("spawnWithResume — resolveResumeArgs integration", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Restore container dimensions so the 0x0 guard doesn't skip spawn
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get() { return 800; },
    });
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get() { return 600; },
    });

    mockStoreTabs.length = 0;
    mockSetCliSessionId.mockClear();
    mockMarkTabRunning.mockClear();
    mockRemoveTab.mockClear();
    mockHasTab.mockReset().mockReturnValue(true);
    mockPtySpawn.mockClear().mockResolvedValue("mock-session");
    mockResize.mockClear();
    mockClose.mockClear();
    mockOpen.mockClear();
    mockWrite.mockClear();
    mockInvoke.mockReset().mockResolvedValue(undefined);
    mockResolveResumeArgs.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get() { return 0; },
    });
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get() { return 0; },
    });
  });

  it("clears cliSessionId when resolveResumeArgs returns sessionIdValid=false", async () => {
    const TAB_ID = "tab-stale";

    // Seed tab with a stale session ID and isRunning=false so it goes through resume path
    mockStoreTabs.push({
      id: TAB_ID,
      sessionType: "claude",
      cliSessionId: "stale-session-id",
      isRunning: false,
    });

    // resolveResumeArgs reports the stored ID is no longer valid on disk
    mockResolveResumeArgs.mockResolvedValue({
      args: ["--resume"],
      sessionIdValid: false,
    });

    render(<TerminalSession tabId={TAB_ID} path="/test/project" sessionType="claude" />);

    // Flush async IPC calls (pty:has-session) before the RAF fires
    await flushAllMicrotasks();

    // Advance past the requestAnimationFrame (16ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16);
    });

    // Flush the async spawnWithResume chain (invoke + resolveResumeArgs)
    await act(async () => {
      await flushAllMicrotasks();
    });

    // resolveResumeArgs should have been called with the stored session ID
    expect(mockResolveResumeArgs).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionType: "claude",
        cliSessionId: "stale-session-id",
        projectPath: "/test/project",
      }),
    );

    // Because sessionIdValid=false, the store must be told to clear the ID
    expect(mockSetCliSessionId).toHaveBeenCalledWith(TAB_ID, "");
  });

  it("does NOT clear cliSessionId when resolveResumeArgs returns sessionIdValid=true", async () => {
    const TAB_ID = "tab-valid";

    // Seed tab with a still-valid session ID
    mockStoreTabs.push({
      id: TAB_ID,
      sessionType: "claude",
      cliSessionId: "valid-session-id",
      isRunning: false,
    });

    // resolveResumeArgs confirms the ID exists on disk
    mockResolveResumeArgs.mockResolvedValue({
      args: ["--resume", "valid-session-id"],
      sessionIdValid: true,
    });

    render(<TerminalSession tabId={TAB_ID} path="/test/project" sessionType="claude" />);

    await flushAllMicrotasks();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(16);
    });

    await act(async () => {
      await flushAllMicrotasks();
    });

    // resolveResumeArgs should have been called
    expect(mockResolveResumeArgs).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionType: "claude",
        cliSessionId: "valid-session-id",
        projectPath: "/test/project",
      }),
    );

    // sessionIdValid=true → do NOT clear the stored session ID
    const clearCalls = mockSetCliSessionId.mock.calls.filter(
      ([, value]) => value === "",
    );
    expect(clearCalls).toHaveLength(0);
  });
});
