import { usePty } from "@/hooks/use-pty";
import { TERMINAL_OPTIONS } from "@/lib/terminal-theme";
import { routeLinkClick } from "@/lib/link-router";
import type { SessionType } from "@/lib/cli-registry";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { WebglAddon } from "@xterm/addon-webgl";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { useTerminalZoomStore } from "@/stores/terminal-zoom";
import { useThemeStore } from "@/stores/theme";
import { useUserSettingsStore } from "@/stores/user-settings";
import { buildTerminalTheme } from "@/themes/apply";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";
import { memo, useCallback, useEffect, useRef } from "react";
import { TerminalContextMenu } from "./terminal-context-menu";

interface TerminalSessionProps {
  tabId: string;
  path: string;
  isVisible: boolean;
  sessionType?: SessionType;
}

export const TerminalSession = memo(function TerminalSession({ tabId, path, isVisible, sessionType = "claude" }: TerminalSessionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const webglAddonRef = useRef<WebglAddon | null>(null);
  const composingRef = useRef(false);
  const isVisibleRef = useRef(isVisible);
  isVisibleRef.current = isVisible;

  const { spawn, write, resize, close } = usePty({
    tabId,
    onData: (data) => {
      terminalRef.current?.write(data);
    },
    onExit: () => {
      terminalRef.current?.write("\r\n\x1b[1;33m[Session ended]\x1b[0m\r\n");
    },
  });

  // Keep a stable ref to write so callbacks don't need to redeclare on change
  const writeRef = useRef(write);
  writeRef.current = write;

  const handleCopy = useCallback(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;
    const selection = terminal.getSelection();
    if (selection) {
      navigator.clipboard.writeText(selection).catch((err) => {
        console.warn("[terminal] Copy failed:", err);
      });
    }
  }, []);

  const handlePaste = useCallback(() => {
    navigator.clipboard.readText().then((text) => {
      if (text) {
        writeRef.current(text);
      }
    }).catch((err) => {
      console.warn("[terminal] Paste failed:", err);
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const currentTheme = useThemeStore.getState().getActiveTheme();
    const currentOpacity = useUserSettingsStore.getState().settings.window.opacity;
    const terminalTheme = buildTerminalTheme(currentTheme, currentOpacity);
    const terminal = new Terminal({ ...TERMINAL_OPTIONS, theme: terminalTheme });
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon((_event, uri) => {
      routeLinkClick(uri);
    });

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.open(containerRef.current);

    try {
      const webgl = new WebglAddon();
      terminal.loadAddon(webgl);
      webglAddonRef.current = webgl;
    } catch (err) {
      console.info("[terminal] WebGL unavailable, using canvas renderer:", err);
    }

    // Track composition state via xterm's internal textarea so we can
    // suppress the post-composition keydown that Linux IMEs fire with
    // isComposing: false (which would duplicate the composed character).
    const textarea = containerRef.current.querySelector("textarea");
    if (textarea) {
      textarea.addEventListener("compositionstart", () => {
        composingRef.current = true;
      });
      textarea.addEventListener("compositionend", () => {
        // Keep the flag true until after the post-composition keydown
        // has been processed (it fires synchronously after compositionend).
        setTimeout(() => { composingRef.current = false; }, 0);
      });
    }

    terminal.attachCustomKeyEventHandler((event) => {
      // Let the browser handle dead-key / IME composition events so that
      // composed characters (e.g. ' + c = ç) are not processed twice.
      // composingRef catches the post-composition keydown on Linux where
      // isComposing is already false but the character was already emitted.
      if (event.isComposing || event.key === "Dead" || composingRef.current) return false;

      // Cedilla fix: Chromium/Ozone on Wayland composes dead_acute+c as ć
      // (c-acute) instead of ç (c-cedilla). Remap at application level.
      const CEDILLA_MAP: Record<string, string> = { "\u0107": "\u00E7", "\u0106": "\u00C7" };
      const cedillaReplacement = CEDILLA_MAP[event.key];
      if (cedillaReplacement && event.type === "keydown") {
        writeRef.current(cedillaReplacement);
        return false;
      }

      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return true;

      // Ctrl+Alt: zoom, splits, diff nav -> app
      if (event.altKey) return false;
      // Ctrl+Shift+C: copy terminal selection
      if (event.shiftKey && event.key === "C" && event.type === "keydown") {
        handleCopy();
        return false;
      }
      // Ctrl+Shift+V: let browser's native paste event flow to xterm's handler
      if (event.shiftKey && event.key === "V" && event.type === "keydown") {
        return false;
      }
      // Ctrl+Shift: new tab, close tab, command palette, git -> app
      if (event.shiftKey) return false;
      // Ctrl+[number]: tab switching -> app
      if (event.key >= "1" && event.key <= "9") return false;
      // Ctrl+Tab: cycle tabs -> app
      if (event.key === "Tab") return false;
      // Ctrl+[letter] the app uses
      const appKeys = new Set(["b", "e", "j", "o", "p", "s", "w", ","]);
      if (appKeys.has(event.key.toLowerCase())) return false;

      // Ctrl+C, Ctrl+D, Ctrl+Z, etc. -> xterm
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
      terminal.focus();
      const dims = fitAddon.proposeDimensions();
      const rows = dims?.rows ?? 24;
      const cols = dims?.cols ?? 80;
      spawn(path, sessionType).then(() => {
        if (!aborted) resize(rows, cols);
      });
    });

    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      // Skip resize when the terminal is hidden — the container has 0×0
      // dimensions and fit() would collapse the PTY to ~6 cols, corrupting
      // all buffered output.  The ResizeObserver will fire again when the
      // tab becomes visible and the container expands to its real size.
      if (!isVisibleRef.current) return;

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
      clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
      dataDisposable.dispose();
      // Only kill the PTY if the tab was actually removed from the store.
      // During reorder or React remount the tab still exists, so we must
      // not close the underlying process.
      if (!useTerminalTabsStore.getState().hasTab(tabId)) {
        close();
      }
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
      terminal.options.fontFamily = state.fontFamily;
      if (!isVisibleRef.current) return;
      fitAddon.fit();
      const dims = fitAddon.proposeDimensions();
      if (dims) {
        resize(dims.rows, dims.cols);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply theme changes reactively (including opacity)
  useEffect(() => {
    return useThemeStore.subscribe((state) => {
      const terminal = terminalRef.current;
      if (!terminal) return;
      const theme = state.getActiveTheme();
      const opacity = useUserSettingsStore.getState().settings.window.opacity;
      terminal.options.theme = buildTerminalTheme(theme, opacity);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply background opacity changes to terminal
  useEffect(() => {
    return useUserSettingsStore.subscribe((state) => {
      const terminal = terminalRef.current;
      if (!terminal) return;
      const theme = useThemeStore.getState().getActiveTheme();
      const opacity = state.settings.window.opacity;
      terminal.options.theme = buildTerminalTheme(theme, opacity);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // WebGL virtualization: dispose addon after 30s hidden, recreate when visible
  useEffect(() => {
    const terminal = terminalRef.current;

    if (isVisible) {
      // Recreate WebGL if it was disposed
      if (!webglAddonRef.current && terminal) {
        try {
          const webgl = new WebglAddon();
          terminal.loadAddon(webgl);
          webglAddonRef.current = webgl;
        } catch {
          // Canvas2D fallback is fine
        }
      }

      // Re-fit and focus after becoming visible.  Use double-RAF so the
      // browser has finished layout after removing the hidden class/attribute.
      // The ResizeObserver should also fire, but this acts as a safety
      // net for edge-cases where the container size hasn't changed.
      if (fitAddonRef.current) {
        const id = requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            fitAddonRef.current?.fit();
            terminal?.focus();
            const dims = fitAddonRef.current?.proposeDimensions();
            if (dims) {
              resize(dims.rows, dims.cols);
            }
          });
        });
        return () => cancelAnimationFrame(id);
      }
    } else {
      if (webglAddonRef.current) {
        try {
          webglAddonRef.current.dispose();
        } finally {
          webglAddonRef.current = null;
        }
      }
    }
  }, [isVisible]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      role="region"
      aria-label="Claude Code Terminal"
      className={`h-full w-full bg-overlay-base ${!isVisible ? "hidden" : ""}`}
    >
      <TerminalContextMenu tabId={tabId} onCopy={handleCopy} onPaste={handlePaste}>
        <div className="h-full w-full pt-3 pl-4 pb-3">
          <div ref={containerRef} className="h-full w-full" />
          <div role="status" aria-live="polite" className="sr-only" />
        </div>
      </TerminalContextMenu>
    </div>
  );
});
