import { describe, test, expect } from "vitest";
import { resolveImeConfig } from "../ime-config.js";

describe("resolveImeConfig", () => {
  test("does not return wayland IME switch (avoids double dead-key input)", () => {
    const result = resolveImeConfig("linux", {
      WAYLAND_DISPLAY: "wayland-1",
      LANG: "en_US.UTF-8",
    });

    expect(result.switches).not.toContainEqual(["enable-wayland-ime"]);
  });

  test("sets GTK_IM_MODULE to cedilla for pt_BR locale when not already set", () => {
    const result = resolveImeConfig("linux", {
      LANG: "pt_BR.UTF-8",
    });

    expect(result.env).toEqual(
      expect.objectContaining({ GTK_IM_MODULE: "cedilla" }),
    );
  });

  test("preserves existing GTK_IM_MODULE when already set", () => {
    const result = resolveImeConfig("linux", {
      LANG: "pt_BR.UTF-8",
      GTK_IM_MODULE: "fcitx",
    });

    expect(result.env.GTK_IM_MODULE).toBeUndefined();
  });

  test("returns empty config on non-linux platforms", () => {
    const result = resolveImeConfig("darwin", {
      LANG: "pt_BR.UTF-8",
      WAYLAND_DISPLAY: "wayland-1",
    });

    expect(result.switches).toHaveLength(0);
    expect(result.env).toEqual({});
  });

  test("does not set GTK_IM_MODULE for non pt_BR locale", () => {
    const result = resolveImeConfig("linux", {
      LANG: "en_US.UTF-8",
    });

    expect(result.env.GTK_IM_MODULE).toBeUndefined();
  });

  test("sets cedilla on wayland for pt_BR (XKB compose handles dead keys)", () => {
    const result = resolveImeConfig("linux", {
      WAYLAND_DISPLAY: "wayland-1",
      LANG: "pt_BR.UTF-8",
    });

    expect(result.switches).toHaveLength(0);
    expect(result.env).toEqual(
      expect.objectContaining({ GTK_IM_MODULE: "cedilla" }),
    );
  });

  test("returns composeContent with cedilla overrides for pt_BR on linux", () => {
    const result = resolveImeConfig("linux", {
      LANG: "pt_BR.UTF-8",
    });

    expect(result.composeContent).toBeDefined();
    expect(result.composeContent).toContain('<dead_acute> <c>');
    expect(result.composeContent).toContain("ccedilla");
    expect(result.composeContent).toContain('<dead_acute> <C>');
    expect(result.composeContent).toContain("Ccedilla");
  });

  test("compose overrides appear before include directive", () => {
    const result = resolveImeConfig("linux", {
      LANG: "pt_BR.UTF-8",
    });

    const content = result.composeContent!;
    const overrideIdx = content.indexOf("<dead_acute>");
    const includeIdx = content.indexOf("include");

    expect(overrideIdx).toBeGreaterThan(-1);
    expect(includeIdx).toBeGreaterThan(-1);
    expect(overrideIdx).toBeLessThan(includeIdx);
  });

  test("does not return composeContent for non pt_BR locale", () => {
    const result = resolveImeConfig("linux", {
      LANG: "en_US.UTF-8",
    });

    expect(result.composeContent).toBeUndefined();
  });

  test("does not return composeContent on non-linux platforms", () => {
    const result = resolveImeConfig("darwin", {
      LANG: "pt_BR.UTF-8",
    });

    expect(result.composeContent).toBeUndefined();
  });

  test("still returns composeContent even when XCOMPOSEFILE is already set (Chromium ignores it on Wayland)", () => {
    const result = resolveImeConfig("linux", {
      LANG: "pt_BR.UTF-8",
      XCOMPOSEFILE: "/custom/Compose",
    });

    expect(result.composeContent).toBeDefined();
    expect(result.composeContent).toContain("ccedilla");
  });
});
