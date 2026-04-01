import { create } from "zustand";
import { invoke } from "@/lib/ipc";

interface WsBridgeState {
  running: boolean;
  port: number;
  host: string;
  localIp: string;
  clients: number;
  token: string;
  dialogOpen: boolean;

  // Actions
  start: () => Promise<void>;
  stop: () => Promise<void>;
  toggle: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  setDialogOpen: (open: boolean) => void;
  openDialog: () => void;
}

export const useWsBridgeStore = create<WsBridgeState>((set, get) => ({
  running: false,
  port: 9400,
  host: "0.0.0.0",
  localIp: "",
  clients: 0,
  token: "",
  dialogOpen: false,

  setDialogOpen: (open) => set({ dialogOpen: open }),
  openDialog: () => set({ dialogOpen: true }),

  start: async () => {
    const result = await invoke<{ ok: boolean; data?: { port: number; host: string; token: string; localIp: string } }>("ws-bridge:start");
    if (result?.ok && result.data) {
      set({ running: true, port: result.data.port, host: result.data.host, localIp: result.data.localIp, token: result.data.token });
    }
  },

  stop: async () => {
    await invoke("ws-bridge:stop");
    set({ running: false, clients: 0, token: "" });
  },

  toggle: async () => {
    const { running, start, stop } = get();
    if (running) await stop();
    else await start();
  },

  refreshStatus: async () => {
    const result = await invoke<{ running: boolean; port: number; host: string; clients: number; token: string }>("ws-bridge:status");
    if (result) {
      set(result);
    }
  },
}));
