import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";

vi.mock("fs");

const mockFs = vi.mocked(fs);

// Import after mocking
import { detectProjectIcon, readIconAsDataUrl } from "../project-icon";

describe("detectProjectIcon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no icon found", () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(detectProjectIcon("/home/user/myapp")).toBeNull();
  });

  it("returns a data URL for a PNG icon", () => {
    mockFs.existsSync.mockImplementation((p) =>
      String(p).endsWith("favicon.png")
    );
    mockFs.readFileSync.mockReturnValue(Buffer.from("fake-png-data"));

    const result = detectProjectIcon("/home/user/myapp");

    expect(result).toBe(
      `data:image/png;base64,${Buffer.from("fake-png-data").toString("base64")}`
    );
  });

  it("returns a data URL for an SVG icon with image/svg+xml mime type", () => {
    mockFs.existsSync.mockImplementation((p) =>
      String(p).endsWith("favicon.svg")
    );
    mockFs.readFileSync.mockReturnValue(Buffer.from("<svg></svg>"));

    const result = detectProjectIcon("/home/user/myapp");

    expect(result).toBe(
      `data:image/svg+xml;base64,${Buffer.from("<svg></svg>").toString("base64")}`
    );
  });

  it("returns a data URL for an ICO icon with image/x-icon mime type", () => {
    mockFs.existsSync.mockImplementation((p) =>
      String(p).endsWith("favicon.ico")
    );
    mockFs.readFileSync.mockReturnValue(Buffer.from("fake-ico"));

    const result = detectProjectIcon("/home/user/myapp");

    expect(result).toBe(
      `data:image/x-icon;base64,${Buffer.from("fake-ico").toString("base64")}`
    );
  });

  it("prefers favicon.svg over favicon.ico", () => {
    mockFs.existsSync.mockImplementation((p) =>
      String(p).endsWith("favicon.svg") || String(p).endsWith("favicon.ico")
    );
    mockFs.readFileSync.mockReturnValue(Buffer.from("<svg>logo</svg>"));

    const result = detectProjectIcon("/home/user/myapp");

    expect(result).toContain("data:image/svg+xml;base64,");
  });

  it("returns null when file read fails", () => {
    mockFs.existsSync.mockImplementation((p) =>
      String(p).endsWith("favicon.png")
    );
    mockFs.readFileSync.mockImplementation(() => {
      throw new Error("EACCES: permission denied");
    });

    expect(detectProjectIcon("/home/user/myapp")).toBeNull();
  });
});

describe("readIconAsDataUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads a file and returns a data URL", () => {
    mockFs.readFileSync.mockReturnValue(Buffer.from("img-data"));

    const result = readIconAsDataUrl("/path/to/icon.png");

    expect(result).toBe(
      `data:image/png;base64,${Buffer.from("img-data").toString("base64")}`
    );
  });

  it("uses correct mime type for each extension", () => {
    mockFs.readFileSync.mockReturnValue(Buffer.from("x"));

    expect(readIconAsDataUrl("/a/icon.svg")).toContain("data:image/svg+xml;base64,");
    expect(readIconAsDataUrl("/a/icon.ico")).toContain("data:image/x-icon;base64,");
    expect(readIconAsDataUrl("/a/icon.jpg")).toContain("data:image/jpeg;base64,");
    expect(readIconAsDataUrl("/a/icon.webp")).toContain("data:image/webp;base64,");
  });

  it("returns null when file read fails", () => {
    mockFs.readFileSync.mockImplementation(() => {
      throw new Error("ENOENT");
    });

    expect(readIconAsDataUrl("/nonexistent/icon.png")).toBeNull();
  });
});
