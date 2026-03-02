import { usePty } from "@/hooks/use-pty";
import { TERMINAL_OPTIONS } from "@/lib/terminal-theme";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { CanvasAddon } from "@xterm/addon-canvas";
import { WebglAddon } from "@xterm/addon-webgl";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { useSessionStateStore } from "@/stores/session-state";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";
import { useTerminalZoomStore } from "@/stores/terminal-zoom";
import { useEffect, useRef } from "react";

interface TerminalSessionProps {
  tabId: string;
  path: string;
  isVisible: boolean;
  sessionType?: "claude-code" | "terminal";
}

export function TerminalSession({ tabId, path, isVisible, sessionType = "claude-code" }: TerminalSessionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const pendingDataRef = useRef<string[]>([]);
  const flushRafRef = useRef<number>(0);

  const { spawn, write, resize, close } = usePty({
    tabId,
    onData: (data) => {
      useSessionStateStore.getState().onData(tabId);
      pendingDataRef.current.push(data);
      if (!flushRafRef.current) {
        flushRafRef.current = requestAnimationFrame(() => {
          flushRafRef.current = 0;
          const terminal = terminalRef.current;
          if (terminal && pendingDataRef.current.length > 0) {
            terminal.write(pendingDataRef.current.join(""));
            pendingDataRef.current.length = 0;
          }
        });
      }
    },
    onExit: () => {
      useSessionStateStore.getState().onExit(tabId);
      useTerminalTabsStore.getState().removeTab(tabId);
      terminalRef.current?.write("\r\n\x1b[1;33m[Session ended]\x1b[0m\r\n");
    },
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal(TERMINAL_OPTIONS);
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.open(containerRef.current);

    try {
      const webgl = new WebglAddon();
      webgl.onContextLoss(() => {
        webgl.dispose();
        terminal.loadAddon(new CanvasAddon());
      });
      terminal.loadAddon(webgl);
    } catch {
      terminal.loadAddon(new CanvasAddon());
    }

    terminal.attachCustomKeyEventHandler((event) => {
      // Never interfere with dead key composition (accents, tilde, grave)
      if (event.isComposing || event.key === "Dead" || event.key === "AltGraph") {
        return true;
      }

      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.altKey && (event.key === "=" || event.key === "+" || event.key === "-" || event.key === "0")) {
        return false;
      }
      return true;
    });

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const dataDisposable = terminal.onData((data) => {
      write(data);
    });

    // Wait for layout to stabilize before fitting and spawning
    // so the PTY gets the correct initial dimensions.
    let aborted = false;
    const rafId = requestAnimationFrame(() => {
      if (aborted) return;
      fitAddon.fit();
      const dims = fitAddon.proposeDimensions();
      const rows = dims?.rows ?? 24;
      const cols = dims?.cols ?? 80;
      spawn(path, sessionType).then(() => {
        if (!aborted) resize(rows, cols);
      });
    });

    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      fitAddon.fit();
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const newDims = fitAddon.proposeDimensions();
        if (newDims) {
          resize(newDims.rows, newDims.cols);
        }
      }, 100);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => {
      aborted = true;
      cancelAnimationFrame(rafId);
      if (flushRafRef.current) cancelAnimationFrame(flushRafRef.current);
      pendingDataRef.current.length = 0;
      clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
      dataDisposable.dispose();
      close();
      terminal.dispose();
    };
  }, [tabId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply zoom (font size) changes
  useEffect(() => {
    return useTerminalZoomStore.subscribe((state) => {
      const terminal = terminalRef.current;
      const fitAddon = fitAddonRef.current;
      if (!terminal || !fitAddon) return;

      terminal.options.fontSize = state.fontSize;
      fitAddon.fit();
      const dims = fitAddon.proposeDimensions();
      if (dims) {
        resize(dims.rows, dims.cols);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fit when becoming visible
  useEffect(() => {
    if (isVisible && fitAddonRef.current) {
      requestAnimationFrame(() => {
        fitAddonRef.current?.fit();
        const dims = fitAddonRef.current?.proposeDimensions();
        if (dims) {
          resize(dims.rows, dims.cols);
        }
      });
    }
  }, [isVisible]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      role="region"
      aria-label="Claude Code Terminal"
      className={`h-full w-full bg-ctp-base pt-3 pl-4 pb-3 ${!isVisible ? "hidden" : ""}`}
    >
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
