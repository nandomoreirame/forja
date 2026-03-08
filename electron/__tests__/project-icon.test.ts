import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";

vi.mock("fs");

const mockFs = vi.mocked(fs);

// Import after mocking
import { detectProjectIcon } from "../project-icon";

describe("detectProjectIcon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no icon found", () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(detectProjectIcon("/home/user/myapp")).toBeNull();
  });

  it("returns favicon.ico path when it exists", () => {
    mockFs.existsSync.mockImplementation((p) =>
      String(p).endsWith("favicon.ico")
    );
    const result = detectProjectIcon("/home/user/myapp");
    expect(result).toContain("favicon.ico");
  });

  it("prefers favicon.svg over favicon.ico", () => {
    mockFs.existsSync.mockImplementation((p) =>
      String(p).endsWith("favicon.svg") || String(p).endsWith("favicon.ico")
    );
    const result = detectProjectIcon("/home/user/myapp");
    expect(result).toContain("favicon.svg");
  });

  it("returns logo.png from public/images when available", () => {
    mockFs.existsSync.mockImplementation((p) =>
      String(p).includes("public/images/logo.png")
    );
    const result = detectProjectIcon("/home/user/myapp");
    expect(result).toContain("logo.png");
  });
});
