import { useRef, useEffect, useState, useCallback } from "react";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { invoke } from "@/lib/ipc";
import { usePluginsStore } from "@/stores/plugins";
import { useThemeStore } from "@/stores/theme";
import { buildPluginThemeCSS, buildPluginThemePayload } from "@/lib/plugin-theme";

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
        const result = await invoke("plugin:bridge", {
          pluginName,
          method: data.method,
          args: data.args,
        });
        const wv = webviewRef.current as unknown as {
          send: (channel: string, data: unknown) => void;
        } | null;
        wv?.send("plugin:response", {
          id: data.id,
          success: true,
          result,
        });
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
