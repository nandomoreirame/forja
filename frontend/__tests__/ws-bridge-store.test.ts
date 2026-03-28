import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

import { useWsBridgeStore } from "../stores/ws-bridge";
import { invoke } from "@/lib/ipc";

const mockInvoke = invoke as ReturnType<typeof vi.fn>;

describe("useWsBridgeStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useWsBridgeStore.setState({
      running: false,
      port: 9400,
      host: "0.0.0.0",
      clients: 0,
      token: "",
    });
  });

  it("has correct initial state", () => {
    const state = useWsBridgeStore.getState();
    expect(state.running).toBe(false);
    expect(state.port).toBe(9400);
    expect(state.host).toBe("0.0.0.0");
    expect(state.clients).toBe(0);
    expect(state.token).toBe("");
  });

  it("start() calls invoke('ws-bridge:start') and sets running: true", async () => {
    mockInvoke.mockResolvedValueOnce({
      ok: true,
      data: { port: 9400, host: "0.0.0.0", token: "abc123" },
    });

    await useWsBridgeStore.getState().start();

    expect(mockInvoke).toHaveBeenCalledWith("ws-bridge:start");
    const state = useWsBridgeStore.getState();
    expect(state.running).toBe(true);
    expect(state.port).toBe(9400);
    expect(state.host).toBe("0.0.0.0");
    expect(state.token).toBe("abc123");
  });

  it("start() does not set running if result is not ok", async () => {
    mockInvoke.mockResolvedValueOnce({ ok: false });

    await useWsBridgeStore.getState().start();

    expect(useWsBridgeStore.getState().running).toBe(false);
  });

  it("stop() calls invoke('ws-bridge:stop') and sets running: false", async () => {
    useWsBridgeStore.setState({ running: true, clients: 3, token: "abc" });
    mockInvoke.mockResolvedValueOnce(undefined);

    await useWsBridgeStore.getState().stop();

    expect(mockInvoke).toHaveBeenCalledWith("ws-bridge:stop");
    const state = useWsBridgeStore.getState();
    expect(state.running).toBe(false);
    expect(state.clients).toBe(0);
    expect(state.token).toBe("");
  });

  it("toggle() calls start() when not running", async () => {
    mockInvoke.mockResolvedValueOnce({
      ok: true,
      data: { port: 9400, host: "0.0.0.0", token: "tok" },
    });

    await useWsBridgeStore.getState().toggle();

    expect(mockInvoke).toHaveBeenCalledWith("ws-bridge:start");
    expect(useWsBridgeStore.getState().running).toBe(true);
  });

  it("toggle() calls stop() when running", async () => {
    useWsBridgeStore.setState({ running: true });
    mockInvoke.mockResolvedValueOnce(undefined);

    await useWsBridgeStore.getState().toggle();

    expect(mockInvoke).toHaveBeenCalledWith("ws-bridge:stop");
    expect(useWsBridgeStore.getState().running).toBe(false);
  });

  it("refreshStatus() updates store from IPC response", async () => {
    mockInvoke.mockResolvedValueOnce({
      running: true,
      port: 9401,
      host: "127.0.0.1",
      clients: 2,
      token: "newtoken",
    });

    await useWsBridgeStore.getState().refreshStatus();

    expect(mockInvoke).toHaveBeenCalledWith("ws-bridge:status");
    const state = useWsBridgeStore.getState();
    expect(state.running).toBe(true);
    expect(state.port).toBe(9401);
    expect(state.host).toBe("127.0.0.1");
    expect(state.clients).toBe(2);
    expect(state.token).toBe("newtoken");
  });

  it("refreshStatus() does nothing if IPC returns null", async () => {
    mockInvoke.mockResolvedValueOnce(null);

    await useWsBridgeStore.getState().refreshStatus();

    const state = useWsBridgeStore.getState();
    expect(state.running).toBe(false);
    expect(state.port).toBe(9400);
  });
});
