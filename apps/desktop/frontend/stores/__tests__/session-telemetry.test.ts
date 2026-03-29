import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSessionTelemetryStore } from "../session-telemetry";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
  getCurrentWindow: () => ({ label: "main" }),
}));

import { invoke } from "@/lib/ipc";

describe("useSessionTelemetryStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionTelemetryStore.setState({ telemetry: {} });
  });

  it("starts with empty telemetry map", () => {
    expect(useSessionTelemetryStore.getState().telemetry).toEqual({});
  });

  it("getTelemetry returns null for unknown tab", () => {
    expect(useSessionTelemetryStore.getState().getTelemetry("tab-1")).toBeNull();
  });

  it("fetchTelemetry populates store with IPC result", async () => {
    vi.mocked(invoke).mockResolvedValueOnce({
      totalInputTokens: 5000,
      totalOutputTokens: 1000,
      totalCacheWriteTokens: 200,
      totalCacheReadTokens: 800,
      model: "claude-opus-4-6",
      lastTool: "Bash",
      messageCount: 3,
      costUsd: 0.15,
    });

    await useSessionTelemetryStore.getState().fetchTelemetry(
      "tab-1", "claude", "/project", "session-abc"
    );

    const result = useSessionTelemetryStore.getState().getTelemetry("tab-1");
    expect(result).not.toBeNull();
    expect(result!.totalInputTokens).toBe(5000);
    expect(result!.costUsd).toBe(0.15);
    expect(result!.lastTool).toBe("Bash");
  });

  it("fetchTelemetry handles null response gracefully", async () => {
    vi.mocked(invoke).mockResolvedValueOnce(null);

    await useSessionTelemetryStore.getState().fetchTelemetry(
      "tab-1", "gemini", "/project", "session-xyz"
    );

    expect(useSessionTelemetryStore.getState().getTelemetry("tab-1")).toBeNull();
  });

  it("cleanup removes telemetry for a tab", async () => {
    vi.mocked(invoke).mockResolvedValueOnce({
      totalInputTokens: 100,
      totalOutputTokens: 50,
      totalCacheWriteTokens: 0,
      totalCacheReadTokens: 0,
      model: "claude-sonnet-4-6",
      lastTool: null,
      messageCount: 1,
      costUsd: 0.01,
    });

    await useSessionTelemetryStore.getState().fetchTelemetry(
      "tab-1", "claude", "/project", "session-abc"
    );
    expect(useSessionTelemetryStore.getState().getTelemetry("tab-1")).not.toBeNull();

    useSessionTelemetryStore.getState().cleanup("tab-1");
    expect(useSessionTelemetryStore.getState().getTelemetry("tab-1")).toBeNull();
  });
});
