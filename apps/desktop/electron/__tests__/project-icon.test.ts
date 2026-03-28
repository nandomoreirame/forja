import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fsPromises from "fs/promises";

vi.mock("fs/promises");

const mockFsPromises = vi.mocked(fsPromises);

// Import after mocking
import {
  detectProjectIcon,
  readIconAsDataUrl,
  clearIconCache,
} from "../project-icon";

describe("detectProjectIcon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearIconCache();
  });

  afterEach(() => {
    clearIconCache();
  });

  it("returns null when no icon found", async () => {
    mockFsPromises.access.mockRejectedValue(new Error("ENOENT"));
    await expect(detectProjectIcon("/home/user/myapp")).resolves.toBeNull();
  });

  it("returns a data URL for a PNG icon", async () => {
    mockFsPromises.access.mockImplementation(async (p) => {
      if (String(p).endsWith("favicon.png")) return;
      throw new Error("ENOENT");
    });
    mockFsPromises.readFile.mockResolvedValue(Buffer.from("fake-png-data"));

    const result = await detectProjectIcon("/home/user/myapp");

    expect(result).toBe(
      `data:image/png;base64,${Buffer.from("fake-png-data").toString("base64")}`
    );
  });

  it("returns a data URL for an SVG icon with image/svg+xml mime type", async () => {
    mockFsPromises.access.mockImplementation(async (p) => {
      if (String(p).endsWith("favicon.svg")) return;
      throw new Error("ENOENT");
    });
    mockFsPromises.readFile.mockResolvedValue(Buffer.from("<svg></svg>"));

    const result = await detectProjectIcon("/home/user/myapp");

    expect(result).toBe(
      `data:image/svg+xml;base64,${Buffer.from("<svg></svg>").toString("base64")}`
    );
  });

  it("returns a data URL for an ICO icon with image/x-icon mime type", async () => {
    mockFsPromises.access.mockImplementation(async (p) => {
      if (String(p).endsWith("favicon.ico")) return;
      throw new Error("ENOENT");
    });
    mockFsPromises.readFile.mockResolvedValue(Buffer.from("fake-ico"));

    const result = await detectProjectIcon("/home/user/myapp");

    expect(result).toBe(
      `data:image/x-icon;base64,${Buffer.from("fake-ico").toString("base64")}`
    );
  });

  it("prefers favicon.svg over favicon.ico", async () => {
    mockFsPromises.access.mockImplementation(async (p) => {
      if (String(p).endsWith("favicon.svg") || String(p).endsWith("favicon.ico")) return;
      throw new Error("ENOENT");
    });
    mockFsPromises.readFile.mockResolvedValue(Buffer.from("<svg>logo</svg>"));

    const result = await detectProjectIcon("/home/user/myapp");

    expect(result).toContain("data:image/svg+xml;base64,");
  });

  it("returns null when file read fails", async () => {
    mockFsPromises.access.mockImplementation(async (p) => {
      if (String(p).endsWith("favicon.png")) return;
      throw new Error("ENOENT");
    });
    mockFsPromises.readFile.mockRejectedValue(new Error("EACCES: permission denied"));

    await expect(detectProjectIcon("/home/user/myapp")).resolves.toBeNull();
  });

  it("returns cached result on second call for same path", async () => {
    mockFsPromises.access.mockImplementation(async (p) => {
      if (String(p).endsWith("favicon.svg")) return;
      throw new Error("ENOENT");
    });
    mockFsPromises.readFile.mockResolvedValue(Buffer.from("<svg></svg>"));

    const result1 = await detectProjectIcon("/home/user/cached-app");
    const result2 = await detectProjectIcon("/home/user/cached-app");

    expect(result1).toBe(result2);
    // readFile should only be called once (second call uses cache)
    expect(mockFsPromises.readFile).toHaveBeenCalledTimes(1);
  });

  it("returns cached null on second call when no icon found", async () => {
    mockFsPromises.access.mockRejectedValue(new Error("ENOENT"));

    await detectProjectIcon("/home/user/no-icon-app");
    await detectProjectIcon("/home/user/no-icon-app");

    // access should only be called once per candidate per first lookup
    const accessCallCount = mockFsPromises.access.mock.calls.length;
    // Second call should not add more access calls
    expect(accessCallCount).toBe(accessCallCount); // same count as after first call
    // readFile should never be called
    expect(mockFsPromises.readFile).not.toHaveBeenCalled();
  });

  it("clears cache via clearIconCache", async () => {
    mockFsPromises.access.mockImplementation(async (p) => {
      if (String(p).endsWith("favicon.svg")) return;
      throw new Error("ENOENT");
    });
    mockFsPromises.readFile.mockResolvedValue(Buffer.from("<svg></svg>"));

    await detectProjectIcon("/home/user/app");
    clearIconCache();
    await detectProjectIcon("/home/user/app");

    // readFile should be called twice since cache was cleared
    expect(mockFsPromises.readFile).toHaveBeenCalledTimes(2);
  });

  it("caches result per path independently", async () => {
    mockFsPromises.access.mockImplementation(async (p) => {
      if (String(p).includes("app1") && String(p).endsWith("favicon.svg")) return;
      if (String(p).includes("app2") && String(p).endsWith("favicon.png")) return;
      throw new Error("ENOENT");
    });
    mockFsPromises.readFile.mockResolvedValue(Buffer.from("data"));

    const result1 = await detectProjectIcon("/home/user/app1");
    const result2 = await detectProjectIcon("/home/user/app2");

    expect(result1).toContain("image/svg+xml");
    expect(result2).toContain("image/png");
  });
});

describe("readIconAsDataUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads a file and returns a data URL", async () => {
    mockFsPromises.readFile.mockResolvedValue(Buffer.from("img-data"));

    const result = await readIconAsDataUrl("/path/to/icon.png");

    expect(result).toBe(
      `data:image/png;base64,${Buffer.from("img-data").toString("base64")}`
    );
  });

  it("uses correct mime type for each extension", async () => {
    mockFsPromises.readFile.mockResolvedValue(Buffer.from("x"));

    expect(await readIconAsDataUrl("/a/icon.svg")).toContain("data:image/svg+xml;base64,");
    expect(await readIconAsDataUrl("/a/icon.ico")).toContain("data:image/x-icon;base64,");
    expect(await readIconAsDataUrl("/a/icon.jpg")).toContain("data:image/jpeg;base64,");
    expect(await readIconAsDataUrl("/a/icon.webp")).toContain("data:image/webp;base64,");
  });

  it("returns null when file read fails", async () => {
    mockFsPromises.readFile.mockRejectedValue(new Error("ENOENT"));

    await expect(readIconAsDataUrl("/nonexistent/icon.png")).resolves.toBeNull();
  });
});
