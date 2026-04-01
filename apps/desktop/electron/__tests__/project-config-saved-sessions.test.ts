import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import {
  addSavedSession,
  readProjectConfig,
  readSavedSessions,
  removeSavedSession,
  writeProjectConfig,
  type SavedSessionEntry,
} from "../project-config.js";

describe("project-config saved sessions", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "forja-saved-sessions-"));
  });

  afterEach(() => {
    vi.useRealTimers();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns an empty list when the project config does not exist", () => {
    expect(readSavedSessions(tmpDir)).toEqual([]);
  });

  it("prunes saved sessions older than 7 days when loading", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-31T12:00:00.000Z"));

    writeProjectConfig(tmpDir, {
      savedSessions: [
        createEntry("expired", "2026-03-23T11:59:59.000Z"),
        createEntry("fresh", "2026-03-30T10:00:00.000Z"),
      ],
    });

    expect(readSavedSessions(tmpDir)).toEqual([
      expect.objectContaining({ id: "fresh" }),
    ]);
    expect(readProjectConfig(tmpDir)?.savedSessions).toEqual([
      expect.objectContaining({ id: "fresh" }),
    ]);
  });

  it("keeps only the newest 20 saved sessions", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-31T12:00:00.000Z"));

    for (let index = 1; index <= 21; index += 1) {
      addSavedSession(
        tmpDir,
        createEntry(
          `session-${index}`,
          `2026-03-31T12:${index.toString().padStart(2, "0")}:00.000Z`,
        ),
      );
    }

    const sessions = readSavedSessions(tmpDir);
    expect(sessions).toHaveLength(20);
    expect(sessions[0]?.id).toBe("session-2");
    expect(sessions.at(-1)?.id).toBe("session-21");
  });

  it("removes expired sessions before appending a new one", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-31T12:00:00.000Z"));

    writeProjectConfig(tmpDir, {
      savedSessions: [createEntry("expired", "2026-03-20T12:00:00.000Z")],
    });

    addSavedSession(
      tmpDir,
      createEntry("fresh", "2026-03-31T12:00:00.000Z"),
    );

    expect(readSavedSessions(tmpDir).map((entry) => entry.id)).toEqual([
      "fresh",
    ]);
  });

  it("removes a saved session by id", () => {
    writeProjectConfig(tmpDir, {
      savedSessions: [
        createEntry("keep", "2026-03-30T10:00:00.000Z"),
        createEntry("remove", "2026-03-30T11:00:00.000Z"),
      ],
    });

    removeSavedSession(tmpDir, "remove");

    expect(readSavedSessions(tmpDir).map((entry) => entry.id)).toEqual([
      "keep",
    ]);
  });
});

function createEntry(id: string, savedAt: string): SavedSessionEntry {
  return {
    id,
    sessionType: "claude",
    customName: `Session ${id}`,
    cliSessionId: `cli-${id}`,
    savedAt,
  };
}
