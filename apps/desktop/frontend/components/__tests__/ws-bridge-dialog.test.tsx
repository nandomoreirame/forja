import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WsBridgeDialog } from "../ws-bridge-dialog";
import { useWsBridgeStore } from "@/stores/ws-bridge";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
}));

vi.mock("@/stores/ws-bridge");

const mockStart = vi.fn();
const mockStop = vi.fn();
const mockToggle = vi.fn();
const mockRefreshStatus = vi.fn();

function mockBridgeStore(overrides: Partial<{
  running: boolean;
  port: number;
  host: string;
  clients: number;
  token: string;
}> = {}) {
  const state = {
    running: false,
    port: 9400,
    host: "0.0.0.0",
    clients: 0,
    token: "",
    start: mockStart,
    stop: mockStop,
    toggle: mockToggle,
    refreshStatus: mockRefreshStatus,
    ...overrides,
  };
  vi.mocked(useWsBridgeStore).mockImplementation((selector?: (s: typeof state) => unknown) => {
    if (selector) return selector(state) as never;
    return state as never;
  });
  vi.mocked(useWsBridgeStore).getState = () => state as never;
}

describe("WsBridgeDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBridgeStore();
  });

  it("renders dialog when open=true", () => {
    render(<WsBridgeDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("does not render dialog when open=false", () => {
    render(<WsBridgeDialog open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows 'Remote Server' title", () => {
    render(<WsBridgeDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("Remote Server")).toBeInTheDocument();
  });

  it("shows 'Stopped' status when server is not running", () => {
    mockBridgeStore({ running: false });
    render(<WsBridgeDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("Stopped")).toBeInTheDocument();
  });

  it("shows 'Running' status when server is running", () => {
    mockBridgeStore({ running: true, token: "abc-token-xyz", port: 9400 });
    render(<WsBridgeDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("Running")).toBeInTheDocument();
  });

  it("shows Start Server button when server is stopped", () => {
    mockBridgeStore({ running: false });
    render(<WsBridgeDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /start server/i })).toBeInTheDocument();
  });

  it("shows Stop Server button when server is running", () => {
    mockBridgeStore({ running: true, token: "abc-token", port: 9400 });
    render(<WsBridgeDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /stop server/i })).toBeInTheDocument();
  });

  it("calls start() when Start Server button is clicked", async () => {
    const user = userEvent.setup();
    mockStart.mockResolvedValue(undefined);
    mockBridgeStore({ running: false });
    render(<WsBridgeDialog open={true} onOpenChange={vi.fn()} />);

    const startBtn = screen.getByRole("button", { name: /start server/i });
    await user.click(startBtn);

    expect(mockStart).toHaveBeenCalledOnce();
  });

  it("calls stop() when Stop Server button is clicked", async () => {
    const user = userEvent.setup();
    mockStop.mockResolvedValue(undefined);
    mockBridgeStore({ running: true, token: "abc-token", port: 9400 });
    render(<WsBridgeDialog open={true} onOpenChange={vi.fn()} />);

    const stopBtn = screen.getByRole("button", { name: /stop server/i });
    await user.click(stopBtn);

    expect(mockStop).toHaveBeenCalledOnce();
  });

  it("displays connection token prominently when server is running", () => {
    mockBridgeStore({ running: true, token: "test-uuid-token-1234", port: 9400 });
    render(<WsBridgeDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("test-uuid-token-1234")).toBeInTheDocument();
  });

  it("does not show token section when server is stopped", () => {
    mockBridgeStore({ running: false, token: "" });
    render(<WsBridgeDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.queryByText("Connection Token")).not.toBeInTheDocument();
  });

  it("shows port info when server is running", () => {
    mockBridgeStore({ running: true, token: "test-token", port: 9400, host: "0.0.0.0" });
    render(<WsBridgeDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText(/9400/)).toBeInTheDocument();
  });

  it("shows copy button when token is available", () => {
    mockBridgeStore({ running: true, token: "copy-me-token", port: 9400 });
    render(<WsBridgeDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /copy token/i })).toBeInTheDocument();
  });

  it("copies token to clipboard when copy button is clicked", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    mockBridgeStore({ running: true, token: "copy-me-token", port: 9400 });
    render(<WsBridgeDialog open={true} onOpenChange={vi.fn()} />);

    const copyBtn = screen.getByRole("button", { name: /copy token/i });
    await user.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith("copy-me-token");
  });

  it("shows copied feedback after copying token", async () => {
    const user = userEvent.setup({ delay: null });
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    mockBridgeStore({ running: true, token: "abc-token", port: 9400 });
    render(<WsBridgeDialog open={true} onOpenChange={vi.fn()} />);

    const copyBtn = screen.getByRole("button", { name: /copy token/i });
    await user.click(copyBtn);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /copied/i })).toBeInTheDocument();
    });
  });

  it("shows client count when clients are connected", () => {
    mockBridgeStore({ running: true, token: "token", port: 9400, clients: 3 });
    render(<WsBridgeDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });

  it("shows 0 clients when no clients are connected", () => {
    mockBridgeStore({ running: true, token: "token", port: 9400, clients: 0 });
    render(<WsBridgeDialog open={true} onOpenChange={vi.fn()} />);
    // When running: client count section should be visible
    expect(screen.getByText(/connected/i)).toBeInTheDocument();
  });

  it("calls refreshStatus when dialog opens", () => {
    render(<WsBridgeDialog open={true} onOpenChange={vi.fn()} />);
    expect(mockRefreshStatus).toHaveBeenCalledOnce();
  });

  it("calls onOpenChange when dialog is closed", async () => {
    const onOpenChange = vi.fn();
    render(<WsBridgeDialog open={true} onOpenChange={onOpenChange} />);

    const closeBtn = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeBtn);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
