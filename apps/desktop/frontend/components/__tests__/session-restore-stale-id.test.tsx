import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
  getCurrentWindow: vi.fn(() => ({ label: "main" })),
}));

import { invoke } from "@/lib/ipc";
import { resolveResumeArgs } from "@/lib/resolve-resume-args";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";

const mockedInvoke = vi.mocked(invoke);

describe("restore with stale cliSessionId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTerminalTabsStore.setState({ tabs: [], activeTabId: null, counter: 0 });
  });

  it("falls back to bare --resume when saved session ID is stale", async () => {
    mockedInvoke.mockResolvedValue(false as never);

    const result = await resolveResumeArgs({
      sessionType: "claude",
      cliSessionId: "renamed-away-id",
      projectPath: "/project",
    });

    expect(result).toEqual({
      args: ["--resume"],
      sessionIdValid: false,
    });
  });

  it("uses full --resume <id> when session ID is valid", async () => {
    mockedInvoke.mockResolvedValue(true as never);

    const result = await resolveResumeArgs({
      sessionType: "claude",
      cliSessionId: "valid-id-456",
      projectPath: "/project",
    });

    expect(result).toEqual({
      args: ["--resume", "valid-id-456"],
      sessionIdValid: true,
    });
  });

  it("clears stale cliSessionId from tab store during restore flow", async () => {
    mockedInvoke.mockResolvedValue(false as never);

    const store = useTerminalTabsStore.getState();
    store.addTab("tab-1", "/project", "claude");
    store.setCliSessionId("tab-1", "stale-id-123");

    const result = await resolveResumeArgs({
      sessionType: "claude",
      cliSessionId: "stale-id-123",
      projectPath: "/project",
    });

    // Simulate what spawnWithResume does when sessionIdValid is false
    if (result && !result.sessionIdValid) {
      useTerminalTabsStore.getState().setCliSessionId("tab-1", "");
    }

    const tab = useTerminalTabsStore.getState().tabs.find((t) => t.id === "tab-1");
    expect(tab?.cliSessionId).toBe("");
    expect(result?.args).toEqual(["--resume"]);
  });

  it("marks restored tab as resumed so it stays open on exit", async () => {
    mockedInvoke.mockResolvedValue(false as never);

    const store = useTerminalTabsStore.getState();
    store.addTab("tab-1", "/project", "claude");
    store.setCliSessionId("tab-1", "stale-id");

    // Simulate what spawnWithResume does: markTabResumed when resumeArgs exist
    const result = await resolveResumeArgs({
      sessionType: "claude",
      cliSessionId: "stale-id",
      projectPath: "/project",
    });

    if (result) {
      useTerminalTabsStore.getState().markTabResumed("tab-1");
    }

    const tab = useTerminalTabsStore.getState().tabs.find((t) => t.id === "tab-1");
    expect(tab?.wasResumed).toBe(true);
  });
});
