/**
 * Centralized PTY event dispatcher.
 *
 * Instead of N+1 IPC listeners (one per terminal session + one global),
 * a single listener receives all pty:data/pty:exit events and routes them
 * to the correct handler via Map lookup — O(1) per event.
 */

interface PtyDataPayload {
  tab_id: string;
  data: string;
}

interface PtyExitPayload {
  tab_id: string;
  code: number;
}

type DataHandler = (data: string) => void;
type ExitHandler = (code: number) => void;
type GlobalDataHandler = (tabId: string, data: string) => void;
type PermanentExitHandler = (tabId: string, code: number) => void;

export interface PtyDispatcher {
  registerData: (tabId: string, handler: DataHandler) => void;
  unregisterData: (tabId: string) => void;
  registerExit: (tabId: string, handler: ExitHandler) => void;
  unregisterExit: (tabId: string) => void;
  onGlobalData: (handler: GlobalDataHandler) => void;
  /** Register a fallback exit handler for tabs with no tab-specific handler. */
  registerPermanentExitHandler: (handler: PermanentExitHandler) => void;
  handleData: (payload: PtyDataPayload) => void;
  handleExit: (payload: PtyExitPayload) => void;
  destroy: () => void;
}

/** Singleton instance used by App.tsx and use-pty.ts */
export const ptyDispatcher: PtyDispatcher = createPtyDispatcher();

export function createPtyDispatcher(): PtyDispatcher {
  const dataHandlers = new Map<string, DataHandler>();
  const exitHandlers = new Map<string, ExitHandler>();
  let globalDataHandler: GlobalDataHandler | null = null;
  let permanentExitHandler: PermanentExitHandler | null = null;

  return {
    registerData(tabId, handler) {
      dataHandlers.set(tabId, handler);
    },

    unregisterData(tabId) {
      dataHandlers.delete(tabId);
    },

    registerExit(tabId, handler) {
      exitHandlers.set(tabId, handler);
    },

    unregisterExit(tabId) {
      exitHandlers.delete(tabId);
    },

    onGlobalData(handler) {
      globalDataHandler = handler;
    },

    registerPermanentExitHandler(handler) {
      permanentExitHandler = handler;
    },

    handleData(payload) {
      globalDataHandler?.(payload.tab_id, payload.data);
      dataHandlers.get(payload.tab_id)?.(payload.data);
    },

    handleExit(payload) {
      const tabHandler = exitHandlers.get(payload.tab_id);
      if (tabHandler) {
        tabHandler(payload.code);
      } else {
        permanentExitHandler?.(payload.tab_id, payload.code);
      }
    },

    destroy() {
      dataHandlers.clear();
      exitHandlers.clear();
      globalDataHandler = null;
      permanentExitHandler = null;
    },
  };
}
