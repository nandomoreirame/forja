import { describe, it, expect, vi, beforeEach } from "vitest";
import * as path from "path";

vi.mock("chokidar", () => ({
  default: {
    watch: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      close: vi.fn().mockResolvedValue(undefined),
    })),
  },
}));

import chokidar from "chokidar";

describe("watcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses path.join to construct .git path (cross-platform)", async () => {
    const { startWatcher } = await import("../watcher");
    const sender = {
      isDestroyed: vi.fn().mockReturnValue(false),
      send: vi.fn(),
    };

    startWatcher(1, "/home/user/project", sender as unknown as import("electron").WebContents);

    expect(chokidar.watch).toHaveBeenCalledWith(
      path.join("/home/user/project", ".git"),
      expect.objectContaining({ depth: 2 }),
    );
  });
});
