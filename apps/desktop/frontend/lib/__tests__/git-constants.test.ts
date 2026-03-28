import { describe, it, expect } from "vitest";
import {
  GIT_STATUS_LABELS,
  getGitStatusDisplay,
  getGitBadgeLetter,
  getGitStatusColor,
} from "../git-constants";

describe("GIT_STATUS_LABELS", () => {
  it("contains entries for common git status codes", () => {
    expect(GIT_STATUS_LABELS["M"]).toEqual({
      label: "Modified",
      color: "text-ctp-yellow",
    });
    expect(GIT_STATUS_LABELS["A"]).toEqual({
      label: "Added",
      color: "text-ctp-green",
    });
    expect(GIT_STATUS_LABELS["D"]).toEqual({
      label: "Deleted",
      color: "text-ctp-red",
    });
    expect(GIT_STATUS_LABELS["??"]).toEqual({
      label: "Untracked",
      color: "text-ctp-green",
    });
    expect(GIT_STATUS_LABELS["R"]).toEqual({
      label: "Renamed",
      color: "text-ctp-blue",
    });
  });
});

describe("getGitStatusDisplay", () => {
  it("returns display info for known status codes", () => {
    expect(getGitStatusDisplay("M")).toEqual({
      label: "Modified",
      color: "text-ctp-yellow",
    });
    expect(getGitStatusDisplay("AM")).toEqual({
      label: "Added",
      color: "text-ctp-green",
    });
  });

  it("returns null for unknown status codes", () => {
    expect(getGitStatusDisplay("XX")).toBeNull();
    expect(getGitStatusDisplay("")).toBeNull();
  });
});

describe("getGitBadgeLetter", () => {
  it("returns M for modified files", () => {
    expect(getGitBadgeLetter("M")).toBe("M");
    expect(getGitBadgeLetter("MM")).toBe("M");
  });

  it("returns U for untracked files", () => {
    expect(getGitBadgeLetter("??")).toBe("U");
  });

  it("returns A for added files", () => {
    expect(getGitBadgeLetter("A")).toBe("A");
    expect(getGitBadgeLetter("AM")).toBe("A");
  });

  it("returns D for deleted files", () => {
    expect(getGitBadgeLetter("D")).toBe("D");
  });

  it("returns R for renamed files", () => {
    expect(getGitBadgeLetter("R")).toBe("R");
  });

  it("returns C for copied files", () => {
    expect(getGitBadgeLetter("C")).toBe("C");
  });

  it("returns null for unknown codes", () => {
    expect(getGitBadgeLetter("XX")).toBeNull();
  });
});

describe("getGitStatusColor", () => {
  it("returns yellow for modified files", () => {
    expect(getGitStatusColor("M")).toBe("text-ctp-yellow");
    expect(getGitStatusColor("MM")).toBe("text-ctp-yellow");
  });

  it("returns green for untracked and added files", () => {
    expect(getGitStatusColor("??")).toBe("text-ctp-green");
    expect(getGitStatusColor("A")).toBe("text-ctp-green");
    expect(getGitStatusColor("AM")).toBe("text-ctp-green");
  });

  it("returns red for deleted files", () => {
    expect(getGitStatusColor("D")).toBe("text-ctp-red");
  });

  it("returns blue for renamed and copied files", () => {
    expect(getGitStatusColor("R")).toBe("text-ctp-blue");
    expect(getGitStatusColor("C")).toBe("text-ctp-blue");
  });

  it("returns null for unknown codes", () => {
    expect(getGitStatusColor("XX")).toBeNull();
  });
});
