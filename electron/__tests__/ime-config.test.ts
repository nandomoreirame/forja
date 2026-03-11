import { describe, test, expect } from "vitest";
import { resolveImeConfig } from "../ime-config.js";

describe("resolveImeConfig", () => {
  test("returns wayland IME switch when WAYLAND_DISPLAY is set", () => {
    const result = resolveImeConfig("linux", {
      WAYLAND_DISPLAY: "wayland-1",
      LANG: "en_US.UTF-8",
    });

    expect(result.switches).toContainEqual(["enable-wayland-ime"]);
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

  test("does not return wayland switch when not on wayland", () => {
    const result = resolveImeConfig("linux", {
      LANG: "pt_BR.UTF-8",
    });

    expect(result.switches).not.toContainEqual(["enable-wayland-ime"]);
  });

  test("combines wayland IME and cedilla for pt_BR on wayland", () => {
    const result = resolveImeConfig("linux", {
      WAYLAND_DISPLAY: "wayland-1",
      LANG: "pt_BR.UTF-8",
    });

    expect(result.switches).toContainEqual(["enable-wayland-ime"]);
    expect(result.env).toEqual(
      expect.objectContaining({ GTK_IM_MODULE: "cedilla" }),
    );
  });
});
