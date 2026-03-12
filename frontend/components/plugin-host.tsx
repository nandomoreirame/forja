import { useRef, useEffect, useState, useCallback } from "react";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { invoke } from "@/lib/ipc";
import { usePluginsStore } from "@/stores/plugins";
import { useThemeStore } from "@/stores/theme";
import { useProjectsStore } from "@/stores/projects";
import { buildPluginThemeCSS, buildPluginThemePayload } from "@/lib/plugin-theme";
import type { PluginPermission, PluginPermissionGrant } from "@/lib/plugin-types";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          preload?: string;
          partition?: string;
        },
        HTMLElement
      >;
    }
  }
}

interface PluginHostProps {
  pluginName: string;
}

type PluginStatus = "loading" | "ready" | "error" | "crashed";

export function PluginHost({ pluginName }: PluginHostProps) {
  const plugin = usePluginsStore((s) =>
    s.plugins.find((p) => p.manifest.name === pluginName)
  );
  const [status, setStatus] = useState<PluginStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [preloadPath, setPreloadPath] = useState<string | null>(null);
  const webviewRef = useRef<HTMLElement | null>(null);

  // Fetch preload path on mount
  useEffect(() => {
    invoke<string>("plugin:get-preload-path")
      .then((path) => setPreloadPath(path ?? null))
      .catch(() => setPreloadPath(null));
  }, []);

  // Inject theme CSS variables into the webview
  const injectThemeCSS = useCallback(() => {
    const wv = webviewRef.current as unknown as {
      executeJavaScript: (js: string) => Promise<void>;
    } | null;
    if (!wv?.executeJavaScript) return;

    const theme = useThemeStore.getState().getActiveTheme();
    const css = buildPluginThemeCSS(theme);
    const js = `(function(){let s=document.getElementById('forja-theme');if(!s){s=document.createElement('style');s.id='forja-theme';document.head.appendChild(s);}s.textContent='${css}';})()`;
    wv.executeJavaScript(js).catch(() => {});
  }, []);

  // Send theme-changed event to the webview
  const sendThemeChangedEvent = useCallback(() => {
    const wv = webviewRef.current as unknown as {
      send: (channel: string, data: unknown) => void;
    } | null;
    if (!wv?.send) return;

    const theme = useThemeStore.getState().getActiveTheme();
    wv.send("plugin:event", {
      event: "theme-changed",
      payload: buildPluginThemePayload(theme),
    });
  }, []);

  // Handle webview IPC messages from the plugin
  const handleIpcMessage = useCallback(
    async (event: Event) => {
      const customEvent = event as Event & {
        channel: string;
        args: unknown[];
      };
      if (customEvent.channel !== "plugin:request") return;

      const data = customEvent.args[0] as {
        id: number;
        method: string;
        args: Record<string, unknown>;
      };

      // Intercept project.getActive to return directly from the frontend store
      // (avoids roundtrip to backend and timing issues with session restore)
      if (data.method === "project.getActive") {
        const activePath = useProjectsStore.getState().activeProjectPath;
        const wv = webviewRef.current as unknown as {
          send: (channel: string, data: unknown) => void;
        } | null;
        if (activePath) {
          const name = activePath.replace(/\\/g, "/").split("/").filter(Boolean).pop() ?? null;
          wv?.send("plugin:response", {
            id: data.id,
            success: true,
            result: { path: activePath, name },
          });
        } else {
          wv?.send("plugin:response", {
            id: data.id,
            success: true,
            result: null,
          });
        }
        return;
      }

      // Intercept sidebar.setBadge — frontend-only, no backend roundtrip
      if (data.method === "sidebar.setBadge") {
        const text = typeof data.args.text === "string" ? data.args.text : "";
        usePluginsStore.getState().setPluginBadge(pluginName, text);
        const wv = webviewRef.current as unknown as {
          send: (channel: string, data: unknown) => void;
        } | null;
        wv?.send("plugin:response", {
          id: data.id,
          success: true,
          result: { updated: true },
        });
        return;
      }

      // Intercept theme.getCurrent to return full theme payload from frontend store
      if (data.method === "theme.getCurrent") {
        const theme = useThemeStore.getState().getActiveTheme();
        const wv = webviewRef.current as unknown as {
          send: (channel: string, data: unknown) => void;
        } | null;
        wv?.send("plugin:response", {
          id: data.id,
          success: true,
          result: buildPluginThemePayload(theme),
        });
        return;
      }

      try {
        const bridgeResult = await invoke<{ success: boolean; data?: unknown; error?: string }>("plugin:bridge", {
          pluginName,
          method: data.method,
          args: data.args,
          projectPath: useProjectsStore.getState().activeProjectPath,
        });
        const wv = webviewRef.current as unknown as {
          send: (channel: string, data: unknown) => void;
        } | null;
        if (bridgeResult && !bridgeResult.success) {
          // Detect permission errors and auto-prompt the permission dialog
          if (bridgeResult.error?.includes("lacks permission")) {
            const currentPlugin = usePluginsStore.getState().plugins.find(
              (p) => p.manifest.name === pluginName
            );
            if (currentPlugin?.manifest.permissions?.length) {
              usePluginsStore.getState().requestPermissions(
                pluginName,
                currentPlugin.manifest.permissions
              );
            }
          }
          wv?.send("plugin:response", {
            id: data.id,
            success: false,
            error: bridgeResult.error ?? "Bridge call failed",
          });
        } else {
          wv?.send("plugin:response", {
            id: data.id,
            success: true,
            result: bridgeResult?.data,
          });
        }
      } catch (err) {
        const wv = webviewRef.current as unknown as {
          send: (channel: string, data: unknown) => void;
        } | null;
        wv?.send("plugin:response", {
          id: data.id,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [pluginName]
  );

  // Attach/detach webview event listeners whenever preloadPath or handler changes
  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;

    const onDomReady = () => {
      setStatus("ready");
      injectThemeCSS();

      // Send initial project state to the webview
      const typedWv = wv as unknown as {
        send: (channel: string, data: unknown) => void;
      } | null;
      if (typedWv?.send) {
        const activePath = useProjectsStore.getState().activeProjectPath;
        if (activePath) {
          const name = activePath.replace(/\\/g, "/").split("/").filter(Boolean).pop() ?? null;
          typedWv.send("plugin:event", {
            event: "project-changed",
            payload: { path: activePath, name },
          });
        }
        // If activeProjectPath is not yet available (session restore in progress),
        // subscribe and send the event as soon as it becomes available
        if (!activePath) {
          const unsub = useProjectsStore.subscribe((state) => {
            if (state.activeProjectPath) {
              unsub();
              const name = state.activeProjectPath.replace(/\\/g, "/").split("/").filter(Boolean).pop() ?? null;
              typedWv.send("plugin:event", {
                event: "project-changed",
                payload: { path: state.activeProjectPath, name },
              });
            }
          });
        }
      }
    };
    const onFailLoad = () => {
      setStatus("error");
      setErrorMessage("Failed to load plugin content");
    };
    const onCrash = () => {
      setStatus("crashed");
      setErrorMessage("Plugin crashed");
    };

    wv.addEventListener("dom-ready", onDomReady);
    wv.addEventListener("did-fail-load", onFailLoad);
    wv.addEventListener("crashed", onCrash);
    wv.addEventListener("ipc-message", handleIpcMessage);

    return () => {
      wv.removeEventListener("dom-ready", onDomReady);
      wv.removeEventListener("did-fail-load", onFailLoad);
      wv.removeEventListener("crashed", onCrash);
      wv.removeEventListener("ipc-message", handleIpcMessage);
    };
  }, [handleIpcMessage, injectThemeCSS, preloadPath]);

  // Subscribe to theme store changes and forward to webview
  useEffect(() => {
    const unsub = useThemeStore.subscribe(() => {
      injectThemeCSS();
      sendThemeChangedEvent();
    });
    return unsub;
  }, [injectThemeCSS, sendThemeChangedEvent]);

  // Subscribe to project store changes and forward to webview
  useEffect(() => {
    let prevPath = useProjectsStore.getState().activeProjectPath;
    const unsub = useProjectsStore.subscribe((state) => {
      const currentPath = state.activeProjectPath;
      if (currentPath === prevPath) return;
      prevPath = currentPath;

      const wv = webviewRef.current as unknown as {
        send: (channel: string, data: unknown) => void;
      } | null;
      if (!wv?.send) return;

      const name = currentPath ? currentPath.replace(/\\/g, "/").split("/").filter(Boolean).pop() ?? null : null;
      wv.send("plugin:event", {
        event: "project-changed",
        payload: { path: currentPath, name },
      });
    });
    return unsub;
  }, []);

  // Check plugin permissions on mount and prompt if any are missing
  useEffect(() => {
    if (!plugin) return;
    const manifestPerms = plugin.manifest.permissions;
    if (!manifestPerms || manifestPerms.length === 0) return;

    invoke<PluginPermissionGrant | null>("plugin:get-permissions", { name: pluginName })
      .then((grant) => {
        const granted = grant?.grantedPermissions ?? [];
        const missing = manifestPerms.filter((p: PluginPermission) => !granted.includes(p));
        if (missing.length > 0) {
          usePluginsStore.getState().requestPermissions(pluginName, manifestPerms);
        }
      })
      .catch(() => {
        usePluginsStore.getState().requestPermissions(pluginName, manifestPerms);
      });
  }, [plugin, pluginName]);

  // Reload webview after permission dialog is dismissed (permissions were granted)
  useEffect(() => {
    let prevPrompt = usePluginsStore.getState().permissionPrompt;
    const unsub = usePluginsStore.subscribe((state) => {
      const currentPrompt = state.permissionPrompt;
      if (!currentPrompt && prevPrompt && prevPrompt.pluginName === pluginName) {
        const wv = webviewRef.current as unknown as { reload: () => void } | null;
        if (wv?.reload) {
          setStatus("loading");
          wv.reload();
        }
      }
      prevPrompt = currentPrompt;
    });
    return unsub;
  }, [pluginName]);

  const handleReload = () => {
    setStatus("loading");
    setErrorMessage(null);
    const wv = webviewRef.current as unknown as { reload: () => void } | null;
    wv?.reload();
  };

  if (!plugin) {
    return (
      <div className="flex h-full items-center justify-center border-l border-ctp-surface0 bg-ctp-base">
        <p className="text-sm text-ctp-overlay0">Plugin not found</p>
      </div>
    );
  }

  if (!preloadPath) {
    return (
      <div className="flex h-full items-center justify-center border-l border-ctp-surface0 bg-ctp-base">
        <Loader2 className="h-5 w-5 animate-spin text-ctp-overlay0" />
      </div>
    );
  }

  return (
    <div
      className="relative flex h-full flex-col border-l border-ctp-surface0 bg-ctp-base"
      data-testid="plugin-host"
    >
      {/* Loading overlay */}
      {status === "loading" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-ctp-base">
          <Loader2 className="h-5 w-5 animate-spin text-ctp-overlay0" />
        </div>
      )}

      {/* Error / Crash overlay */}
      {(status === "error" || status === "crashed") && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-ctp-base">
          <AlertTriangle className="h-8 w-8 text-ctp-red" strokeWidth={1.5} />
          <p className="text-sm text-ctp-overlay1">
            {errorMessage ?? "An error occurred"}
          </p>
          <button
            type="button"
            onClick={handleReload}
            className="flex items-center gap-1.5 rounded-md bg-ctp-surface0 px-3 py-1.5 text-xs text-ctp-text transition-colors hover:bg-ctp-surface1"
          >
            <RefreshCw className="h-3 w-3" />
            Reload
          </button>
        </div>
      )}

      {/* Webview — <webview> is a special Electron custom element */}
      <webview
        ref={webviewRef as unknown as React.Ref<HTMLElement>}
        src={plugin.entryUrl}
        partition={`persist:plugin-${plugin.manifest.name}`}
        preload={`file://${preloadPath}`}
        style={{ width: "100%", height: "100%", border: "none" }}
        data-testid="plugin-webview"
      />
    </div>
  );
}
