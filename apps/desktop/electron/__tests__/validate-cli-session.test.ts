import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock cli-sessions before importing anything that depends on it
vi.mock("../cli-sessions.js", () => ({
  getCliSessions: vi.fn(),
}));

import { getCliSessions } from "../cli-sessions.js";

const mockGetCliSessions = vi.mocked(getCliSessions);

// The inline logic from the IPC handler extracted for testability
function validateCliSession(
  cliId: string,
  projectPath: string,
  sessionId: string,
): boolean {
  const sessions = getCliSessions(cliId, projectPath, 50);
  return sessions.some((s) => s.sessionId === sessionId);
}

describe("validate_cli_session IPC handler logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when sessionId exists in sessions", () => {
    mockGetCliSessions.mockReturnValue([
      { sessionId: "abc-123", modified: "2026-03-01T10:00:00.000Z" },
      { sessionId: "def-456", modified: "2026-03-01T09:00:00.000Z" },
    ]);

    const result = validateCliSession("claude", "/home/user/project", "abc-123");

    expect(result).toBe(true);
    expect(mockGetCliSessions).toHaveBeenCalledWith("claude", "/home/user/project", 50);
  });

  it("returns false when sessionId does not exist in sessions", () => {
    mockGetCliSessions.mockReturnValue([
      { sessionId: "abc-123", modified: "2026-03-01T10:00:00.000Z" },
      { sessionId: "def-456", modified: "2026-03-01T09:00:00.000Z" },
    ]);

    const result = validateCliSession("claude", "/home/user/project", "nonexistent-999");

    expect(result).toBe(false);
  });

  it("returns false when CLI has no sessions (empty array)", () => {
    mockGetCliSessions.mockReturnValue([]);

    const result = validateCliSession("claude", "/home/user/project", "abc-123");

    expect(result).toBe(false);
  });

  it("returns false for CLIs without session support (returns empty array)", () => {
    // CLIs that don't support sessions return empty arrays from getCliSessions
    mockGetCliSessions.mockReturnValue([]);

    const result = validateCliSession("unsupported-cli", "/home/user/project", "abc-123");

    expect(result).toBe(false);
    expect(mockGetCliSessions).toHaveBeenCalledWith("unsupported-cli", "/home/user/project", 50);
  });

  it("finds session among multiple sessions", () => {
    mockGetCliSessions.mockReturnValue([
      { sessionId: "first-001", modified: "2026-03-03T10:00:00.000Z" },
      { sessionId: "second-002", modified: "2026-03-02T10:00:00.000Z" },
      { sessionId: "third-003", modified: "2026-03-01T10:00:00.000Z" },
    ]);

    expect(validateCliSession("gemini", "/project", "second-002")).toBe(true);
    expect(validateCliSession("gemini", "/project", "fourth-004")).toBe(false);
  });
});
