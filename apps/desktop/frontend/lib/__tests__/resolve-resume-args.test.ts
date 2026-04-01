import { describe, expect, it, vi, beforeEach } from "vitest";
import { resolveResumeArgs } from "../resolve-resume-args";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
}));

import { invoke } from "@/lib/ipc";

const mockInvoke = vi.mocked(invoke);

describe("resolveResumeArgs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns resume args for a valid Claude session", async () => {
    mockInvoke.mockResolvedValue(true);

    const result = await resolveResumeArgs({
      sessionType: "claude",
      cliSessionId: "abc-123",
      projectPath: "/home/user/project",
    });

    expect(result).toEqual({
      args: ["--resume", "abc-123"],
      sessionIdValid: true,
    });
    expect(mockInvoke).toHaveBeenCalledWith("validate_cli_session", {
      cliId: "claude",
      projectPath: "/home/user/project",
      sessionId: "abc-123",
    });
  });

  it("returns bare --resume for a stale Claude session", async () => {
    mockInvoke.mockResolvedValue(false);

    const result = await resolveResumeArgs({
      sessionType: "claude",
      cliSessionId: "stale-abc-123",
      projectPath: "/home/user/project",
    });

    expect(result).toEqual({
      args: ["--resume"],
      sessionIdValid: false,
    });
  });

  it("returns undefined when no cliSessionId is provided", async () => {
    const result = await resolveResumeArgs({
      sessionType: "claude",
      cliSessionId: undefined,
      projectPath: "/home/user/project",
    });

    expect(result).toBeUndefined();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("skips validation for Gemini (resumeIdType=latest) and returns --resume latest", async () => {
    const result = await resolveResumeArgs({
      sessionType: "gemini",
      cliSessionId: "gemini-session-xyz",
      projectPath: "/home/user/project",
    });

    expect(result).toEqual({
      args: ["--resume", "latest"],
      sessionIdValid: true,
    });
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("returns undefined for terminal session type", async () => {
    const result = await resolveResumeArgs({
      sessionType: "terminal",
      cliSessionId: "some-session-id",
      projectPath: "/home/user/project",
    });

    expect(result).toBeUndefined();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("returns bare --resume when IPC call rejects (safe fallback)", async () => {
    mockInvoke.mockRejectedValue(new Error("IPC connection error"));

    const result = await resolveResumeArgs({
      sessionType: "claude",
      cliSessionId: "abc-123",
      projectPath: "/home/user/project",
    });

    expect(result).toEqual({
      args: ["--resume"],
      sessionIdValid: false,
    });
  });

  it("returns resume args with correct format for Codex (no dashes)", async () => {
    mockInvoke.mockResolvedValue(true);

    const result = await resolveResumeArgs({
      sessionType: "codex",
      cliSessionId: "codex-session-1",
      projectPath: "/home/user/project",
    });

    expect(result).toEqual({
      args: ["resume", "codex-session-1"],
      sessionIdValid: true,
    });
  });

  it("returns resume args with equals format for Cursor", async () => {
    mockInvoke.mockResolvedValue(true);

    const result = await resolveResumeArgs({
      sessionType: "cursor-agent",
      cliSessionId: "cursor-chat-1",
      projectPath: "/home/user/project",
    });

    expect(result).toEqual({
      args: ["--resume=cursor-chat-1"],
      sessionIdValid: true,
    });
  });

  it("returns undefined for gh-copilot (no resumeFlag)", async () => {
    const result = await resolveResumeArgs({
      sessionType: "gh-copilot",
      cliSessionId: "some-session-id",
      projectPath: "/home/user/project",
    });

    expect(result).toBeUndefined();
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});
