/**
 * Strips ANSI escape sequences from terminal output strings.
 * Handles color codes, cursor movement, and other common escape sequences.
 */
const ANSI_PATTERN = /\x1B\[([0-9]{1,3}(;[0-9]{1,3})*)?[mGKHFJABCDsuhlr]/g;
const OSC_PATTERN = /\x1B\][^\x07\x1B]*(\x07|\x1B\\)/g;
const MISC_PATTERN = /\x1B[^[\]]/g;
/** DEC Private Mode sequences: ESC[?<digits>h/l (with or without ESC prefix) */
const DEC_PRIVATE_MODE = /\x1B?\[(\?\d+[hl])/g;

export function stripAnsi(str: string): string {
  return str
    .replace(DEC_PRIVATE_MODE, "")
    .replace(OSC_PATTERN, "")
    .replace(ANSI_PATTERN, "")
    .replace(MISC_PATTERN, "");
}
