import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("preload saved sessions bridge", () => {
  it("documents savedSessions helpers in preload", () => {
    const source = readFileSync(resolve(__dirname, "../preload.cts"), "utf-8");

    expect(source).toContain("savedSessions:");
    expect(source).toContain('ipcRenderer.invoke("saved_sessions:save"');
    expect(source).toContain('ipcRenderer.invoke("saved_sessions:load"');
    expect(source).toContain('ipcRenderer.invoke("saved_sessions:delete"');
  });
});
