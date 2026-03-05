import { describe, it, expect } from "vitest";
import { detectLanguage } from "../detect-language";

describe("detectLanguage", () => {
  it("should detect TypeScript files", () => {
    expect(detectLanguage("app.ts")).toBe("typescript");
    expect(detectLanguage("component.tsx")).toBe("typescript");
  });

  it("should detect JavaScript files", () => {
    expect(detectLanguage("index.js")).toBe("javascript");
    expect(detectLanguage("config.mjs")).toBe("javascript");
    expect(detectLanguage("config.cjs")).toBe("javascript");
  });

  it("should detect JSON files", () => {
    expect(detectLanguage("package.json")).toBe("json");
    expect(detectLanguage("tsconfig.jsonc")).toBe("json");
  });

  it("should detect Python files", () => {
    expect(detectLanguage("main.py")).toBe("python");
  });

  it("should detect Rust files", () => {
    expect(detectLanguage("lib.rs")).toBe("rust");
  });

  it("should detect Go files", () => {
    expect(detectLanguage("main.go")).toBe("go");
  });

  it("should detect CSS/SCSS/LESS files", () => {
    expect(detectLanguage("styles.css")).toBe("css");
    expect(detectLanguage("styles.scss")).toBe("scss");
    expect(detectLanguage("styles.less")).toBe("less");
  });

  it("should detect HTML files", () => {
    expect(detectLanguage("index.html")).toBe("html");
    expect(detectLanguage("page.htm")).toBe("html");
  });

  it("should detect YAML files", () => {
    expect(detectLanguage("config.yaml")).toBe("yaml");
    expect(detectLanguage("config.yml")).toBe("yaml");
  });

  it("should detect Dockerfile", () => {
    expect(detectLanguage("Dockerfile")).toBe("dockerfile");
    expect(detectLanguage("Dockerfile.prod")).toBe("dockerfile");
  });

  it("should detect Makefile", () => {
    expect(detectLanguage("Makefile")).toBe("makefile");
    expect(detectLanguage("GNUmakefile")).toBe("makefile");
  });

  it("should detect shell scripts", () => {
    expect(detectLanguage("script.sh")).toBe("shell");
    expect(detectLanguage("script.bash")).toBe("shell");
    expect(detectLanguage("script.zsh")).toBe("shell");
  });

  it("should detect C/C++ files", () => {
    expect(detectLanguage("main.c")).toBe("c");
    expect(detectLanguage("main.cpp")).toBe("cpp");
    expect(detectLanguage("header.h")).toBe("c");
    expect(detectLanguage("header.hpp")).toBe("cpp");
  });

  it("should return plaintext for unknown extensions", () => {
    expect(detectLanguage("readme.xyz")).toBe("plaintext");
    expect(detectLanguage("file")).toBe("plaintext");
  });

  it("should handle path with directories", () => {
    expect(detectLanguage("src/components/app.tsx")).toBe("typescript");
    expect(detectLanguage("/home/user/project/Dockerfile")).toBe("dockerfile");
  });

  it("should be case-insensitive", () => {
    expect(detectLanguage("README.MD")).toBe("markdown");
    expect(detectLanguage("Main.PY")).toBe("python");
  });
});
