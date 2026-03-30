import * as crypto from "crypto";

let currentToken = "";

/** Generate a new 4-digit numeric auth token. Returns the token string. */
export function generateToken(): string {
  currentToken = String(crypto.randomInt(0, 10000)).padStart(4, "0");
  return currentToken;
}

/** Get the current auth token. Returns empty string if none generated. */
export function getAuthToken(): string {
  return currentToken;
}

/** Validate a token against the current token. */
export function validateToken(token: string): boolean {
  if (!currentToken || !token) return false;
  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(currentToken, "utf8"),
      Buffer.from(token, "utf8")
    );
  } catch {
    // Different lengths — not equal
    return false;
  }
}

/** Generate a new token, invalidating the old one. */
export function regenerateToken(): string {
  return generateToken();
}

/** Clear the current token. */
export function clearToken(): void {
  currentToken = "";
}
