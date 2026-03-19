# Plan: Browser Find-in-Page

**Priority:** High
**Date:** 2026-03-19

---

## 1. Overview and Motivation

Forja's integrated browser pane (`BrowserPane`) uses Electron's `<webview>` tag. The webview supports `findInPage()` / `stopFindInPage()` APIs, but this functionality has not been exposed to the user.

Without find-in-page, users cannot search for text in documentation, localhost apps, or any web content — a fundamental browser feature. This plan implements a native search toolbar overlay in `BrowserPane`, accessible via `Ctrl+F`.

---

## 2. Current State Analysis

### `frontend/components/browser-pane.tsx`

- Uses `Electron.WebviewTag` via a `ref`
- Has a `webviewRef = useRef<Electron.WebviewTag | null>(null)`
- Already handles `did-stop-loading`, `did-navigate`, `did-fail-load`, etc.
- Keyboard handling only in the URL bar (`handleKeyDown` for Enter to navigate)
- No find-in-page logic anywhere

### Electron WebviewTag API

The webview element exposes:
```ts
webviewRef.current.findInPage(text: string, options?: FindInPageOptions): number
// options: { forward?, findNext?, matchCase?, wordStart?, medialCapitalAsWordStart? }

webviewRef.current.stopFindInPage(action: 'clearSelection' | 'keepSelection' | 'activateSelection'): void
```

It also emits the `found-in-page` event:
```ts
wv.addEventListener('found-in-page', (e) => {
  // e.result: { requestId, activeMatchOrdinal, matches, selectionArea, finalUpdate }
})
```

### IPC

The `webview` element is in the renderer process, so `findInPage` can be called directly on the ref — **no IPC call to main process is needed**. The search happens entirely in the renderer.

### Current keyboard handling

The main `App.tsx` or a global keyboard hook handles global shortcuts. The browser pane currently receives keyboard focus via `paneFocusRegistry`. A `Ctrl+F` handler needs to be captured inside `BrowserPane` when it's focused, or globally when a browser pane is the active block.

---

## 3. Step-by-Step Implementation Plan

### Step 1: Add find-in-page state to `BrowserPane`

Add local state for the find toolbar:

```ts
const [findOpen, setFindOpen] = useState(false);
const [findQuery, setFindQuery] = useState("");
const [findResults, setFindResults] = useState<{ active: number; total: number } | null>(null);
const findInputRef = useRef<HTMLInputElement | null>(null);
```

**File:** `frontend/components/browser-pane.tsx`

### Step 2: Handle `found-in-page` webview event

When the webview emits `found-in-page`, update `findResults`:

```ts
const handleFoundInPage = (e: Event & { result?: { activeMatchOrdinal: number; matches: number } }) => {
  if (e.result) {
    setFindResults({ active: e.result.activeMatchOrdinal, total: e.result.matches });
  }
};

// In the webview events useEffect:
wv.addEventListener('found-in-page', handleFoundInPage);
// cleanup:
wv.removeEventListener('found-in-page', handleFoundInPage);
```

**File:** `frontend/components/browser-pane.tsx`

### Step 3: Implement `triggerFind` and `closeFindBar` functions

```ts
const triggerFind = useCallback((query: string, forward = true, findNext = false) => {
  const wv = webviewRef.current;
  if (!wv || !query.trim()) return;
  wv.findInPage(query, { forward, findNext });
}, []);

const closeFindBar = useCallback(() => {
  webviewRef.current?.stopFindInPage('clearSelection');
  setFindOpen(false);
  setFindQuery("");
  setFindResults(null);
}, []);
```

**File:** `frontend/components/browser-pane.tsx`

### Step 4: React to find query changes

Use a `useEffect` to trigger search when `findQuery` changes:

```ts
useEffect(() => {
  if (!findOpen || !findQuery.trim()) {
    if (!findQuery.trim() && findOpen) {
      webviewRef.current?.stopFindInPage('clearSelection');
      setFindResults(null);
    }
    return;
  }
  triggerFind(findQuery, true, false);
}, [findQuery, findOpen, triggerFind]);
```

**File:** `frontend/components/browser-pane.tsx`

### Step 5: Add Ctrl+F keyboard handler

Capture `Ctrl+F` inside the BrowserPane component. Use a `keydown` listener on the pane container div (with `tabIndex={-1}` so it can receive focus):

```tsx
const handlePaneKeyDown = useCallback((e: React.KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "f") {
    e.preventDefault();
    e.stopPropagation();
    setFindOpen(true);
    // Focus the find input after state update
    requestAnimationFrame(() => findInputRef.current?.focus());
  }
}, []);
```

Also handle keyboard events inside the find toolbar input:

```tsx
const handleFindKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "Enter") {
    e.preventDefault();
    triggerFind(findQuery, !e.shiftKey, true); // Shift+Enter = previous
  }
  if (e.key === "Escape") {
    closeFindBar();
  }
}, [findQuery, triggerFind, closeFindBar]);
```

**File:** `frontend/components/browser-pane.tsx`

### Step 6: Render the find toolbar overlay

Add the find toolbar as an absolutely positioned overlay at the top-right of the webview container, appearing only when `findOpen`:

```tsx
{/* Find-in-page toolbar */}
{findOpen && (
  <div
    className="absolute right-2 top-2 z-10 flex items-center gap-1.5 rounded-md border border-ctp-surface1 bg-overlay-mantle px-2 py-1 shadow-lg"
    role="search"
    aria-label="Find in page"
  >
    <input
      ref={findInputRef}
      type="text"
      value={findQuery}
      onChange={(e) => setFindQuery(e.target.value)}
      onKeyDown={handleFindKeyDown}
      placeholder="Find..."
      className="w-44 rounded bg-ctp-surface0 px-2 py-1 text-app-sm text-ctp-text outline-none placeholder:text-ctp-overlay0 focus:ring-1 focus:ring-brand"
      aria-label="Search text"
    />
    {findResults !== null && (
      <span className="text-app-sm text-ctp-overlay1 tabular-nums">
        {findResults.total === 0
          ? "No results"
          : `${findResults.active} / ${findResults.total}`}
      </span>
    )}
    <button
      onClick={() => triggerFind(findQuery, false, true)}
      aria-label="Previous match"
      className="inline-flex h-6 w-6 items-center justify-center rounded text-ctp-overlay1 hover:bg-ctp-surface0 hover:text-ctp-text"
      disabled={!findQuery.trim()}
    >
      <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.5} />
    </button>
    <button
      onClick={() => triggerFind(findQuery, true, true)}
      aria-label="Next match"
      className="inline-flex h-6 w-6 items-center justify-center rounded text-ctp-overlay1 hover:bg-ctp-surface0 hover:text-ctp-text"
      disabled={!findQuery.trim()}
    >
      <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
    </button>
    <button
      onClick={closeFindBar}
      aria-label="Close find bar"
      className="inline-flex h-6 w-6 items-center justify-center rounded text-ctp-overlay1 hover:bg-ctp-surface0 hover:text-ctp-text"
    >
      <X className="h-3.5 w-3.5" strokeWidth={1.5} />
    </button>
  </div>
)}
```

Position: `absolute right-2 top-2` within the `relative flex-1 overflow-hidden` webview container div.

**File:** `frontend/components/browser-pane.tsx`

### Step 7: Auto-focus find input when toolbar opens

In the `useEffect` that manages `findOpen`:

```ts
useEffect(() => {
  if (findOpen) {
    requestAnimationFrame(() => findInputRef.current?.focus());
  }
}, [findOpen]);
```

**File:** `frontend/components/browser-pane.tsx`

### Step 8: Close find bar when webview navigates away

In `handleDidNavigate`, close the find bar:

```ts
const handleDidNavigate = (e: Event & { url?: string }) => {
  // ... existing logic ...
  closeFindBar(); // reset find bar on navigation
};
```

**File:** `frontend/components/browser-pane.tsx`

---

## 4. Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `frontend/components/browser-pane.tsx` | Modify | Add find state, toolbar UI, keyboard handlers, webview event listener |

No IPC changes needed — `webview.findInPage()` is a renderer-side API.

**New imports needed:**
- `ChevronUp`, `ChevronDown` from `lucide-react` (X already imported)

---

## 5. Test Strategy

### Component tests

**`frontend/components/__tests__/browser-pane.test.tsx`:**

Note: `webview` is an Electron-specific element not available in jsdom. Tests will mock the `webviewRef` and `webview` element behavior.

- `Ctrl+F` opens the find toolbar (sets `findOpen` to true)
- Find toolbar renders with input, prev/next buttons, close button
- `Escape` key in find input closes the toolbar
- `Enter` in find input calls `findInPage` on the webview mock
- `Shift+Enter` calls `findInPage` with `forward: false`
- Clicking the close button calls `stopFindInPage('clearSelection')`
- Result count renders correctly: "3 / 10", "No results" for 0
- Find bar closes when `closeFindBar` is called
- Find bar auto-focuses input when opened

### Manual testing checklist

- [ ] Open browser pane, navigate to any page
- [ ] Press `Ctrl+F` — find toolbar appears at top-right
- [ ] Type in the search box — matches are highlighted
- [ ] Match count updates as you type (e.g., "3 / 15")
- [ ] `Enter` moves to next match; `Shift+Enter` moves to previous
- [ ] Click chevron buttons for next/previous
- [ ] `Escape` closes the toolbar and clears highlights
- [ ] Navigating to a new URL closes the find bar
- [ ] Empty query shows no results indicator

---

## 6. Acceptance Criteria

- [ ] `Ctrl+F` (and `Cmd+F` on macOS) opens the find toolbar in any focused browser pane
- [ ] The find toolbar appears at the top-right of the webview area, not overlapping the navigation bar
- [ ] As the user types, the webview highlights all matches in real time
- [ ] The toolbar shows match position: "N / M" (or "No results")
- [ ] `Enter` advances to the next match
- [ ] `Shift+Enter` goes to the previous match
- [ ] `Escape` closes the toolbar and clears all highlights
- [ ] Navigation to a new URL automatically closes the find toolbar
- [ ] The toolbar is fully accessible (ARIA labels on all controls)
- [ ] All new tests pass; existing browser-pane tests continue to pass
