import type { Terminal } from "@xterm/xterm";
import type { FitAddon } from "@xterm/addon-fit";
import { ptyDispatcher } from "./pty-dispatcher";

export interface CachedTerminal {
  terminal: Terminal;
  fitAddon: FitAddon;
  hostElement: HTMLDivElement;
}

const cache = new Map<string, CachedTerminal>();

export const terminalCache = {
  has(tabId: string): boolean {
    return cache.has(tabId);
  },

  get(tabId: string): CachedTerminal | undefined {
    return cache.get(tabId);
  },

  /**
   * Parks a terminal instance for later reattach.
   * Detaches hostElement from DOM and registers temporary
   * ptyDispatcher handlers via queueMicrotask (runs AFTER
   * use-pty's cleanup unregisters its handlers).
   */
  park(
    tabId: string,
    terminal: Terminal,
    fitAddon: FitAddon,
    hostElement: HTMLDivElement,
  ): void {
    hostElement.remove();
    cache.set(tabId, { terminal, fitAddon, hostElement });

    // Re-register data/exit handlers AFTER use-pty's cleanup runs
    queueMicrotask(() => {
      if (!cache.has(tabId)) return;
      ptyDispatcher.registerData(tabId, (data) => {
        terminal.write(data);
      });
      ptyDispatcher.registerExit(tabId, () => {
        terminal.write("\r\n\x1b[1;33m[Session ended]\x1b[0m\r\n");
      });
    });
  },

  /**
   * Fully disposes a cached terminal (called when tab is truly removed).
   */
  dispose(tabId: string): void {
    const entry = cache.get(tabId);
    if (!entry) return;
    entry.terminal.dispose();
    cache.delete(tabId);
  },

  /** Disposes all cached terminals. */
  clear(): void {
    for (const [, entry] of cache) {
      entry.terminal.dispose();
    }
    cache.clear();
  },
};
