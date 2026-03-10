/**
 * IPC layer for Electron.
 *
 * In Electron: delegates to window.electronAPI (injected by preload.ts).
 * In Vitest (jsdom): returns stub implementations so tests don't crash.
 */

declare global {
  interface Window {
    electronAPI?: {
      invoke: (channel: string, args?: unknown) => Promise<unknown>;
      listen: (
        event: string,
        cb: (payload: unknown) => void
      ) => Promise<() => void>;
      window: {
        minimize: () => Promise<void>;
        maximize: () => Promise<void>;
        unmaximize: () => Promise<void>;
        close: () => Promise<void>;
        isMaximized: () => Promise<boolean>;
        onResized: (cb: () => void) => Promise<() => void>;
        getCurrentLabel: () => Promise<string>;
      };
      dialog: {
        open: (opts: unknown) => Promise<string | string[] | null>;
      };
      shell: {
        openExternal: (url: string) => Promise<void>;
      };
      app: {
        getName: () => Promise<string>;
        getVersion: () => Promise<string>;
        getElectronVersion: () => Promise<string>;
        isTilingDesktop: () => Promise<boolean>;
        isDev: () => Promise<boolean>;
      };
      browser: {
        navigate: (url: string) => Promise<void>;
        goBack: () => Promise<void>;
        goForward: () => Promise<void>;
        reload: () => Promise<void>;
      };
    };
  }
}

function getAPI() {
  return window.electronAPI;
}

export function invoke<T = unknown>(command: string, args?: unknown): Promise<T> {
  const api = getAPI();
  if (!api) {
    console.warn(`[ipc] electronAPI not available, cannot invoke "${command}"`);
    return Promise.resolve(undefined as T);
  }
  return api.invoke(command, args).then((result) => result as T);
}

export interface IpcEvent<T> {
  payload: T;
}

export function listen<T = unknown>(
  event: string,
  callback: (event: IpcEvent<T>) => void
): Promise<() => void> {
  const api = getAPI();
  if (!api) return Promise.resolve(() => {});
  return api.listen(event, (payload: unknown) => {
    callback({ payload: payload as T });
  });
}

// --- Dialog ---
export function open(opts: {
  directory?: boolean;
  multiple?: boolean;
  title?: string;
  filters?: { name: string; extensions: string[] }[];
}): Promise<string | string[] | null> {
  const api = getAPI();
  if (!api) return Promise.resolve(null);
  return api.dialog.open(opts);
}

// --- Shell ---
export function openUrl(url: string): Promise<void> {
  const api = getAPI();
  if (!api) return Promise.resolve();
  return api.shell.openExternal(url);
}

// --- App info ---
export function getName(): Promise<string> {
  const api = getAPI();
  if (!api) return Promise.resolve("Forja");
  return api.app.getName();
}

export function getVersion(): Promise<string> {
  const api = getAPI();
  if (!api) return Promise.resolve("0.0.0");
  return api.app.getVersion();
}

export function getElectronVersion(): Promise<string> {
  const api = getAPI();
  if (!api) return Promise.resolve("0.0.0");
  return api.app.getElectronVersion();
}

export function isTilingDesktop(): Promise<boolean> {
  const api = getAPI();
  if (!api) return Promise.resolve(false);
  return api.app.isTilingDesktop();
}

export function isDev(): Promise<boolean> {
  const api = getAPI();
  if (!api) return Promise.resolve(false);
  return api.app.isDev();
}

// --- Window ---
interface ElectronWindow {
  label: string;
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  unmaximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  onResized: (cb: () => void) => Promise<() => void>;
}

export function getCurrentWindow(): ElectronWindow {
  const api = getAPI();

  const noop = () => Promise.resolve();
  const noopBool = () => Promise.resolve(false);
  const noopUnlisten = () => Promise.resolve(() => {});

  if (!api) {
    return {
      label: "main",
      minimize: noop,
      maximize: noop,
      unmaximize: noop,
      close: noop,
      isMaximized: noopBool,
      onResized: noopUnlisten,
    };
  }

  return {
    label: "main",
    minimize: () => api.window.minimize(),
    maximize: () => api.window.maximize(),
    unmaximize: () => api.window.unmaximize(),
    close: () => api.window.close(),
    isMaximized: () => api.window.isMaximized(),
    onResized: (cb) => api.window.onResized(cb),
  };
}
