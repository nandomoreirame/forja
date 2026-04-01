/**
 * Parses OSC 9 escape sequences from raw PTY data streams.
 *
 * Claude Code's notify.sh hook emits OSC 9 sequences when running inside Forja
 * (FORJA_TERMINAL=1). These carry the clean `last_assistant_message` in markdown
 * format — the same content that gets sent to Discord.
 *
 * Format: ESC ] 9 ; 1 ; <text> BEL
 *   - ESC ]  = \x1b]  (OSC introducer)
 *   - 9 ; 1  = Forja notification subtype
 *   - <text> = clean markdown message (up to 4000 chars)
 *   - BEL    = \x07   (string terminator, or \x1b\\ as ST)
 *
 * Handles partial sequences that may span multiple PTY data chunks.
 */

const OSC_START = "\x1b]9;1;";
const BEL = "\x07";
const ST = "\x1b\\";

export class OscParser {
  private buffer = "";

  /**
   * Feed raw PTY data. Returns any complete OSC 9 messages found.
   * Partial sequences are buffered until the terminator arrives.
   */
  feed(data: string): string[] {
    this.buffer += data;
    const messages: string[] = [];

    for (;;) {
      const startIdx = this.buffer.indexOf(OSC_START);
      if (startIdx === -1) {
        // No OSC 9 start found — keep only the last few chars in case
        // the start marker is split across chunks.
        if (this.buffer.length > OSC_START.length) {
          this.buffer = this.buffer.slice(-(OSC_START.length));
        }
        break;
      }

      const contentStart = startIdx + OSC_START.length;

      // Look for terminator: BEL (\x07) or ST (\x1b\\)
      const belIdx = this.buffer.indexOf(BEL, contentStart);
      const stIdx = this.buffer.indexOf(ST, contentStart);

      let endIdx = -1;
      let endLen = 0;
      if (belIdx !== -1 && (stIdx === -1 || belIdx < stIdx)) {
        endIdx = belIdx;
        endLen = 1;
      } else if (stIdx !== -1) {
        endIdx = stIdx;
        endLen = 2;
      }

      if (endIdx === -1) {
        // Terminator not yet received — keep from start marker onward
        this.buffer = this.buffer.slice(startIdx);
        break;
      }

      const message = this.buffer.slice(contentStart, endIdx);
      if (message.length > 0) {
        messages.push(message);
      }

      // Consume processed portion
      this.buffer = this.buffer.slice(endIdx + endLen);
    }

    return messages;
  }

  /** Discard any buffered partial sequence. */
  reset(): void {
    this.buffer = "";
  }
}
