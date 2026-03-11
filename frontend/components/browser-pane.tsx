import { useRef, useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, RefreshCw, X, Globe, XCircle, AlertCircle, Camera, Check } from "lucide-react";
import { useBrowserPaneStore } from "@/stores/browser-pane";
import { invoke } from "@/lib/ipc";
import { cn } from "@/lib/utils";

type ScreenshotState = "idle" | "success" | "error";

// Electron's <webview> is not in @types/react; extend JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          allowpopups?: string;
          partition?: string;
          ref?: React.Ref<Electron.WebviewTag>;
        },
        HTMLElement
      >;
    }
  }
}

export function BrowserPane() {
  const webviewRef = useRef<Electron.WebviewTag | null>(null);
  const [screenshotState, setScreenshotState] = useState<ScreenshotState>("idle");

  const url = useBrowserPaneStore((s) => s.url);
  const committedUrl = useBrowserPaneStore((s) => s.committedUrl);
  const isLoading = useBrowserPaneStore((s) => s.isLoading);
  const canGoBack = useBrowserPaneStore((s) => s.canGoBack);
  const canGoForward = useBrowserPaneStore((s) => s.canGoForward);
  const setUrl = useBrowserPaneStore((s) => s.setUrl);
  const navigate = useBrowserPaneStore((s) => s.navigate);
  const closePane = useBrowserPaneStore((s) => s.closePane);
  const setLoading = useBrowserPaneStore((s) => s.setLoading);
  const setNavigationState = useBrowserPaneStore((s) => s.setNavigationState);
  const setTitle = useBrowserPaneStore((s) => s.setTitle);
  const onDidNavigate = useBrowserPaneStore((s) => s.onDidNavigate);
  const error = useBrowserPaneStore((s) => s.error);
  const setError = useBrowserPaneStore((s) => s.setError);
  const clearError = useBrowserPaneStore((s) => s.clearError);

  // Inject custom scrollbar CSS into webview to match app theme
  const injectScrollbarCSS = useCallback((wv: Electron.WebviewTag) => {
    wv.insertCSS(`
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #313244; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: #45475a; }
    `);
  }, []);

  // Wire webview events to store
  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;

    const handleLoadStart = () => setLoading(true);
    const handleLoadStop = () => {
      setLoading(false);
      setNavigationState({
        canGoBack: wv.canGoBack(),
        canGoForward: wv.canGoForward(),
      });
      injectScrollbarCSS(wv);
    };
    const handleDidNavigate = (e: Event & { url?: string }) => {
      if (e.url) onDidNavigate(e.url);
    };
    const handleTitleUpdate = (e: Event & { title?: string }) => {
      if (e.title) setTitle(e.title);
    };
    const handleDidFailLoad = (
      e: Event & { errorCode?: number; errorDescription?: string; validatedURL?: string },
    ) => {
      setLoading(false);
      if (e.errorCode && e.errorCode !== -3) {
        setError({
          code: e.errorCode,
          description: e.errorDescription ?? "Unknown error",
          url: e.validatedURL ?? "",
        });
      }
    };

    const handleDomReady = () => injectScrollbarCSS(wv);

    wv.addEventListener("dom-ready", handleDomReady);
    wv.addEventListener("did-start-loading", handleLoadStart);
    wv.addEventListener("did-stop-loading", handleLoadStop);
    wv.addEventListener("did-navigate", handleDidNavigate);
    wv.addEventListener("did-navigate-in-page", handleDidNavigate);
    wv.addEventListener("page-title-updated", handleTitleUpdate);
    wv.addEventListener("did-fail-load", handleDidFailLoad);

    return () => {
      wv.removeEventListener("dom-ready", handleDomReady);
      wv.removeEventListener("did-start-loading", handleLoadStart);
      wv.removeEventListener("did-stop-loading", handleLoadStop);
      wv.removeEventListener("did-navigate", handleDidNavigate);
      wv.removeEventListener("did-navigate-in-page", handleDidNavigate);
      wv.removeEventListener("page-title-updated", handleTitleUpdate);
      wv.removeEventListener("did-fail-load", handleDidFailLoad);
    };
  }, [setLoading, setNavigationState, setTitle, onDidNavigate, injectScrollbarCSS]);

  const handleGoBack = useCallback(() => {
    webviewRef.current?.goBack();
  }, []);

  const handleGoForward = useCallback(() => {
    webviewRef.current?.goForward();
  }, []);

  const handleReload = useCallback(() => {
    clearError();
    webviewRef.current?.reload();
  }, [clearError]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") navigate();
    },
    [navigate],
  );

  const handleScreenshot = useCallback(async () => {
    const wv = webviewRef.current;
    if (!wv) return;
    try {
      const webContentsId = wv.getWebContentsId();
      await invoke("browser:screenshot", { webContentsId });
      setScreenshotState("success");
      setTimeout(() => setScreenshotState("idle"), 2000);
    } catch (err) {
      console.error("[BrowserPane] Screenshot failed:", err);
      setScreenshotState("idle");
    }
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-ctp-base">
      {/* Browser toolbar */}
      <div className="flex h-9 shrink-0 items-center gap-1 border-b border-ctp-surface0 bg-ctp-mantle px-2">
        {/* Navigation buttons */}
        <button
          onClick={handleGoBack}
          disabled={!canGoBack}
          aria-label="Go back"
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded text-ctp-overlay1 transition-colors",
            canGoBack
              ? "hover:bg-ctp-surface0 hover:text-ctp-text"
              : "cursor-not-allowed opacity-30",
          )}
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>

        <button
          onClick={handleGoForward}
          disabled={!canGoForward}
          aria-label="Go forward"
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded text-ctp-overlay1 transition-colors",
            canGoForward
              ? "hover:bg-ctp-surface0 hover:text-ctp-text"
              : "cursor-not-allowed opacity-30",
          )}
        >
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>

        <button
          onClick={handleReload}
          aria-label="Reload page"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
        >
          {isLoading ? (
            <XCircle className="h-3.5 w-3.5 text-ctp-red" strokeWidth={1.5} />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
          )}
        </button>

        {/* Address bar */}
        <div className="relative flex flex-1 items-center">
          <Globe className="pointer-events-none absolute left-2 h-3 w-3 text-ctp-overlay0" />
          <input
            type="text"
            role="textbox"
            aria-label="Address bar"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            className="h-7 w-full rounded bg-ctp-surface0 pl-7 pr-2 text-xs text-ctp-text placeholder-ctp-overlay0 outline-none ring-0 focus:ring-1 focus:ring-brand"
          />
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div
            role="progressbar"
            aria-label="Loading"
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand border-t-transparent"
          />
        )}

        {/* Screenshot button */}
        <button
          onClick={handleScreenshot}
          aria-label={screenshotState === "success" ? "Screenshot copied" : "Take screenshot"}
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded transition-colors",
            screenshotState === "success"
              ? "text-ctp-green"
              : "text-ctp-overlay1 hover:bg-ctp-surface0 hover:text-ctp-text",
          )}
        >
          {screenshotState === "success" ? (
            <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
          ) : (
            <Camera className="h-3.5 w-3.5" strokeWidth={1.5} />
          )}
        </button>

        {/* Close button */}
        <button
          onClick={closePane}
          aria-label="Close browser pane"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>

      {/* Loading progress bar */}
      {isLoading && (
        <div className="h-0.5 w-full overflow-hidden bg-ctp-surface0">
          <div className="h-full animate-pulse bg-brand" />
        </div>
      )}

      {/* Webview content */}
      <div className="relative flex-1 overflow-hidden">
        <webview
          ref={webviewRef}
          src={committedUrl}
          className="h-full w-full"
          allowpopups="false"
          partition="persist:browser-pane"
        />

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-ctp-base">
            <AlertCircle className="h-12 w-12 text-ctp-overlay1" strokeWidth={1.5} />
            <div className="flex flex-col items-center gap-1 text-center">
              <h2 className="text-base font-medium text-ctp-text">
                Could not access this site
              </h2>
              <p className="text-sm font-semibold text-ctp-subtext0">
                {(() => {
                  try {
                    return new URL(error.url).hostname;
                  } catch {
                    return error.url;
                  }
                })()}
              </p>
              <p className="mt-1 text-xs text-ctp-overlay1">{error.description}</p>
            </div>
            <button
              onClick={() => {
                clearError();
                webviewRef.current?.reload();
              }}
              className="mt-2 rounded bg-ctp-surface1 px-4 py-1.5 text-sm text-ctp-text transition-colors hover:bg-ctp-surface2"
            >
              Reload
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
