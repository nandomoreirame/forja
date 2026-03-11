import { describe, it, expect } from "vitest";

const SAFE_BINARY_RE = /^[a-zA-Z0-9._-]+$/;

describe("CLI detection security", () => {
  it("should validate binary names with safe regex", () => {
    expect(SAFE_BINARY_RE.test("claude")).toBe(true);
    expect(SAFE_BINARY_RE.test("gemini")).toBe(true);
    expect(SAFE_BINARY_RE.test("node-pty")).toBe(true);
    expect(SAFE_BINARY_RE.test("python3.11")).toBe(true);
  });

  it("should reject binary names with shell metacharacters", () => {
    expect(SAFE_BINARY_RE.test("test; rm -rf /")).toBe(false);
    expect(SAFE_BINARY_RE.test("claude && echo pwned")).toBe(false);
    expect(SAFE_BINARY_RE.test("gemini | cat /etc/passwd")).toBe(false);
    expect(SAFE_BINARY_RE.test("codex$(whoami)")).toBe(false);
    expect(SAFE_BINARY_RE.test("")).toBe(false);
  });
});

describe("URL scheme validation", () => {
  function isAllowedUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ["http:", "https:"].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  it("should allow http and https URLs", () => {
    expect(isAllowedUrl("https://github.com")).toBe(true);
    expect(isAllowedUrl("http://localhost:3000")).toBe(true);
    expect(isAllowedUrl("https://example.com/path?query=value")).toBe(true);
  });

  it("should block dangerous URL schemes", () => {
    expect(isAllowedUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedUrl("file:///etc/passwd")).toBe(false);
    expect(isAllowedUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isAllowedUrl("vbscript:msgbox")).toBe(false);
  });

  it("should block invalid URLs", () => {
    expect(isAllowedUrl("not a url")).toBe(false);
    expect(isAllowedUrl("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Webview security hardening (mirrors the will-attach-webview guard in main.ts)
// ---------------------------------------------------------------------------

/**
 * Simulates the `will-attach-webview` handler that runs in the Electron main
 * process whenever the renderer mounts a <webview> element. The handler strips
 * renderer-supplied preload scripts and enforces nodeIntegration=false so that
 * compromised renderer code cannot escalate privileges through a webview.
 */
function applyWebviewSecurityPolicy(
  webPreferences: Record<string, unknown>,
): void {
  delete webPreferences.preload;
  webPreferences.nodeIntegration = false;
  webPreferences.contextIsolation = true;
}

describe("webview security hardening (will-attach-webview policy)", () => {
  it("strips a renderer-supplied preload script", () => {
    const prefs: Record<string, unknown> = {
      preload: "/malicious/preload.js",
      nodeIntegration: false,
    };
    applyWebviewSecurityPolicy(prefs);
    expect(prefs.preload).toBeUndefined();
  });

  it("enforces nodeIntegration=false even when renderer tried to enable it", () => {
    const prefs: Record<string, unknown> = { nodeIntegration: true };
    applyWebviewSecurityPolicy(prefs);
    expect(prefs.nodeIntegration).toBe(false);
  });

  it("enforces contextIsolation=true even when renderer tried to disable it", () => {
    const prefs: Record<string, unknown> = { contextIsolation: false };
    applyWebviewSecurityPolicy(prefs);
    expect(prefs.contextIsolation).toBe(true);
  });

  it("preserves unrelated webPreferences keys", () => {
    const prefs: Record<string, unknown> = {
      partition: "persist:browser-pane",
      allowpopups: false,
    };
    applyWebviewSecurityPolicy(prefs);
    expect(prefs.partition).toBe("persist:browser-pane");
    expect(prefs.allowpopups).toBe(false);
  });

  it("is idempotent — applying the policy twice yields the same result", () => {
    const prefs: Record<string, unknown> = {
      preload: "/some/preload.js",
      nodeIntegration: true,
      contextIsolation: false,
    };
    applyWebviewSecurityPolicy(prefs);
    applyWebviewSecurityPolicy(prefs);
    expect(prefs.preload).toBeUndefined();
    expect(prefs.nodeIntegration).toBe(false);
    expect(prefs.contextIsolation).toBe(true);
  });
});
