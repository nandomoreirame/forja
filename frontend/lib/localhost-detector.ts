/**
 * Regex to match localhost-like URLs in terminal output.
 * Matches:
 * - http(s)://localhost:PORT
 * - http(s)://127.0.0.1:PORT
 * - http(s)://0.0.0.0:PORT
 * With optional path after port.
 */
const LOCALHOST_URL_REGEX =
  /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):\d{1,5}(?:\/[^\s)}\]"'`]*)*/i;

/** Strip ANSI escape codes from terminal output */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
}

/**
 * Extracts a localhost URL from a line of terminal output.
 * Returns null if no localhost URL is found.
 */
export function extractLocalhostUrl(text: string): string | null {
  const cleaned = stripAnsi(text);
  const match = cleaned.match(LOCALHOST_URL_REGEX);
  return match ? match[0] : null;
}

const LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

/**
 * Checks if a full URL points to a localhost address.
 * Uses URL parsing to prevent subdomain attacks (e.g. localhost.evil.com).
 */
export function isLocalhostUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return LOCALHOST_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}
