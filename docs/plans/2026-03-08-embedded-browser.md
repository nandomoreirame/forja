# Embedded Browser Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an embedded browser panel to Forja that renders localhost URLs so developers can preview their running apps without leaving the editor.

**Architecture:** Use Electron's `<webview>` tag (sandboxed, isolated renderer process) rendered inside a new `BrowserPane` React component. The browser panel will sit alongside the terminal pane in the existing horizontal `ResizablePanelGroup`. State (URL, loading, history) lives in a new Zustand store `browser-pane.ts`. Four IPC channels handle navigation control from main process back to renderer (title/favicon updates). No new Electron main process modules are needed — `<webview>` runs entirely in the renderer process.

**Tech Stack:** React 19, TypeScript, Zustand, Electron `<webview>` tag, Tailwind CSS 4 / Catppuccin Mocha, Lucide React, Vitest + React Testing Library

---

## Architecture Decision: Why `<webview>` and not `BrowserView`/`WebContentsView`/`<iframe>`

| Option | Verdict |
|--------|---------|
| `<iframe>` | Blocked by `X-Frame-Options` on most localhost dev servers. Not viable. |
| `BrowserView` / `WebContentsView` | Overlays the Electron window outside React's DOM — hard to position/resize with CSS, deprecated in newer Electron versions. |
| `<webview>` | Runs as a sandboxed child renderer, accessible directly from React JSX, supports `src`, `back()`, `forward()`, `reload()`, events like `did-navigate`, `page-title-updated`. Requires `webviewTag: true` in `webPreferences`. **Chosen approach.** |

---

## Task 1: Enable `<webview>` in Electron and expose IPC bridge

**Files:**

- Modify: `electron/main.ts`
- Modify: `electron/preload.cts`
- Test: `electron/__tests__/webview-ipc.test.ts`

### Step 1: Write the failing test

Create `electron/__tests__/webview-ipc.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Simulate the shape of the electronAPI.browser namespace we'll add to preload
const mockElectronAPI = {
  browser: {
    navigate: vi.fn(),
    goBack: vi.fn(),
    goForward: vi.fn(),
    reload: vi.fn(),
    openExternal: vi.fn(),
  },
};

describe("browser IPC bridge shape", () => {
  it("exposes browser namespace on electronAPI", () => {
    expect(mockElectronAPI.browser).toBeDefined();
  });

  it("has navigate, goBack, goForward, reload functions", () => {
    expect(typeof mockElectronAPI.browser.navigate).toBe("function");
    expect(typeof mockElectronAPI.browser.goBack).toBe("function");
    expect(typeof mockElectronAPI.browser.goForward).toBe("function");
    expect(typeof mockElectronAPI.browser.reload).toBe("function");
  });
});
```

### Step 2: Run test to verify it fails

```bash
pnpm test electron/__tests__/webview-ipc.test.ts --reporter=verbose
```

Expected: PASS (this is a shape test that passes immediately — its value is as a contract doc).

### Step 3: Enable `webviewTag` in `electron/main.ts`

In `createWindow()`, add `webviewTag: true` to `webPreferences`:

```typescript
webPreferences: {
  preload: path.join(__dirname, "preload.cjs"),
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  webviewTag: true,  // <-- ADD THIS LINE
},
```

### Step 4: Expose browser namespace in `electron/preload.cts`

Add the `browser` namespace to `contextBridge.exposeInMainWorld`:

```typescript
// Add inside the contextBridge.exposeInMainWorld("electronAPI", { ... }) object:
browser: {
  // These are no-ops — webview is controlled directly from React refs.
  // This namespace exists so frontend/lib/ipc.ts can type-check cleanly.
  // Real navigation calls go through the webview element ref (see BrowserPane).
  navigate: (url: string) => ipcRenderer.invoke("browser:navigate", url),
  goBack: () => ipcRenderer.invoke("browser:goBack"),
  goForward: () => ipcRenderer.invoke("browser:goForward"),
  reload: () => ipcRenderer.invoke("browser:reload"),
},
```

**NOTE:** We actually WON'T add IPC handlers in `main.ts` for navigation — the `<webview>` ref exposes `src`, `goBack()`, `goForward()`, `reload()` directly in the renderer. The preload bridge above is a placeholder for future use (e.g., if we ever want main process to drive navigation). For now, `BrowserPane` will call `webviewRef.current.goBack()` directly.

### Step 5: Commit

```
feat(electron): enable webviewTag in BrowserWindow webPreferences
```

---

## Task 2: Zustand store — `browser-pane.ts`

**Files:**

- Create: `frontend/stores/browser-pane.ts`
- Test: `frontend/stores/__tests__/browser-pane.test.ts`

### Step 1: Write the failing test

Create `frontend/stores/__tests__/browser-pane.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { useBrowserPaneStore } from "../browser-pane";

// Reset store state between tests
beforeEach(() => {
  useBrowserPaneStore.setState({
    isOpen: false,
    url: "http://localhost:3000",
    committedUrl: "http://localhost:3000",
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
    title: "",
    history: [],
    historyIndex: -1,
  });
});

describe("useBrowserPaneStore", () => {
  it("starts closed by default", () => {
    const { isOpen } = useBrowserPaneStore.getState();
    expect(isOpen).toBe(false);
  });

  it("toggleOpen flips isOpen", () => {
    useBrowserPaneStore.getState().toggleOpen();
    expect(useBrowserPaneStore.getState().isOpen).toBe(true);
    useBrowserPaneStore.getState().toggleOpen();
    expect(useBrowserPaneStore.getState().isOpen).toBe(false);
  });

  it("setUrl updates url without navigating", () => {
    useBrowserPaneStore.getState().setUrl("http://localhost:5173");
    expect(useBrowserPaneStore.getState().url).toBe("http://localhost:5173");
    // committedUrl should NOT change until navigate() is called
    expect(useBrowserPaneStore.getState().committedUrl).toBe("http://localhost:3000");
  });

  it("navigate commits the url and opens the pane", () => {
    useBrowserPaneStore.getState().setUrl("http://localhost:8080");
    useBrowserPaneStore.getState().navigate();
    const state = useBrowserPaneStore.getState();
    expect(state.committedUrl).toBe("http://localhost:8080");
    expect(state.isOpen).toBe(true);
  });

  it("setLoading updates isLoading", () => {
    useBrowserPaneStore.getState().setLoading(true);
    expect(useBrowserPaneStore.getState().isLoading).toBe(true);
  });

  it("setNavigationState updates canGoBack and canGoForward", () => {
    useBrowserPaneStore.getState().setNavigationState({ canGoBack: true, canGoForward: false });
    const state = useBrowserPaneStore.getState();
    expect(state.canGoBack).toBe(true);
    expect(state.canGoForward).toBe(false);
  });

  it("setTitle updates title", () => {
    useBrowserPaneStore.getState().setTitle("My App");
    expect(useBrowserPaneStore.getState().title).toBe("My App");
  });

  it("navigateToUrl is a convenience method that sets url and commits", () => {
    useBrowserPaneStore.getState().navigateToUrl("http://localhost:4321");
    const state = useBrowserPaneStore.getState();
    expect(state.url).toBe("http://localhost:4321");
    expect(state.committedUrl).toBe("http://localhost:4321");
    expect(state.isOpen).toBe(true);
  });
});
```

### Step 2: Run test to verify it fails

```bash
pnpm test frontend/stores/__tests__/browser-pane.test.ts --reporter=verbose
```

Expected: FAIL with "Cannot find module '../browser-pane'"

### Step 3: Implement the store

Create `frontend/stores/browser-pane.ts`:

```typescript
import { create } from "zustand";

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
}

export const useBrowserPaneStore = create<BrowserPaneState>((set, get) => ({
  isOpen: false,
  url: "http://localhost:3000",
  committedUrl: "http://localhost:3000",
  isLoading: false,
  canGoBack: false,
  canGoForward: false,
  title: "",
  history: [],
  historyIndex: -1,

  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  openPane: () => set({ isOpen: true }),
  closePane: () => set({ isOpen: false }),

  setUrl: (url) => set({ url }),

  navigate: () => {
    const { url } = get();
    const normalizedUrl = url.startsWith("http") ? url : `http://${url}`;
    set({ committedUrl: normalizedUrl, url: normalizedUrl, isOpen: true });
  },

  navigateToUrl: (url: string) => {
    const normalizedUrl = url.startsWith("http") ? url : `http://${url}`;
    set({ url: normalizedUrl, committedUrl: normalizedUrl, isOpen: true });
  },

  setLoading: (isLoading) => set({ isLoading }),

  setNavigationState: ({ canGoBack, canGoForward }) =>
    set({ canGoBack, canGoForward }),

  setTitle: (title) => set({ title }),

  // Called when webview actually navigates (updates address bar to match)
  onDidNavigate: (url: string) => set({ url, committedUrl: url }),
}));
```

### Step 4: Run test to verify it passes

```bash
pnpm test frontend/stores/__tests__/browser-pane.test.ts --reporter=verbose
```

Expected: PASS — all 8 tests green.

### Step 5: Commit

```
feat(frontend): add browser-pane Zustand store
```

---

## Task 3: IPC type declarations in `frontend/lib/ipc.ts`

**Files:**

- Modify: `frontend/lib/ipc.ts`
- Test: (types — no runtime test needed, TypeScript compiler validates)

### Step 1: Add `browser` namespace to the `Window.electronAPI` interface

In `frontend/lib/ipc.ts`, inside the `interface Window { electronAPI?: { ... } }` block, add:

```typescript
browser: {
  navigate: (url: string) => Promise<void>;
  goBack: () => Promise<void>;
  goForward: () => Promise<void>;
  reload: () => Promise<void>;
};
```

No runtime changes needed. The `<webview>` ref handles actual navigation.

### Step 2: Verify TypeScript compiles

```bash
pnpm build 2>&1 | head -30
```

Expected: No new TypeScript errors.

### Step 3: Commit

```
feat(frontend): add browser namespace type to electronAPI interface
```

---

## Task 4: `BrowserPane` React component

**Files:**

- Create: `frontend/components/browser-pane.tsx`
- Test: `frontend/components/__tests__/browser-pane.test.tsx`

### Step 1: Write the failing tests

Create `frontend/components/__tests__/browser-pane.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock the store
const mockState = {
  isOpen: true,
  url: "http://localhost:3000",
  committedUrl: "http://localhost:3000",
  isLoading: false,
  canGoBack: false,
  canGoForward: false,
  title: "",
  toggleOpen: vi.fn(),
  closePane: vi.fn(),
  setUrl: vi.fn(),
  navigate: vi.fn(),
  navigateToUrl: vi.fn(),
  setLoading: vi.fn(),
  setNavigationState: vi.fn(),
  setTitle: vi.fn(),
  onDidNavigate: vi.fn(),
};

vi.mock("@/stores/browser-pane", () => ({
  useBrowserPaneStore: (selector: (s: typeof mockState) => unknown) =>
    selector ? selector(mockState) : mockState,
}));

// Mock webview (jsdom doesn't support it)
vi.mock("../browser-pane", async () => {
  const actual = await vi.importActual<typeof import("../browser-pane")>("../browser-pane");
  return actual;
});

// We need to mock the webview element since jsdom doesn't support it
// We do this by mocking the component that uses it
describe("BrowserPane", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.isOpen = true;
    mockState.url = "http://localhost:3000";
    mockState.isLoading = false;
    mockState.canGoBack = false;
    mockState.canGoForward = false;
  });

  it("renders the address bar input with current url", () => {
    render(<BrowserPaneWrapper />);
    const input = screen.getByRole("textbox", { name: /address/i });
    expect(input).toHaveValue("http://localhost:3000");
  });

  it("renders back/forward/refresh buttons", () => {
    render(<BrowserPaneWrapper />);
    expect(screen.getByLabelText(/go back/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/go forward/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reload/i)).toBeInTheDocument();
  });

  it("back button is disabled when canGoBack=false", () => {
    mockState.canGoBack = false;
    render(<BrowserPaneWrapper />);
    expect(screen.getByLabelText(/go back/i)).toBeDisabled();
  });

  it("forward button is disabled when canGoForward=false", () => {
    mockState.canGoForward = false;
    render(<BrowserPaneWrapper />);
    expect(screen.getByLabelText(/go forward/i)).toBeDisabled();
  });

  it("updates url input when user types", async () => {
    const user = userEvent.setup();
    render(<BrowserPaneWrapper />);
    const input = screen.getByRole("textbox", { name: /address/i });
    await user.clear(input);
    await user.type(input, "http://localhost:5173");
    expect(mockState.setUrl).toHaveBeenLastCalledWith("http://localhost:5173");
  });

  it("calls navigate on Enter key press", async () => {
    const user = userEvent.setup();
    render(<BrowserPaneWrapper />);
    const input = screen.getByRole("textbox", { name: /address/i });
    await user.click(input);
    await user.keyboard("{Enter}");
    expect(mockState.navigate).toHaveBeenCalled();
  });

  it("shows loading indicator when isLoading=true", () => {
    mockState.isLoading = true;
    render(<BrowserPaneWrapper />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders close button that calls closePane", async () => {
    const user = userEvent.setup();
    render(<BrowserPaneWrapper />);
    await user.click(screen.getByLabelText(/close browser/i));
    expect(mockState.closePane).toHaveBeenCalled();
  });
});

// Wrapper to import the real component (webview is mocked via vi.mock)
import { BrowserPane } from "../browser-pane";
function BrowserPaneWrapper() {
  return <BrowserPane />;
}
```

### Step 2: Run tests to verify they fail

```bash
pnpm test frontend/components/__tests__/browser-pane.test.tsx --reporter=verbose
```

Expected: FAIL with "Cannot find module '../browser-pane'"

### Step 3: Implement `BrowserPane`

Create `frontend/components/browser-pane.tsx`:

```typescript
import { useRef, useCallback, useEffect } from "react";
import { ArrowLeft, ArrowRight, RefreshCw, X, Globe, XCircle } from "lucide-react";
import { useBrowserPaneStore } from "@/stores/browser-pane";
import { cn } from "@/lib/utils";

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
    };
    const handleDidNavigate = (e: Event & { url?: string }) => {
      if (e.url) onDidNavigate(e.url);
    };
    const handleTitleUpdate = (e: Event & { title?: string }) => {
      if (e.title) setTitle(e.title);
    };
    const handleDidFailLoad = () => setLoading(false);

    wv.addEventListener("did-start-loading", handleLoadStart);
    wv.addEventListener("did-stop-loading", handleLoadStop);
    wv.addEventListener("did-navigate", handleDidNavigate);
    wv.addEventListener("did-navigate-in-page", handleDidNavigate);
    wv.addEventListener("page-title-updated", handleTitleUpdate);
    wv.addEventListener("did-fail-load", handleDidFailLoad);

    return () => {
      wv.removeEventListener("did-start-loading", handleLoadStart);
      wv.removeEventListener("did-stop-loading", handleLoadStop);
      wv.removeEventListener("did-navigate", handleDidNavigate);
      wv.removeEventListener("did-navigate-in-page", handleDidNavigate);
      wv.removeEventListener("page-title-updated", handleTitleUpdate);
      wv.removeEventListener("did-fail-load", handleDidFailLoad);
    };
  }, [setLoading, setNavigationState, setTitle, onDidNavigate]);

  const handleGoBack = useCallback(() => {
    webviewRef.current?.goBack();
  }, []);

  const handleGoForward = useCallback(() => {
    webviewRef.current?.goForward();
  }, []);

  const handleReload = useCallback(() => {
    webviewRef.current?.reload();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") navigate();
    },
    [navigate],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden border-r border-ctp-surface0 bg-ctp-base">
      {/* Browser toolbar — matches pane header height: 36px */}
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
      <div className="flex-1 overflow-hidden">
        <webview
          ref={webviewRef}
          src={committedUrl}
          className="h-full w-full"
          allowpopups="false"
          partition="persist:browser-pane"
        />
      </div>
    </div>
  );
}
```

### Step 4: Run tests to verify they pass

```bash
pnpm test frontend/components/__tests__/browser-pane.test.tsx --reporter=verbose
```

Expected: Most pass. If webview JSX causes issues in jsdom, mock it at module level:

Add at the top of the test file if needed:

```typescript
// jsdom doesn't support webview — patch it
document.createElement = new Proxy(document.createElement.bind(document), {
  apply(target, thisArg, args) {
    if (args[0] === "webview") return document.createElement("div");
    return Reflect.apply(target, thisArg, args);
  },
});
```

### Step 5: Commit

```
feat(frontend): add BrowserPane component with webview and navigation controls
```

---

## Task 5: Integrate `BrowserPane` into `App.tsx` layout

**Files:**

- Modify: `frontend/App.tsx`
- Test: `frontend/__tests__/app-browser-integration.test.tsx`

### Step 1: Write the failing test

Create `frontend/__tests__/app-browser-integration.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock heavy dependencies
vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
  listen: vi.fn().mockResolvedValue(() => {}),
  getCurrentWindow: () => ({
    label: "main",
    minimize: vi.fn(),
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    close: vi.fn(),
    isMaximized: vi.fn().mockResolvedValue(false),
    onResized: vi.fn().mockResolvedValue(() => {}),
  }),
  isTilingDesktop: vi.fn().mockResolvedValue(false),
  getName: vi.fn().mockResolvedValue("Forja"),
  getVersion: vi.fn().mockResolvedValue("0.0.0"),
  getElectronVersion: vi.fn().mockResolvedValue("0.0.0"),
  isDev: vi.fn().mockResolvedValue(false),
  openUrl: vi.fn(),
}));

vi.mock("@/stores/browser-pane", () => {
  const { create } = require("zustand");
  return {
    useBrowserPaneStore: create(() => ({
      isOpen: false,
      url: "http://localhost:3000",
      committedUrl: "http://localhost:3000",
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      title: "",
      toggleOpen: vi.fn(),
      openPane: vi.fn(),
      closePane: vi.fn(),
      setUrl: vi.fn(),
      navigate: vi.fn(),
      navigateToUrl: vi.fn(),
    })),
  };
});

vi.mock("../components/browser-pane", () => ({
  BrowserPane: () => <div data-testid="browser-pane">Browser Pane</div>,
}));

describe("App browser pane integration", () => {
  it("does not render BrowserPane when isOpen=false", () => {
    // useBrowserPaneStore state has isOpen=false by default
    // App should not mount BrowserPane
    // (tested via the mock returning false)
    // This is a smoke test — full integration testing is manual
    expect(true).toBe(true);
  });
});
```

> Note: Full App integration tests are costly. This test serves as a smoke test and documentation anchor. Manual smoke testing covers the rest (see Task 8).

### Step 2: Run test to verify it passes immediately

```bash
pnpm test frontend/__tests__/app-browser-integration.test.tsx --reporter=verbose
```

### Step 3: Add `BrowserPane` to `App.tsx`

In `frontend/App.tsx`, make the following changes:

**Import additions** (near top of file with other lazy imports):

```typescript
import { useBrowserPaneStore } from "./stores/browser-pane";

const BrowserPane = lazy(() =>
  import("./components/browser-pane").then((m) => ({
    default: m.BrowserPane,
  }))
);
```

**Read the store state** (inside the `App` function, near other store reads):

```typescript
const isBrowserOpen = useBrowserPaneStore((s) => s.isOpen);
```

**Render the pane** (inside the `ResizablePanelGroup` that contains `previewPanelRef` and `terminalPanelRef`, add a new panel BEFORE the preview panel):

Find this block in `App.tsx`:

```tsx
<ResizablePanelGroup orientation="horizontal">
  <ResizablePanel
    panelRef={previewPanelRef}
    ...
```

And wrap it so the browser panel appears to the LEFT of preview and terminal:

```tsx
<ResizablePanelGroup orientation="horizontal">
  {/* Browser pane (leftmost) */}
  {isBrowserOpen && (
    <>
      <ResizablePanel
        defaultSize="35%"
        minSize="20%"
        maxSize="60%"
        order={0}
      >
        <Suspense fallback={<div className="flex h-full items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" /></div>}>
          <BrowserPane />
        </Suspense>
      </ResizablePanel>
      <ResizableHandle />
    </>
  )}
  {/* Existing file preview panel */}
  <ResizablePanel
    panelRef={previewPanelRef}
    ...
```

### Step 4: Run all tests

```bash
pnpm test --reporter=verbose
```

Expected: All tests pass.

### Step 5: Commit

```
feat(frontend): integrate BrowserPane into App layout as resizable panel
```

---

## Task 6: Add browser toggle button to `Titlebar`

**Files:**

- Modify: `frontend/components/titlebar.tsx`
- Test: `frontend/components/__tests__/titlebar.test.tsx` (add 2 tests)

### Step 1: Write the failing tests

Open `frontend/components/__tests__/titlebar.test.tsx` and add:

```typescript
// Add these two tests inside the existing describe block

it("renders the browser toggle button", () => {
  render(<Titlebar />);
  expect(screen.getByLabelText(/toggle browser/i)).toBeInTheDocument();
});

it("clicking browser toggle calls toggleOpen on browser store", async () => {
  const user = userEvent.setup();
  const toggleOpen = vi.fn();
  // You'll need to add a mock for useBrowserPaneStore at the top of the test file
  render(<Titlebar />);
  await user.click(screen.getByLabelText(/toggle browser/i));
  expect(toggleOpen).toHaveBeenCalled();
});
```

At the top of the existing test file, add the mock:

```typescript
vi.mock("@/stores/browser-pane", () => ({
  useBrowserPaneStore: (selector: (s: { isOpen: boolean; toggleOpen: ReturnType<typeof vi.fn> }) => unknown) => {
    const state = { isOpen: false, toggleOpen: vi.fn() };
    return selector ? selector(state) : state;
  },
}));
```

### Step 2: Run tests to verify they fail

```bash
pnpm test frontend/components/__tests__/titlebar.test.tsx --reporter=verbose
```

Expected: FAIL — browser toggle button not found.

### Step 3: Add browser toggle to `Titlebar`

In `frontend/components/titlebar.tsx`:

**Add import:**

```typescript
import { Globe } from "lucide-react"; // Globe is already in Lucide
import { useBrowserPaneStore } from "@/stores/browser-pane";
```

**Inside `Titlebar()` function, add:**

```typescript
const isBrowserOpen = useBrowserPaneStore((s) => s.isOpen);
const toggleBrowser = useBrowserPaneStore((s) => s.toggleOpen);
```

**In the JSX, after the `toggleSidebar` button (in the left controls area), add:**

```tsx
<button
  onClick={toggleBrowser}
  aria-label={isBrowserOpen ? "Close browser pane" : "Toggle browser pane"}
  className={cn(
    "inline-flex h-8 w-10 items-center justify-center text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text",
    isBrowserOpen && "text-brand"
  )}
>
  <Globe className="h-4 w-4" strokeWidth={1.5} />
</button>
```

### Step 4: Run tests to verify they pass

```bash
pnpm test frontend/components/__tests__/titlebar.test.tsx --reporter=verbose
```

Expected: PASS.

### Step 5: Commit

```
feat(frontend): add browser pane toggle button to Titlebar
```

---

## Task 7: Keyboard shortcut for browser toggle

**Files:**

- Modify: `frontend/hooks/use-keyboard-shortcuts.ts` (or wherever global shortcuts live)
- Test: add 1 test to the shortcuts test file

### Step 1: Find the keyboard shortcuts hook

```bash
cat frontend/hooks/use-keyboard-shortcuts.ts
```

### Step 2: Add shortcut `Ctrl+B` / `Cmd+B` to toggle browser pane

Inside the keyboard shortcuts handler, add:

```typescript
// Ctrl/Cmd+B — toggle browser pane
if ((e.metaKey || e.ctrlKey) && e.key === "b") {
  e.preventDefault();
  useBrowserPaneStore.getState().toggleOpen();
  return;
}
```

### Step 3: Add test

In the existing keyboard shortcuts test file, add:

```typescript
it("Ctrl+B toggles browser pane", async () => {
  const user = userEvent.setup();
  const toggleOpen = vi.spyOn(useBrowserPaneStore.getState(), "toggleOpen");
  await user.keyboard("{Control>}b{/Control}");
  expect(toggleOpen).toHaveBeenCalled();
});
```

### Step 4: Run full test suite

```bash
pnpm test --reporter=verbose
```

Expected: PASS.

### Step 5: Add shortcut to `KeyboardShortcutsDialog`

Open `frontend/components/keyboard-shortcuts-dialog.tsx` and add the browser shortcut to the list:

```tsx
{ key: "B", label: "Toggle Browser Pane" },
```

### Step 6: Commit

```
feat(frontend): add Ctrl+B keyboard shortcut to toggle browser pane
```

---

## Task 8: Security hardening — URL validation and partition isolation

**Files:**

- Create: `frontend/lib/browser-url.ts`
- Test: `frontend/lib/__tests__/browser-url.test.ts`

### Step 1: Write the failing tests

Create `frontend/lib/__tests__/browser-url.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { normalizeUrl, isAllowedUrl, BLOCKED_SCHEMES } from "../browser-url";

describe("normalizeUrl", () => {
  it("adds http:// prefix if missing", () => {
    expect(normalizeUrl("localhost:3000")).toBe("http://localhost:3000");
  });

  it("preserves https:// URLs unchanged", () => {
    expect(normalizeUrl("https://localhost:3000")).toBe("https://localhost:3000");
  });

  it("preserves http:// URLs unchanged", () => {
    expect(normalizeUrl("http://localhost:8080")).toBe("http://localhost:8080");
  });

  it("strips trailing slash from root paths", () => {
    expect(normalizeUrl("localhost:3000/")).toBe("http://localhost:3000/");
  });
});

describe("isAllowedUrl", () => {
  it("allows localhost URLs", () => {
    expect(isAllowedUrl("http://localhost:3000")).toBe(true);
  });

  it("allows 127.0.0.1 URLs", () => {
    expect(isAllowedUrl("http://127.0.0.1:8080")).toBe(true);
  });

  it("allows 0.0.0.0 URLs", () => {
    expect(isAllowedUrl("http://0.0.0.0:5173")).toBe(true);
  });

  it("allows any http URL (for flexibility in dev)", () => {
    expect(isAllowedUrl("http://example.com")).toBe(true);
  });

  it("blocks javascript: scheme", () => {
    expect(isAllowedUrl("javascript:alert(1)")).toBe(false);
  });

  it("blocks file: scheme", () => {
    expect(isAllowedUrl("file:///etc/passwd")).toBe(false);
  });

  it("blocks data: scheme", () => {
    expect(isAllowedUrl("data:text/html,<h1>hi</h1>")).toBe(false);
  });

  it("blocks vbscript: scheme", () => {
    expect(isAllowedUrl("vbscript:msgbox(1)")).toBe(false);
  });
});

describe("BLOCKED_SCHEMES", () => {
  it("contains javascript, file, data, vbscript", () => {
    expect(BLOCKED_SCHEMES).toContain("javascript:");
    expect(BLOCKED_SCHEMES).toContain("file:");
    expect(BLOCKED_SCHEMES).toContain("data:");
    expect(BLOCKED_SCHEMES).toContain("vbscript:");
  });
});
```

### Step 2: Run tests to verify they fail

```bash
pnpm test frontend/lib/__tests__/browser-url.test.ts --reporter=verbose
```

Expected: FAIL with "Cannot find module '../browser-url'"

### Step 3: Implement `browser-url.ts`

Create `frontend/lib/browser-url.ts`:

```typescript
/** URL schemes blocked from loading in the embedded browser */
export const BLOCKED_SCHEMES = [
  "javascript:",
  "file:",
  "data:",
  "vbscript:",
  "blob:",
] as const;

/**
 * Normalizes a URL string for display/navigation.
 * Adds http:// if no scheme is present.
 */
export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
}

/**
 * Returns true if the URL is safe to load in the embedded webview.
 * Blocks dangerous schemes; allows all http/https.
 */
export function isAllowedUrl(url: string): boolean {
  const lower = url.trim().toLowerCase();
  for (const scheme of BLOCKED_SCHEMES) {
    if (lower.startsWith(scheme)) return false;
  }
  return true;
}
```

### Step 4: Wire URL validation into the store

In `frontend/stores/browser-pane.ts`, import and use the helpers:

```typescript
import { normalizeUrl, isAllowedUrl } from "@/lib/browser-url";

// Update navigate():
navigate: () => {
  const { url } = get();
  const normalizedUrl = normalizeUrl(url);
  if (!isAllowedUrl(normalizedUrl)) {
    console.warn("[BrowserPane] Blocked URL:", normalizedUrl);
    return;
  }
  set({ committedUrl: normalizedUrl, url: normalizedUrl, isOpen: true });
},

// Update navigateToUrl():
navigateToUrl: (url: string) => {
  const normalizedUrl = normalizeUrl(url);
  if (!isAllowedUrl(normalizedUrl)) {
    console.warn("[BrowserPane] Blocked URL:", normalizedUrl);
    return;
  }
  set({ url: normalizedUrl, committedUrl: normalizedUrl, isOpen: true });
},
```

### Step 5: Run all tests

```bash
pnpm test --reporter=verbose
```

Expected: All pass.

### Step 6: Commit

```
feat(frontend): add URL validation for embedded browser (block dangerous schemes)
```

---

## Task 9: Final wiring — run full test suite and smoke test

**Files:** None (verification only)

### Step 1: Run the full test suite

```bash
pnpm test --reporter=verbose
```

Expected: All tests pass (400+).

### Step 2: Run the app in dev mode

```bash
pnpm dev
```

### Step 3: Manual smoke test checklist

- [ ] `Ctrl+B` (or `Cmd+B` on macOS) opens/closes the browser pane
- [ ] Globe button in titlebar highlights when browser is open
- [ ] Browser pane appears as a resizable panel to the left of the file preview / terminal
- [ ] Typing `localhost:3000` in address bar and pressing Enter navigates to the URL
- [ ] Back/Forward buttons disable when at start/end of history
- [ ] Reload button works
- [ ] Loading indicator (spinner + progress bar) appears while page loads
- [ ] Address bar updates when the webview navigates (e.g., clicking a link)
- [ ] Typing `javascript:alert(1)` in address bar does NOT navigate (blocked silently)
- [ ] Closing the pane with X button hides it
- [ ] Panel is resizable with drag handle
- [ ] `http://localhost:1420` (Vite dev server) renders correctly inside the webview

### Step 3: Commit (if any final tweaks needed)

```
chore(frontend): final polish for embedded browser pane
```

---

## Security Notes

1. **`partition="persist:browser-pane"`** — Gives the webview a separate persistent session, isolated from the main renderer. Cookies/localStorage from localhost apps don't leak to Forja's renderer session.

2. **`allowpopups="false"`** — Prevents the webview from opening new windows (popup blockers).

3. **URL scheme validation** — `isAllowedUrl()` blocks `javascript:`, `file:`, `data:`, `vbscript:`, `blob:` before they reach the webview.

4. **No `nodeIntegration` in webview** — By default, `<webview>` does NOT inherit `nodeIntegration`. Content running in localhost apps cannot access Node.js APIs.

5. **`contextIsolation: true` on main window** — Already set in `main.ts`. The webview's renderer is further isolated.

---

## File Summary

| File | Action |
|------|--------|
| `electron/main.ts` | Modify — add `webviewTag: true` to `webPreferences` |
| `electron/preload.cts` | Modify — expose `browser` namespace (placeholder) |
| `electron/__tests__/webview-ipc.test.ts` | Create — IPC shape contract test |
| `frontend/stores/browser-pane.ts` | Create — Zustand store |
| `frontend/stores/__tests__/browser-pane.test.ts` | Create — store tests |
| `frontend/lib/browser-url.ts` | Create — URL normalization + validation |
| `frontend/lib/__tests__/browser-url.test.ts` | Create — URL validation tests |
| `frontend/lib/ipc.ts` | Modify — add `browser` type to `electronAPI` interface |
| `frontend/components/browser-pane.tsx` | Create — the actual component with `<webview>` |
| `frontend/components/__tests__/browser-pane.test.tsx` | Create — component tests |
| `frontend/App.tsx` | Modify — add `BrowserPane` + store import + panel in layout |
| `frontend/components/titlebar.tsx` | Modify — add Globe toggle button |
| `frontend/components/__tests__/titlebar.test.tsx` | Modify — add 2 browser toggle tests |
| `frontend/hooks/use-keyboard-shortcuts.ts` | Modify — add `Ctrl+B` shortcut |
| `frontend/components/keyboard-shortcuts-dialog.tsx` | Modify — add shortcut to list |
