import { create } from "zustand";
import { normalizeUrl, isAllowedUrl } from "@/lib/browser-url";

interface BrowserError {
  code: number;
  description: string;
  url: string;
}

interface PerProjectBrowserState {
  isOpen: boolean;
  url: string;
  committedUrl: string;
}

interface BrowserPaneState {
  isOpen: boolean;
  /** URL in the address bar (may be edited but not yet navigated) */
  url: string;
  /** The URL the webview is actually showing */
  committedUrl: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  title: string;
  error: BrowserError | null;
  /** Persisted browser state per project path */
  browserStateByProject: Record<string, PerProjectBrowserState>;
  // Actions
  toggleOpen: () => void;
  openPane: () => void;
  closePane: () => void;
  setUrl: (url: string) => void;
  navigate: () => void;
  navigateToUrl: (url: string) => void;
  setLoading: (loading: boolean) => void;
  setNavigationState: (state: { canGoBack: boolean; canGoForward: boolean }) => void;
  setTitle: (title: string) => void;
  onDidNavigate: (url: string) => void;
  setError: (error: BrowserError) => void;
  clearError: () => void;
  /** Saves current browser state (isOpen, url, committedUrl) for the given project path. */
  saveBrowserStateForProject: (projectPath: string) => void;
  /** Restores browser state for the given project path, or closes the pane if no saved state exists. */
  restoreBrowserStateForProject: (projectPath: string) => void;
}

export const useBrowserPaneStore = create<BrowserPaneState>((set, get) => ({
  isOpen: false,
  url: "http://localhost:3000",
  committedUrl: "http://localhost:3000",
  isLoading: false,
  canGoBack: false,
  canGoForward: false,
  title: "",
  error: null,
  browserStateByProject: {},

  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  openPane: () => set({ isOpen: true }),
  closePane: () => set({ isOpen: false }),

  setUrl: (url) => set({ url }),

  navigate: () => {
    const { url } = get();
    const normalized = normalizeUrl(url);
    if (!isAllowedUrl(normalized)) {
      console.warn("[BrowserPane] Blocked URL:", normalized);
      return;
    }
    set({ committedUrl: normalized, url: normalized, isOpen: true, error: null });
  },

  navigateToUrl: (url: string) => {
    const normalized = normalizeUrl(url);
    if (!isAllowedUrl(normalized)) {
      console.warn("[BrowserPane] Blocked URL:", normalized);
      return;
    }
    set({ url: normalized, committedUrl: normalized, isOpen: true, error: null });
  },

  setLoading: (isLoading) => set({ isLoading }),

  setNavigationState: ({ canGoBack, canGoForward }) =>
    set({ canGoBack, canGoForward }),

  setTitle: (title) => set({ title }),

  // Called when webview actually navigates (updates address bar to match)
  onDidNavigate: (url: string) => set({ url, committedUrl: url, error: null }),

  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  saveBrowserStateForProject: (projectPath: string) => {
    const { isOpen, url, committedUrl, browserStateByProject } = get();
    set({
      browserStateByProject: {
        ...browserStateByProject,
        [projectPath]: { isOpen, url, committedUrl },
      },
    });
  },

  restoreBrowserStateForProject: (projectPath: string) => {
    const { browserStateByProject } = get();
    const saved = browserStateByProject[projectPath];
    if (saved) {
      set({
        isOpen: saved.isOpen,
        url: saved.url,
        committedUrl: saved.committedUrl,
        // Reset transient navigation state since it belongs to the webview session
        isLoading: false,
        canGoBack: false,
        canGoForward: false,
        title: "",
        error: null,
      });
    } else {
      // No saved state for this project: close the pane and reset to default URL
      set({
        isOpen: false,
        url: "http://localhost:3000",
        committedUrl: "http://localhost:3000",
        isLoading: false,
        canGoBack: false,
        canGoForward: false,
        title: "",
        error: null,
      });
    }
  },
}));
