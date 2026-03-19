import { describe, it, expect } from "vitest";
import { isValidLayoutJson, parseLayoutJson } from "../layout-migration";
import { DEFAULT_LAYOUT } from "../default-layout";

describe("isValidLayoutJson", () => {
  it("returns true for a valid layout JSON", () => {
    const valid = {
      global: {},
      layout: {
        type: "row",
        children: [],
      },
    };
    expect(isValidLayoutJson(valid)).toBe(true);
  });

  it("returns true for DEFAULT_LAYOUT", () => {
    expect(isValidLayoutJson(DEFAULT_LAYOUT)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isValidLayoutJson(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isValidLayoutJson(undefined)).toBe(false);
  });

  it("returns false for a string", () => {
    expect(isValidLayoutJson("not a layout")).toBe(false);
  });

  it("returns false for an empty object", () => {
    expect(isValidLayoutJson({})).toBe(false);
  });

  it("returns false when layout is missing", () => {
    expect(isValidLayoutJson({ global: {} })).toBe(false);
  });

  it("returns false when layout.type is missing", () => {
    expect(isValidLayoutJson({ layout: { children: [] } })).toBe(false);
  });

  it("returns false when layout.children is missing", () => {
    expect(isValidLayoutJson({ layout: { type: "row" } })).toBe(false);
  });

  it("returns false when layout.children is not an array", () => {
    expect(isValidLayoutJson({ layout: { type: "row", children: "bad" } })).toBe(false);
  });
});

describe("parseLayoutJson", () => {
  it("returns the input when valid with a usable tabset", () => {
    const valid = {
      global: { tabEnableClose: true },
      layout: {
        type: "row",
        children: [{ type: "tabset", id: "tabset-main", children: [] }],
      },
    };
    expect(parseLayoutJson(valid)).toBe(valid);
  });

  it("returns DEFAULT_LAYOUT for null", () => {
    expect(parseLayoutJson(null)).toEqual(DEFAULT_LAYOUT);
  });

  it("returns DEFAULT_LAYOUT for undefined", () => {
    expect(parseLayoutJson(undefined)).toEqual(DEFAULT_LAYOUT);
  });

  it("returns DEFAULT_LAYOUT for invalid structure", () => {
    expect(parseLayoutJson({ foo: "bar" })).toEqual(DEFAULT_LAYOUT);
  });

  it("returns DEFAULT_LAYOUT for a number", () => {
    expect(parseLayoutJson(42)).toEqual(DEFAULT_LAYOUT);
  });

  it("returns DEFAULT_LAYOUT when layout has only sidebar tabset", () => {
    const sidebarOnly = {
      global: {},
      layout: {
        type: "row",
        children: [
          { type: "tabset", id: "tabset-sidebar", children: [{ type: "tab", name: "Files", component: "file-tree" }] },
        ],
      },
    };
    expect(parseLayoutJson(sidebarOnly)).toEqual(DEFAULT_LAYOUT);
  });

  it("returns DEFAULT_LAYOUT when layout has no tabsets at all", () => {
    const noTabsets = {
      global: {},
      layout: {
        type: "row",
        children: [],
      },
    };
    expect(parseLayoutJson(noTabsets)).toEqual(DEFAULT_LAYOUT);
  });

  it("accepts layout with a non-sidebar tabset", () => {
    const custom = {
      global: {},
      layout: {
        type: "row",
        children: [
          { type: "tabset", id: "tabset-sidebar", children: [] },
          { type: "row", children: [
            { type: "tabset", id: "custom-tabset", children: [{ type: "tab", name: "Test", component: "terminal" }] },
          ]},
        ],
      },
    };
    expect(parseLayoutJson(custom)).toBe(custom);
  });
});

