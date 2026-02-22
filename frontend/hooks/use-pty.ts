import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

interface PtyDataPayload {
  tab_id: string;
  data: string;
}

interface PtyExitPayload {
  tab_id: string;
  code: number;
}

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
    const unlistenData = listen<PtyDataPayload>("pty:data", (event) => {
      if (event.payload.tab_id === tabIdRef.current) {
        onDataRef.current?.(event.payload.data);
      }
    });

    const unlistenExit = listen<PtyExitPayload>("pty:exit", (event) => {
      if (event.payload.tab_id === tabIdRef.current) {
        setIsRunning(false);
        onExitRef.current?.(event.payload.code);
      }
    });

    return () => {
      unlistenData.then((fn) => fn());
      unlistenExit.then((fn) => fn());
    };
  }, []);

  const spawn = useCallback(async (path: string, sessionType?: string): Promise<string> => {
    const tabId = await invoke<string>("spawn_pty", {
      tabId: tabIdRef.current,
      path,
      sessionType,
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
