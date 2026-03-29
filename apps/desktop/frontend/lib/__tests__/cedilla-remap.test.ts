import { describe, test, expect } from "vitest";
import { remapCedilla } from "../cedilla-remap";

describe("remapCedilla", () => {
  test("replaces ć with ç", () => {
    expect(remapCedilla("ć")).toBe("ç");
  });

  test("replaces Ć with Ç", () => {
    expect(remapCedilla("Ć")).toBe("Ç");
  });

  test("replaces all occurrences of ć in a longer string", () => {
    expect(remapCedilla("ću\u001b[A")).toBe("çu\u001b[A");
  });

  test("replaces multiple cedilla-candidates in one string", () => {
    expect(remapCedilla("ćĆ")).toBe("çÇ");
  });

  test("returns string unchanged when no cedilla-candidates present", () => {
    expect(remapCedilla("hello world")).toBe("hello world");
  });

  test("returns empty string unchanged", () => {
    expect(remapCedilla("")).toBe("");
  });

  test("preserves already-correct ç and Ç unchanged", () => {
    expect(remapCedilla("ç Ç")).toBe("ç Ç");
  });

  test("preserves other accented characters unchanged", () => {
    expect(remapCedilla("éàü")).toBe("éàü");
  });

  test("handles xterm escape sequences correctly", () => {
    expect(remapCedilla("\u001b[1;2H")).toBe("\u001b[1;2H");
  });
});
