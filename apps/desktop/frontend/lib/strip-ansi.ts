// Matches ANSI CSI sequences: ESC [ ... (letter or @)
// Covers: SGR (colors), cursor movement, erase, scroll, DEC private modes
const CSI_RE = /\x1b\[[\x30-\x3f]*[\x20-\x2f]*[\x40-\x7e]/g;

// Matches OSC sequences: ESC ] ... (BEL or ST)
// Covers: window title, hyperlinks, etc.
const OSC_RE = /\x1b\][\s\S]*?(?:\x07|\x1b\\)/g;

// Matches incomplete sequences at end of string
const INCOMPLETE_RE = /\x1b(?:\[[\x30-\x3f]*[\x20-\x2f]*|\][\s\S]*)?$/g;

/**
 * Strip ANSI escape codes from terminal output.
 * Preserves plain text content including newlines and spacing.
 */
export function stripAnsi(input: string): string {
  return input
    .replace(OSC_RE, "")
    .replace(CSI_RE, "")
    .replace(INCOMPLETE_RE, "");
}
