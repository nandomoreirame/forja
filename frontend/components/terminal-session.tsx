import { usePty } from "@/hooks/use-pty";
import { TERMINAL_OPTIONS } from "@/lib/terminal-theme";
import { routeLinkClick } from "@/lib/link-router";
import { remapCedilla } from "@/lib/cedilla-remap";
import { terminalCache } from "@/lib/terminal-instance-cache";
import { invoke } from "@/lib/ipc";
import { CLI_REGISTRY, type SessionType } from "@/lib/cli-registry";
import { paneFocusRegistry } from "@/lib/pane-focus-registry";
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
import { useTilingLayoutStore } from "@/stores/tiling-layout";
import { usePerformanceStore } from "@/stores/performance";
import { memo, useCallback, useEffect, useRef } from "react";
import { TerminalContextMenu } from "./terminal-context-menu";
import { SessionStatusBar } from "./session-status-bar";

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

  // RAF-coalesced write buffer: accumulate PTY data chunks and flush once per
  // animation frame.  This prevents visible viewport "jumps" when the CLI's
  // TUI framework (Ink) re-renders — its cursor-up + clear + rewrite escape
  // sequences arrive across multiple IPC events and would otherwise be
  // processed in separate xterm.js rendering batches, briefly showing
  // intermediate viewport states (scroll jumping to the top).
  const writeBufferRef = useRef("");
  const writeRafRef = useRef(0);

  // For AI CLI sessions, strip DECTCEM show-cursor sequences (\x1b[?25h)
  // from the PTY data stream.  TUI frameworks (Ink) periodically emit
  // show-cursor as part of their render cycle, which re-enables the
  // xterm.js hardware cursor and causes a phantom second cursor alongside
  // the TUI's own visual cursor in the input field.
  const isAiCli = sessionType !== "terminal";

  const { spawn, write, resize, close } = usePty({
    tabId,
    onData: (data) => {
      writeBufferRef.current += data;
      if (!writeRafRef.current) {
        writeRafRef.current = requestAnimationFrame(() => {
          writeRafRef.current = 0;
          let buffered = writeBufferRef.current;
          writeBufferRef.current = "";
          if (isAiCli) {
            buffered = buffered.replaceAll("\x1b[?25h", "");
          }
          terminalRef.current?.write(buffered);
        });
      }
    },
    onExit: () => {
      terminalRef.current?.write("\r\n\x1b[1;33m[Session ended]\x1b[0m\r\n");
      // Auto-close tab for AI CLI sessions (not plain terminals)
      if (sessionType && sessionType !== "terminal") {
        setTimeout(() => {
          useTerminalTabsStore.getState().removeTab(tabId);
        }, 500);
      }
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

    let aborted = false;
    let rafId = 0;
    let resizeTimeout: ReturnType<typeof setTimeout>;
    let resizeObserver: ResizeObserver | null = null;
    let dataDisposable: { dispose: () => void } | null = null;
    let terminalLocal: Terminal | null = null;
    let fitAddonLocal: FitAddon | null = null;
    let hostElementLocal: HTMLDivElement | null = null;
    let spawned = false;

    const init = async () => {
      if (!containerRef.current) return;

      const cached = terminalCache.get(tabId);
      let terminal: Terminal;
      let fitAddon: FitAddon;
      let hostElement: HTMLDivElement;
      let shouldSpawn = true;

      if (cached) {
        // REATTACH: move cached DOM + terminal instance
        terminal = cached.terminal;
        fitAddon = cached.fitAddon;
        hostElement = cached.hostElement;
        containerRef.current.appendChild(hostElement);
        // Force xterm to re-render the full viewport after DOM reattachment.
        // While parked, xterm wrote data to a detached DOM — the renderer's
        // internal state may be stale, causing garbled text without this.
        terminal.refresh(0, terminal.rows - 1);
        shouldSpawn = false; // PTY already running
        spawned = true; // treat as already started so park works on next unmount
      } else {
        // NEW: create terminal + host element
        hostElement = document.createElement("div");
        hostElement.className = "h-full w-full";
        containerRef.current.appendChild(hostElement);

        const currentTheme = useThemeStore.getState().getActiveTheme();
        const currentOpacity = useUserSettingsStore.getState().settings.window.opacity;
        const terminalTheme = buildTerminalTheme(currentTheme, currentOpacity);
        terminal = new Terminal({ ...TERMINAL_OPTIONS, theme: terminalTheme });
        fitAddon = new FitAddon();
        const webLinksAddon = new WebLinksAddon((_event, uri) => {
          routeLinkClick(uri);
        });

        terminal.loadAddon(fitAddon);
        terminal.loadAddon(webLinksAddon);
        terminal.open(hostElement);

        // Track composition state via xterm's internal textarea so we can
        // suppress the post-composition keydown that Linux IMEs fire with
        // isComposing: false (which would duplicate the composed character).
        const textarea = hostElement.querySelector("textarea");
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

        // KEY: Check if a backend PTY is still alive for this tabId (reconnection)
        // This handles the case where the frontend cache expired but the backend
        // PTY process is still running.
        try {
          const ptyAlive = await invoke<boolean>("pty:has-session", { tabId });
          if (ptyAlive && !aborted) {
            shouldSpawn = false;
            spawned = true; // park on unmount so we can reconnect again later
            // Replay recent output from backend ring buffer
            const buffer = await invoke<string | null>("pty:get-buffer", { tabId });
            if (buffer && !aborted) {
              terminal.write(buffer);
            }
          }
        } catch {
          // Backend check failed — fall through to spawn new PTY
        }
      }

      // If component was unmounted while we were awaiting IPC, clean up and bail
      if (aborted) {
        if (!cached) {
          hostElement.remove();
          terminal.dispose();
        }
        return;
      }

      // Store refs so the cleanup closure can access them
      terminalLocal = terminal;
      fitAddonLocal = fitAddon;
      hostElementLocal = hostElement;

      // WebGL addon (re-create for both cached and new)
      // Skip in lite mode to reduce GPU memory usage
      if (!usePerformanceStore.getState().isLite) {
        try {
          const webgl = new WebglAddon();
          terminal.loadAddon(webgl);
          webglAddonRef.current = webgl;
        } catch (err) {
          console.info("[terminal] WebGL unavailable, using canvas renderer:", err);
        }
      }

      terminalRef.current = terminal;
      fitAddonRef.current = fitAddon;

      dataDisposable = terminal.onData((data) => {
        write(remapCedilla(data));
      });

      // Wait for layout to stabilize before fitting and spawning
      // so the PTY gets the correct initial dimensions.
      rafId = requestAnimationFrame(() => {
        if (aborted) return;
        fitAddon.fit();
        terminal.focus();
        const dims = fitAddon.proposeDimensions();
        const rows = dims?.rows ?? 24;
        const cols = dims?.cols ?? 80;
        if (shouldSpawn) {
          spawned = true;

          // Load persisted buffer for visual continuity before spawning
          const spawnWithResume = async () => {
            try {
              const persistedBuffer = await invoke<string | null>("pty:load-persisted-buffer", {
                projectPath: path,
                tabId,
              });
              if (persistedBuffer && !aborted) {
                terminal.write(persistedBuffer);
              }
            } catch {
              // Non-fatal: buffer replay failure
            }

            // Check if this is a restored session that had already exited.
            const tab = useTerminalTabsStore.getState().tabs?.find(t => t.id === tabId);

            // Build resume args if we have a stored session ID
            let resumeArgs: string[] | undefined;
            const cliSessionId = tab?.cliSessionId;

            // NEW: For CLIs with sessionIdFlag and NO existing cliSessionId,
            // generate a deterministic UUID at spawn time to eliminate heuristic
            // filesystem-based session ID detection.
            // Only generate for active (non-exited) sessions: tab doesn't exist yet,
            // or tab.isRunning is not explicitly false.
            const isActiveSession = !tab || tab.isRunning !== false;
            if (!cliSessionId && isActiveSession && sessionType && sessionType !== "terminal") {
              const cliDef = CLI_REGISTRY[sessionType as import("@/lib/cli-registry").CliId];
              if (cliDef?.sessionIdFlag && cliDef.sessionIdFlag !== "create-chat") {
                const newSessionId = crypto.randomUUID();
                useTerminalTabsStore.getState().setCliSessionId(tabId, newSessionId);
                resumeArgs = [cliDef.sessionIdFlag, newSessionId];
              }
            }

            if (!resumeArgs && cliSessionId && sessionType && sessionType !== "terminal") {
              const def = CLI_REGISTRY[sessionType];
              if (def?.resumeFlag) {
                const resumeValue =
                  def.resumeIdType === "latest" ? "latest" : cliSessionId;
                if (def.resumeFlag.endsWith("=")) {
                  resumeArgs = [`${def.resumeFlag}${resumeValue}`];
                } else {
                  resumeArgs = [def.resumeFlag, resumeValue];
                }
              }
            }

            // If the session exited before app restart and has no resume ID,
            // auto-close AI CLI tabs (plain terminals stay with their buffer).
            if (tab && !tab.isRunning) {
              if (resumeArgs) {
                // Resumable session — mark as running and proceed to spawn with --resume
                useTerminalTabsStore.getState().markTabRunning(tab.id);
              } else if (sessionType && sessionType !== "terminal") {
                setTimeout(() => {
                  useTerminalTabsStore.getState().removeTab(tabId);
                }, 500);
                return;
              } else {
                return;
              }
            }

            const spawnResult = await spawn(path, sessionType, resumeArgs);
            if (spawnResult?.tmuxSessionName) {
              useTerminalTabsStore.getState().setTmuxSessionName(tabId, spawnResult.tmuxSessionName);
            }
            if (!aborted) {
              resize(rows, cols);
              // Hide xterm.js hardware cursor for AI CLI sessions.
              // TUI frameworks (Ink) render their own visual cursor in the
              // input field; the real terminal cursor sits at the PTY's last
              // write position (usually the bottom), causing a phantom
              // second cursor.  DECTCEM hide keeps only the TUI cursor.
              if (sessionType && sessionType !== "terminal") {
                terminal.write("\x1b[?25l");
              }
              // Clean up persisted buffer after successful spawn
              invoke("pty:delete-persisted-buffer", { projectPath: path, tabId }).catch(() => {});
            }
          };

          spawnWithResume();
        } else {
          resize(rows, cols);
        }
      });

      const handleResize = () => {
        // Skip resize when the terminal is hidden (FlexLayout uses CSS
        // display:none) — the container has 0x0 dimensions and fit() would
        // collapse the PTY to ~6 cols, corrupting all buffered output.
        // The ResizeObserver will fire again when the tab becomes visible
        // and the container expands to its real size.
        const el = containerRef.current;
        if (!el || el.offsetWidth === 0 || el.offsetHeight === 0) return;

        fitAddon.fit();
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          const newDims = fitAddon.proposeDimensions();
          if (newDims) {
            resize(newDims.rows, newDims.cols);
          }
        }, 100);
      };

      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(containerRef.current);
    };

    init();

    return () => {
      aborted = true;
      cancelAnimationFrame(rafId);
      clearTimeout(resizeTimeout);
      resizeObserver?.disconnect();
      dataDisposable?.dispose();

      // Cancel pending write-coalescing RAF and flush buffered data to terminal
      // so no escape sequences are lost during the unmount transition.
      if (writeRafRef.current) {
        cancelAnimationFrame(writeRafRef.current);
        writeRafRef.current = 0;
      }
      if (writeBufferRef.current && terminalLocal) {
        terminalLocal.write(writeBufferRef.current);
      }
      writeBufferRef.current = "";

      // Dispose WebGL before parking (can't survive DOM detachment)
      if (webglAddonRef.current) {
        try { webglAddonRef.current.dispose(); } finally { webglAddonRef.current = null; }
      }

      // terminalLocal/fitAddonLocal/hostElementLocal may still be null if the
      // component unmounted before the async init() could assign them
      if (!terminalLocal || !fitAddonLocal || !hostElementLocal) return;

      const terminal = terminalLocal;
      const fitAddon = fitAddonLocal;
      const hostElement = hostElementLocal;

      if (!useTerminalTabsStore.getState().hasTab(tabId)) {
        // Tab truly removed — kill PTY and tmux session (force=true)
        close(true);
        terminal.dispose();
        terminalCache.dispose(tabId);
      } else if (spawned) {
        // Tab still exists, PTY running (project switch) — park for reattach
        terminalCache.park(tabId, terminal, fitAddon, hostElement);
      } else {
        // Tab exists but PTY never started (e.g. React strict mode fast remount)
        // Clean up and let the next mount start fresh
        hostElement.remove();
        terminal.dispose();
      }
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
      const el = containerRef.current;
      if (!el || el.offsetWidth === 0 || el.offsetHeight === 0) return;
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

  // Register focus callback for pane-focus cycling (Ctrl+Tab)
  useEffect(() => {
    paneFocusRegistry.register(tabId, () => {
      terminalRef.current?.focus();
    });
    return () => { paneFocusRegistry.unregister(tabId); };
  }, [tabId]);

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
      // Recreate WebGL if it was disposed (skip in lite mode to reduce GPU memory)
      if (!webglAddonRef.current && terminal && !usePerformanceStore.getState().isLite) {
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

  // Poll tmux pane foreground command and auto-rename tab (updates FlexLayout model)
  const tmuxSessionName = useTerminalTabsStore((s) => s.tabs.find((t) => t.id === tabId)?.tmuxSessionName);
  const renameBlock = useTilingLayoutStore((s) => s.renameBlock);
  useEffect(() => {
    if (sessionType !== "terminal" || !tmuxSessionName) return;

    let cancelled = false;
    let lastCmd: string | null = null;

    const poll = () => {
      invoke<string | null>("pty:get-pane-command", { tmuxSessionName }).then((cmd) => {
        if (cancelled || cmd === lastCmd) return;
        lastCmd = cmd;
        // Update FlexLayout model (this is what the tab header reads)
        renameBlock(tabId, cmd ?? "");
      }).catch(() => {});
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      renameBlock(tabId, "");
    };
  }, [tabId, sessionType, tmuxSessionName, renameBlock]);

  return (
    <div
      role="region"
      aria-label="Claude Code Terminal"
      className={`flex h-full w-full flex-col bg-overlay-base ${!isVisible ? "hidden" : ""}`}
    >
      <TerminalContextMenu tabId={tabId} onCopy={handleCopy} onPaste={handlePaste}>
        <div className="h-full pt-3 pl-4 pb-1">
          <div ref={containerRef} className="h-full w-full" />
          <div role="status" aria-live="polite" className="sr-only" />
        </div>
      </TerminalContextMenu>
      <SessionStatusBar tabId={tabId} path={path} sessionType={sessionType} />
    </div>
  );
});
