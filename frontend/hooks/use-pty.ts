import { useCallback, useEffect, useRef, useState } from "react";
import { invoke, getCurrentWindow } from "@/lib/ipc";
import { ptyDispatcher } from "@/lib/pty-dispatcher";

interface UsePtyOptions {
  tabId: string;
  onData?: (data: string) => void;
  onExit?: (code: number) => void;
}

export function usePty(options: UsePtyOptions) {
  const [isRunning, setIsRunning] = useState(false);
  const onDataRef = useRef(options.onData);
  const onExitRef = useRef(options.onExit);
  const tabIdRef = useRef(options.tabId);

  onDataRef.current = options.onData;
  onExitRef.current = options.onExit;
  tabIdRef.current = options.tabId;

  useEffect(() => {
    const tabId = tabIdRef.current;

    // Register with centralized dispatcher — O(1) routing, no per-session IPC listener
    ptyDispatcher.registerData(tabId, (data) => {
      onDataRef.current?.(data);
    });

    ptyDispatcher.registerExit(tabId, (code) => {
      setIsRunning(false);
      onExitRef.current?.(code);
    });

    return () => {
      ptyDispatcher.unregisterData(tabId);
      ptyDispatcher.unregisterExit(tabId);
    };
  }, []);

  const spawn = useCallback(async (path: string, sessionType?: string): Promise<string> => {
    const tabId = await invoke<string>("spawn_pty", {
      tabId: tabIdRef.current,
      path,
      sessionType,
      windowLabel: getCurrentWindow().label,
    });
    setIsRunning(true);
    return tabId;
  }, []);

  const write = useCallback(
    async (data: string) => {
      await invoke("write_pty", { tabId: tabIdRef.current, data });
    },
    [],
  );

  const resize = useCallback(
    async (rows: number, cols: number) => {
      await invoke("resize_pty", {
        tabId: tabIdRef.current,
        rows,
        cols,
      });
    },
    [],
  );

  const close = useCallback(async () => {
    await invoke("close_pty", { tabId: tabIdRef.current });
    setIsRunning(false);
  }, []);

  return { isRunning, spawn, write, resize, close };
}
