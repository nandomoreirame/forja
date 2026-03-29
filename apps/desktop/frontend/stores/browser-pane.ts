import { create } from "zustand";
import { normalizeUrl, isAllowedUrl } from "@/lib/browser-url";

interface BrowserError {
  code: number;
  description: string;
  url: string;
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
}));
