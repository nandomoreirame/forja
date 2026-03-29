// Cedilla remap utility for the renderer process.
//
// Chromium's Ozone/X11 backend composes dead_acute+c as ć (c-acute, en_US)
// instead of ç (c-cedilla, pt_BR). This module provides character-level
// remapping for use in xterm.js onData callbacks, acting as a safety net
// for composed characters that escape the before-input-event handler.

// Remaps cedilla-candidates within a full string.
// Replaces ć → ç and Ć → Ç anywhere in the string, preserving all other characters.
export function remapCedilla(data: string): string {
  return data.replace(/\u0107/g, "\u00E7").replace(/\u0106/g, "\u00C7");
}
