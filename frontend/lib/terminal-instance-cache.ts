import type { Terminal } from "@xterm/xterm";
import type { FitAddon } from "@xterm/addon-fit";
import { ptyDispatcher } from "./pty-dispatcher";
import { invoke } from "./ipc";

export interface CachedTerminal {
  terminal: Terminal;
  fitAddon: FitAddon;
  hostElement: HTMLDivElement;
}

export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const CACHE_MAX_SIZE = 20;

const cache = new Map<string, CachedTerminal>();
const ttlTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearTtlTimer(tabId: string): void {
  const timer = ttlTimers.get(tabId);
  if (timer !== undefined) {
    clearTimeout(timer);
    ttlTimers.delete(tabId);
  }
}

function evictOldest(): void {
  // Map iterates in insertion order; first key is the oldest
  const oldest = cache.keys().next().value;
  if (oldest !== undefined) {
    const entry = cache.get(oldest);
    if (entry) {
      // Kill backend PTY process
      invoke("close_pty", { tabId: oldest }).catch(() => {});
      // Unregister dispatcher handlers
      ptyDispatcher.unregisterData(oldest);
      ptyDispatcher.unregisterExit(oldest);
      entry.terminal.dispose();
    }
    cache.delete(oldest);
    clearTtlTimer(oldest);
  }
}

export const terminalCache = {
  has(tabId: string): boolean {
    return cache.has(tabId);
  },

  get(tabId: string): CachedTerminal | undefined {
    const entry = cache.get(tabId);
    if (entry) {
      // Retrieved by consumer — cancel TTL timer (will be reattached)
      clearTtlTimer(tabId);
    }
    return entry;
  },

  /**
   * Parks a terminal instance for later reattach.
   * Detaches hostElement from DOM and registers temporary
   * ptyDispatcher handlers via queueMicrotask (runs AFTER
   * use-pty's cleanup unregisters its handlers).
   *
   * Entries are auto-evicted after CACHE_TTL_MS if not retrieved.
   * If the cache exceeds CACHE_MAX_SIZE, the oldest entry is evicted.
   */
  park(
    tabId: string,
    terminal: Terminal,
    fitAddon: FitAddon,
    hostElement: HTMLDivElement,
  ): void {
    // Evict oldest if at capacity
    if (cache.size >= CACHE_MAX_SIZE && !cache.has(tabId)) {
      evictOldest();
    }

    hostElement.remove();
    cache.set(tabId, { terminal, fitAddon, hostElement });

    // Start TTL timer for auto-eviction
    clearTtlTimer(tabId);
    ttlTimers.set(
      tabId,
      setTimeout(() => {
        const entry = cache.get(tabId);
        if (entry) {
          // Kill backend PTY process
          invoke("close_pty", { tabId }).catch(() => {});
          // Unregister dispatcher handlers
          ptyDispatcher.unregisterData(tabId);
          ptyDispatcher.unregisterExit(tabId);
          // Dispose frontend terminal
          entry.terminal.dispose();
          cache.delete(tabId);
        }
        ttlTimers.delete(tabId);
      }, CACHE_TTL_MS),
    );

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
    clearTtlTimer(tabId);
    entry.terminal.dispose();
    cache.delete(tabId);
  },

  /** Disposes all cached terminals and kills all backend PTYs. */
  clear(): void {
    for (const timer of ttlTimers.values()) {
      clearTimeout(timer);
    }
    ttlTimers.clear();
    for (const [tabId, entry] of cache) {
      invoke("close_pty", { tabId }).catch(() => {});
      ptyDispatcher.unregisterData(tabId);
      ptyDispatcher.unregisterExit(tabId);
      entry.terminal.dispose();
    }
    cache.clear();
  },
};
