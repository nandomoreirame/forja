import pkg from "@xterm/headless";
const { Terminal } = pkg;

const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;
const SCROLLBACK_LINES = 10_000;

/**
 * Maintains headless xterm Terminal instances to render raw PTY output into
 * clean screen text. Used by the WebSocket bridge to serve sanitized output
 * to the mobile remote control app without TUI cursor-movement artifacts.
 *
 * Runs in the Electron main process (Node.js environment).
 */
export class PtyOutputSanitizer {
  private readonly sessions = new Map<string, InstanceType<typeof Terminal>>();

  /** Create a new headless terminal for a session. If one already exists, it is disposed first. */
  addSession(tabId: string, cols: number = DEFAULT_COLS, rows: number = DEFAULT_ROWS): void {
    if (this.sessions.has(tabId)) {
      this.sessions.get(tabId)!.dispose();
      this.sessions.delete(tabId);
    }

    const terminal = new Terminal({
      cols,
      rows,
      scrollback: SCROLLBACK_LINES,
      allowProposedApi: true,
    });

    this.sessions.set(tabId, terminal);
  }

  /** Remove a session's terminal and free resources. */
  removeSession(tabId: string): void {
    const terminal = this.sessions.get(tabId);
    if (terminal) {
      terminal.dispose();
      this.sessions.delete(tabId);
    }
  }

  /** Write raw PTY data to the session's virtual terminal. No-op if session does not exist. */
  write(tabId: string, data: string): void {
    const terminal = this.sessions.get(tabId);
    if (!terminal) return;
    terminal.write(data);
  }

  /**
   * Write raw PTY data and wait for the xterm parser to finish processing.
   * Returns a Promise that resolves after the data is fully parsed and the
   * internal buffer is updated.
   */
  writeAsync(tabId: string, data: string): Promise<void> {
    const terminal = this.sessions.get(tabId);
    if (!terminal) return Promise.resolve();
    return new Promise<void>((resolve) => {
      terminal.write(data, resolve);
    });
  }

  /**
   * Get the full buffer content (scrollback + viewport) as plain text.
   * Returns null if the session does not exist.
   * Trailing whitespace on each line and trailing empty lines are trimmed.
   */
  getScreenText(tabId: string): string | null {
    const terminal = this.sessions.get(tabId);
    if (!terminal) return null;

    const buffer = terminal.buffer.active;
    const totalLines = buffer.length; // scrollback + viewport
    const lines: string[] = [];

    for (let y = 0; y < totalLines; y++) {
      const line = buffer.getLine(y);
      if (!line) {
        lines.push("");
        continue;
      }
      lines.push(line.translateToString(true).trimEnd());
    }

    // Remove trailing empty lines
    while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
      lines.pop();
    }

    return lines.join("\n");
  }

  /** Resize a session's headless terminal to match the actual PTY dimensions. */
  resize(tabId: string, cols: number, rows: number): void {
    const terminal = this.sessions.get(tabId);
    if (!terminal) return;
    terminal.resize(cols, rows);
  }

  /** Check if a session exists. */
  hasSession(tabId: string): boolean {
    return this.sessions.has(tabId);
  }

  /** Clean up all sessions. */
  dispose(): void {
    for (const terminal of this.sessions.values()) {
      terminal.dispose();
    }
    this.sessions.clear();
  }
}
