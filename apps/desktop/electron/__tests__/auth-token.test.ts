import { describe, it, expect, beforeEach } from "vitest";
import {
  generateToken,
  getAuthToken,
  validateToken,
  regenerateToken,
  clearToken,
} from "../auth-token.js";

describe("auth-token", () => {
  beforeEach(() => {
    // Reset state between tests
    clearToken();
  });

  it("getAuthToken() returns empty string before any token is generated", () => {
    expect(getAuthToken()).toBe("");
  });

  it("generateToken() creates a new token and returns it", () => {
    const token = generateToken();
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("getAuthToken() returns the current token after generation", () => {
    const token = generateToken();
    expect(getAuthToken()).toBe(token);
  });

  it("token is a 4-digit numeric string", () => {
    const token = generateToken();
    expect(token).toHaveLength(4);
    expect(token).toMatch(/^\d{4}$/);
  });

  it("token is zero-padded (e.g. 0042)", () => {
    // Generate many tokens and verify they are all 4 digits
    for (let i = 0; i < 20; i++) {
      const token = generateToken();
      expect(token).toHaveLength(4);
      expect(token).toMatch(/^\d{4}$/);
    }
  });

  it("validateToken(token) returns true for the current valid token", () => {
    const token = generateToken();
    expect(validateToken(token)).toBe(true);
  });

  it('validateToken("wrong") returns false for invalid token', () => {
    generateToken();
    expect(validateToken("wrong")).toBe(false);
  });

  it('validateToken("") returns false for empty string', () => {
    generateToken();
    expect(validateToken("")).toBe(false);
  });

  it("validateToken returns false when no token has been generated", () => {
    expect(validateToken("sometoken")).toBe(false);
  });

  it("regenerateToken() invalidates the old token and creates a new one", () => {
    const oldToken = generateToken();
    const newToken = regenerateToken();

    expect(newToken).not.toBe(oldToken);
    expect(validateToken(oldToken)).toBe(false);
    expect(validateToken(newToken)).toBe(true);
  });

  it("clearToken() removes the token (getAuthToken returns empty string)", () => {
    generateToken();
    clearToken();
    expect(getAuthToken()).toBe("");
  });

  it("validateToken returns false after clearToken()", () => {
    const token = generateToken();
    clearToken();
    expect(validateToken(token)).toBe(false);
  });
});
