import { describe, it, expect, beforeEach } from "vitest";
import {
  suspendUiSaves,
  resumeUiSaves,
  isUiSaveSuspended,
} from "../ui-save-gate.js";

describe("ui-save-gate", () => {
  beforeEach(() => {
    // Ensure clean state between tests
    resumeUiSaves();
  });

  it("starts with saves not suspended", () => {
    expect(isUiSaveSuspended()).toBe(false);
  });

  it("suspendUiSaves sets suspended to true", () => {
    suspendUiSaves();
    expect(isUiSaveSuspended()).toBe(true);
  });

  it("resumeUiSaves sets suspended back to false", () => {
    suspendUiSaves();
    resumeUiSaves();
    expect(isUiSaveSuspended()).toBe(false);
  });

  it("multiple suspend calls are idempotent", () => {
    suspendUiSaves();
    suspendUiSaves();
    expect(isUiSaveSuspended()).toBe(true);
    resumeUiSaves();
    expect(isUiSaveSuspended()).toBe(false);
  });

  it("multiple resume calls are idempotent", () => {
    resumeUiSaves();
    resumeUiSaves();
    expect(isUiSaveSuspended()).toBe(false);
  });
});
