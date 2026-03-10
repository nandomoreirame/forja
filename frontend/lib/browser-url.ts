/** URL schemes blocked from loading in the embedded browser */
export const BLOCKED_SCHEMES = [
  "javascript:",
  "file:",
  "data:",
  "vbscript:",
  "blob:",
] as const;

/**
 * Normalizes a URL string for display/navigation.
 * Adds http:// if no scheme is present.
 */
export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
}

/**
 * Returns true if the URL is safe to load in the embedded webview.
 * Blocks dangerous schemes; allows all http/https.
 */
export function isAllowedUrl(url: string): boolean {
  const lower = url.trim().toLowerCase();
  for (const scheme of BLOCKED_SCHEMES) {
    if (lower.startsWith(scheme)) return false;
  }
  return true;
}
