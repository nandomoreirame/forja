import { describe, it, expect, vi, beforeEach } from "vitest";
import { detectEditor, EDITOR_CANDIDATES } from "../editor-detector.js";

vi.mock("child_process", () => ({
  execFile: vi.fn(),
}));

describe("editor-detector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports a list of editor candidates", () => {
    expect(EDITOR_CANDIDATES).toBeInstanceOf(Array);
    expect(EDITOR_CANDIDATES.length).toBeGreaterThan(0);
    expect(EDITOR_CANDIDATES).toContain("code");
    expect(EDITOR_CANDIDATES).toContain("cursor");
  });

  it("returns the first editor found in PATH", async () => {
    const { execFile } = await import("child_process");
    const mockExecFile = vi.mocked(execFile);

    // First candidate ("code") not found, second ("cursor") found
    mockExecFile.mockImplementation((_cmd, args, _opts, cb) => {
      const binary = (args as string[])[0];
      const callback = cb as (err: Error | null) => void;
      if (binary === "cursor") {
        callback(null);
      } else {
        callback(new Error("not found"));
      }
      return undefined as never;
    });

    const result = await detectEditor();
    expect(result).toBe("cursor");
  });

  it("returns null when no editor is found", async () => {
    const { execFile } = await import("child_process");
    const mockExecFile = vi.mocked(execFile);

    mockExecFile.mockImplementation((_cmd, _args, _opts, cb) => {
      const callback = cb as (err: Error | null) => void;
      callback(new Error("not found"));
      return undefined as never;
    });

    const result = await detectEditor();
    expect(result).toBeNull();
  });
});
