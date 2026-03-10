import { describe, it, expect } from "vitest";
import { extractLocalhostUrl, isLocalhostUrl } from "../localhost-detector";

describe("extractLocalhostUrl", () => {
  it("extracts http://localhost:3000 from plain text", () => {
    expect(extractLocalhostUrl("Server running at http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("extracts http://127.0.0.1:5173 from vite output", () => {
    expect(extractLocalhostUrl("  ➜  Local:   http://127.0.0.1:5173/")).toBe("http://127.0.0.1:5173/");
  });

  it("extracts http://localhost:1420 with trailing path", () => {
    expect(extractLocalhostUrl("ready at http://localhost:1420/app")).toBe("http://localhost:1420/app");
  });

  it("extracts https://localhost:3000", () => {
    expect(extractLocalhostUrl("listening on https://localhost:3000")).toBe("https://localhost:3000");
  });

  it("extracts http://0.0.0.0:8080", () => {
    expect(extractLocalhostUrl("  http://0.0.0.0:8080  ")).toBe("http://0.0.0.0:8080");
  });

  it("returns null for non-localhost URLs", () => {
    expect(extractLocalhostUrl("Visit https://example.com")).toBeNull();
  });

  it("returns null for text without URLs", () => {
    expect(extractLocalhostUrl("just some text")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractLocalhostUrl("")).toBeNull();
  });

  it("handles ANSI escape codes in terminal output", () => {
    // Simulated ANSI-colored output
    expect(extractLocalhostUrl("\x1b[32m➜\x1b[0m  Local: \x1b[36mhttp://localhost:5173/\x1b[0m")).toBe("http://localhost:5173/");
  });

  it("extracts URL from Next.js output format", () => {
    expect(extractLocalhostUrl("- Local:        http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("extracts URL from Vite output format", () => {
    expect(extractLocalhostUrl("  ➜  Local:   http://localhost:5173/")).toBe("http://localhost:5173/");
  });
});

describe("isLocalhostUrl", () => {
  it("returns true for http://localhost:3000", () => {
    expect(isLocalhostUrl("http://localhost:3000")).toBe(true);
  });

  it("returns true for http://127.0.0.1:5173", () => {
    expect(isLocalhostUrl("http://127.0.0.1:5173")).toBe(true);
  });

  it("returns true for http://0.0.0.0:8080", () => {
    expect(isLocalhostUrl("http://0.0.0.0:8080")).toBe(true);
  });

  it("returns true for https://localhost:3000", () => {
    expect(isLocalhostUrl("https://localhost:3000")).toBe(true);
  });

  it("returns true for http://localhost:3000/app/dashboard", () => {
    expect(isLocalhostUrl("http://localhost:3000/app/dashboard")).toBe(true);
  });

  it("returns true for http://localhost without port", () => {
    expect(isLocalhostUrl("http://localhost")).toBe(true);
  });

  it("returns false for https://example.com", () => {
    expect(isLocalhostUrl("https://example.com")).toBe(false);
  });

  it("returns false for https://localhost.evil.com", () => {
    expect(isLocalhostUrl("https://localhost.evil.com")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isLocalhostUrl("")).toBe(false);
  });

  it("returns false for invalid URL", () => {
    expect(isLocalhostUrl("not-a-url")).toBe(false);
  });
});
