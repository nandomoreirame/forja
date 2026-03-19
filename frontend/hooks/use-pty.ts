import { useCallback, useEffect, useRef, useState } from "react";
import { invoke, getCurrentWindow } from "@/lib/ipc";
import { ptyDispatcher } from "@/lib/pty-dispatcher";
import { CLI_REGISTRY } from "@/lib/cli-registry";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";

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
    let sessionIdFound = false;
    let chunkCount = 0;

    // Register with centralized dispatcher — O(1) routing, no per-session IPC listener
    ptyDispatcher.registerData(tabId, (data) => {
      onDataRef.current?.(data);

      // Try to detect session ID from early output (session ID appears in the first chunks)
      if (!sessionIdFound && chunkCount < 100) {
        chunkCount++;
        const tab = useTerminalTabsStore.getState().tabs.find((t) => t.id === tabId);
        if (tab && tab.sessionType !== "terminal") {
          const def = CLI_REGISTRY[tab.sessionType];
          if (def?.sessionIdPattern) {
            const match = data.match(def.sessionIdPattern);
            if (match?.[1]) {
              sessionIdFound = true;
              useTerminalTabsStore.getState().setCliSessionId(tabId, match[1]);
            }
          }
        }
      }
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

  const spawn = useCallback(async (path: string, sessionType?: string, resumeArgs?: string[]): Promise<string> => {
    const tabId = await invoke<string>("spawn_pty", {
      tabId: tabIdRef.current,
      path,
      sessionType,
      windowLabel: getCurrentWindow().label,
      ...(resumeArgs ? { resumeArgs } : {}),
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
