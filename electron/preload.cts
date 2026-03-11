import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  invoke: (channel: string, args?: unknown) =>
    ipcRenderer.invoke(channel, args),

  listen: (event: string, cb: (payload: unknown) => void) => {
    const handler = (_: Electron.IpcRendererEvent, payload: unknown) =>
      cb(payload);
    ipcRenderer.on(event, handler);
    return Promise.resolve(() => ipcRenderer.removeListener(event, handler));
  },

  window: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    maximize: () => ipcRenderer.invoke("window:maximize"),
    unmaximize: () => ipcRenderer.invoke("window:unmaximize"),
    close: () => ipcRenderer.invoke("window:close"),
    isMaximized: () => ipcRenderer.invoke("window:isMaximized"),
    onResized: (cb: () => void) => {
      const handler = () => cb();
      ipcRenderer.on("window:resized", handler);
      return Promise.resolve(() =>
        ipcRenderer.removeListener("window:resized", handler)
      );
    },
    getCurrentLabel: () => ipcRenderer.invoke("window:getLabel"),
  },

  dialog: {
    open: (opts: unknown) => ipcRenderer.invoke("dialog:open", opts),
  },

  shell: {
    openExternal: (url: string) =>
      ipcRenderer.invoke("shell:openExternal", url),
  },

  app: {
    getName: () => ipcRenderer.invoke("app:getName"),
    getVersion: () => ipcRenderer.invoke("app:getVersion"),
    getElectronVersion: () => ipcRenderer.invoke("app:getElectronVersion"),
    isTilingDesktop: () => ipcRenderer.invoke("app:is_tiling_desktop"),
    isDev: () => ipcRenderer.invoke("app:isDev"),
  },

  browser: {
    navigate: (url: string) => ipcRenderer.invoke("browser:navigate", url),
    goBack: () => ipcRenderer.invoke("browser:goBack"),
    goForward: () => ipcRenderer.invoke("browser:goForward"),
    reload: () => ipcRenderer.invoke("browser:reload"),
    screenshot: (webContentsId: number) =>
      ipcRenderer.invoke("browser:screenshot", { webContentsId }),
  },
});
