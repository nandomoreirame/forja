import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as net from "net";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";

describe("cli-mode", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  const origArgv = process.argv;

  beforeEach(() => {
    vi.resetModules();
    exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as () => never);
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    process.argv = origArgv;
    vi.restoreAllMocks();
  });

  it("returns false when no CLI command is given", async () => {
    process.argv = ["/usr/bin/forja"];
    const { tryCliMode } = await import("../cli-mode.js");
    const result = await tryCliMode();
    expect(result).toBe(false);
  });

  it("returns false for unknown commands (lets Electron handle them)", async () => {
    process.argv = ["/usr/bin/forja", "unknown-thing"];
    const { tryCliMode } = await import("../cli-mode.js");
    const result = await tryCliMode();
    expect(result).toBe(false);
  });

  it("returns false when argv only has Electron flags", async () => {
    process.argv = ["/usr/bin/forja", "--no-sandbox", "--type=gpu-process"];
    const { tryCliMode } = await import("../cli-mode.js");
    const result = await tryCliMode();
    expect(result).toBe(false);
  });

  it("handles ping command via socket", async () => {
    // Create socket at the real path the module will look for
    const socketPath = path.join(os.tmpdir(), "forja.sock");
    const hadExisting = fs.existsSync(socketPath);
    let existingBackup = "";
    if (hadExisting) {
      existingBackup = socketPath + ".backup-test";
      fs.renameSync(socketPath, existingBackup);
    }

    const server = net.createServer((conn) => {
      conn.on("data", (data) => {
        const cmd = JSON.parse(data.toString().trim());
        if (cmd.type === "ping") {
          conn.write(JSON.stringify({ ok: true, data: { version: "1.0.0" } }) + "\n");
        }
      });
    });
    await new Promise<void>((r) => server.listen(socketPath, r));

    process.argv = ["/usr/bin/forja", "ping"];
    const { tryCliMode } = await import("../cli-mode.js");
    await tryCliMode();

    expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining("1.0.0"));
    expect(exitSpy).toHaveBeenCalledWith(0);

    await new Promise<void>((r) => server.close(() => r()));
    if (fs.existsSync(socketPath)) fs.unlinkSync(socketPath);
    if (existingBackup && fs.existsSync(existingBackup)) {
      fs.renameSync(existingBackup, socketPath);
    }
  });

  it("prints help with --help flag", async () => {
    process.argv = ["/usr/bin/forja", "--help"];
    const { tryCliMode } = await import("../cli-mode.js");
    await tryCliMode();

    expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining("Forja CLI"));
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("prints error when Forja is not running", async () => {
    // Ensure no socket exists
    const socketPath = path.join(os.tmpdir(), "forja.sock");
    const hadExisting = fs.existsSync(socketPath);
    if (hadExisting) {
      fs.renameSync(socketPath, socketPath + ".backup-test2");
    }

    process.argv = ["/usr/bin/forja", "ping"];
    const { tryCliMode } = await import("../cli-mode.js");
    await tryCliMode();

    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("not running"));
    expect(exitSpy).toHaveBeenCalledWith(1);

    if (hadExisting) {
      fs.renameSync(socketPath + ".backup-test2", socketPath);
    }
  });
});
