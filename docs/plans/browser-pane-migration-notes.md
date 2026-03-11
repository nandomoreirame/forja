# Browser Pane — Current Constraints and Migration Notes

**Date:** 2026-03-11
**Status:** Active — minimal mitigation applied; full migration deferred.

---

## 1. Current Architecture

The Browser Pane is an embedded browser inside the Forja window, used to preview
local dev servers (e.g. `http://localhost:3000`) while the AI agent works in the
terminal. It renders a native Electron `<webview>` element.

### Key files

| File | Role |
|------|------|
| `frontend/components/browser-pane.tsx` | React component wrapping `<webview>` |
| `frontend/stores/browser-pane.ts` | Zustand state (URL, isOpen, loading, error, per-project) |
| `frontend/lib/browser-url.ts` | URL normalisation and allowlist validation |
| `electron/main.ts` | `webviewTag: true`, `browser:screenshot` IPC handler, `will-attach-webview` guard |

### Mount lifecycle (before this task)

`BrowserPane` was mounted conditionally in `App.tsx`:

```tsx
{isBrowserOpen ? <BrowserPane /> : <FilePreviewPane />}
```

Because the parent renders `BrowserPane` only when `isOpen === true` in the store,
the webview was already being created and destroyed with the pane. However:

- The `<webview>` element was rendered immediately on the first render cycle,
  potentially blocking paint.
- Store-side transient state (`isLoading`, `canGoBack`, `canGoForward`) was not
  reset on unmount, so a stale loading spinner could reappear on the next open.
- No `will-attach-webview` guard existed, meaning a compromised renderer could
  theoretically mount a webview with `nodeIntegration: true` or a malicious
  preload script.

---

## 2. Costs and Operational Risks of `<webview>`

### Memory cost

Each `<webview>` creates a **separate Chromium renderer process** via Electron's
out-of-process frame mechanism. On a modern machine this adds roughly:

- 30–80 MB resident memory for the webview renderer process.
- Additional GPU process memory if the page uses WebGL/Canvas.
- The `persist:browser-pane` partition keeps a separate network session and
  cookie store alive for the lifetime of the Electron app.

Because `BrowserPane` is only mounted when `isOpen === true`, the additional
renderer process is destroyed when the pane is closed. This is the correct
behaviour and it was already working before this task.

### CPU cost

- Any JavaScript running inside the webview executes in a separate process, so
  it does not directly compete with the main renderer for CPU time.
- However, if the webview loads a page that polls heavily (e.g. a hot-reload dev
  server with many WebSocket reconnects), it consumes CPU in the background
  Chromium process even when Forja's main window is not focused.

### Security risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Renderer mounts webview with `nodeIntegration: true` | High | `will-attach-webview` guard strips preload and forces `nodeIntegration: false` |
| Renderer loads `file://` or `javascript:` URLs in the webview | Medium | `browser-url.ts` allowlist (`isAllowedUrl`) blocks non-HTTP/HTTPS schemes before `committedUrl` is set |
| Webview opens a new window or external navigation | Low | `allowpopups="false"` attribute on the `<webview>` element |
| Screenshot IPC exposes any WebContents by numeric ID | Medium | Only the webview's own `getWebContentsId()` is sent to the main process; the screenshot handler validates the ID exists |

### Electron API stability

Electron's `<webview>` tag is considered **legacy** in the official documentation.
The recommended replacement is `WebContentsView` (available since Electron 30).
The Electron team has not announced removal of `<webview>` but discourages new
usage. The tag requires `webviewTag: true` in `webPreferences`, which slightly
widens the renderer's surface area.

---

## 3. Minimal Mitigation Applied (this task)

### 3.1 Lazy webview mount

The `<webview>` element is now deferred by one animation frame using
`requestAnimationFrame`. This allows the React tree to paint the toolbar and
loading skeleton before Electron begins the expensive webview initialisation:

```tsx
// Mount guard — defers <webview> creation by one frame
const [webviewMounted, setWebviewMounted] = useState(false);

useEffect(() => {
  const id = requestAnimationFrame(() => setWebviewMounted(true));
  return () => cancelAnimationFrame(id);
}, []);

// In JSX:
{webviewMounted && (
  <webview ref={webviewRef} src={committedUrl} ... />
)}
```

### 3.2 Aggressive store reset on unmount

A dedicated cleanup effect resets transient navigation state when `BrowserPane`
unmounts, ensuring the next open cycle starts fresh:

```tsx
useEffect(() => {
  return () => {
    useBrowserPaneStore.getState().setLoading(false);
    useBrowserPaneStore.getState().setNavigationState({ canGoBack: false, canGoForward: false });
  };
}, []);
```

### 3.3 Event listener wiring gated on `webviewMounted`

The effect that wires webview DOM events now depends on `webviewMounted`, so it
runs only after the element exists in the DOM. This prevents a potential
`null` dereference race on the first render.

### 3.4 `will-attach-webview` security guard in `main.ts`

A `web-contents-created` listener now enforces security policy on every webview
before it is attached:

```ts
app.on("web-contents-created", (_event, contents) => {
  contents.on("will-attach-webview", (_e, webPreferences) => {
    delete webPreferences.preload;          // strip renderer-supplied preloads
    webPreferences.nodeIntegration = false; // deny Node.js access
    webPreferences.contextIsolation = true; // enforce context isolation
  });
});
```

---

## 4. Current Use of Browser Pane in the Product

The Browser Pane is used exclusively as a **local dev-server preview**. Users
open it from the command palette or toolbar to view a running web app (typically
`http://localhost:PORT`) alongside the terminal where the AI agent is working.

It is **not** used for:

- Displaying external web pages (though technically possible via the address bar)
- Rendering documentation or markdown (that is handled by the FilePreviewPane)
- Any form of persistent authenticated session tied to user accounts

Because the use case is narrowly scoped to localhost preview, the webview's
separate-process memory cost is acceptable as long as it is only alive when
`isOpen === true`.

---

## 5. Future Migration Plan: `webview` → `WebContentsView`

### Why migrate

| Concern | Current (`<webview>`) | Target (`WebContentsView`) |
|---------|----------------------|---------------------------|
| API status | Legacy, discouraged | Modern, recommended |
| Process model | Separate renderer process (automatic) | Explicit `WebContentsView` attached to `BrowserWindow` |
| Control | Limited (DOM API only) | Full main-process control |
| Security | `webviewTag: true` required | No special flag needed |
| Performance | Fixed overhead per webview | Same (still separate process), but easier to manage lifecycle |

### Migration approach

1. **Main process**: Create a `WebContentsView` lazily when the browser pane
   opens (IPC: `browser:open`) and attach it to the current `BrowserWindow`.
   Detach and destroy it on `browser:close`.

2. **Main process**: Resize the `WebContentsView` bounds whenever the panel
   resizes (IPC: `browser:resize` with `{ x, y, width, height }`).

3. **Renderer**: Replace `<webview>` with an empty `<div>` placeholder that
   reports its bounding rect via `ResizeObserver` and `getBoundingClientRect()`,
   then sends `browser:resize` to the main process.

4. **IPC channels needed**:
   - `browser:open` → create and show `WebContentsView`
   - `browser:close` → hide and destroy `WebContentsView`
   - `browser:navigate` → `wc.loadURL(url)`
   - `browser:resize` → `view.setBounds({ x, y, width, height })`
   - `browser:goBack`, `browser:goForward`, `browser:reload` → navigation
   - `browser:getTitle`, `browser:getUrl` → pushed as events to renderer
   - `browser:screenshot` → already exists, no change

5. **Concern — Z-order**: `WebContentsView` sits on top of the renderer. Any
   React overlay (tooltip, dialog) that needs to appear over the browser area
   will be occluded. This is a known limitation and must be handled by
   temporarily hiding the `WebContentsView` when overlays are open.

### When to migrate

The migration is **not blocked** but **deferred** because:

- The current `<webview>` implementation is stable and fully tested.
- The per-pane open/close lifecycle already limits memory overhead.
- The `WebContentsView` approach requires non-trivial IPC choreography for
  resize synchronisation and Z-order management.
- No current user-visible issue justifies the scope expansion right now.

**Recommended trigger for migration**: When Electron drops support for
`webviewTag`, or when the product needs to display the browser pane alongside
a React overlay (e.g. a chat bubble that floats over the preview area).

---

## 6. Test Coverage

| Test file | What is covered |
|-----------|-----------------|
| `frontend/components/__tests__/browser-pane.test.tsx` | Component render, toolbar buttons, address bar, loading state, error overlay, screenshot IPC |
| `frontend/stores/__tests__/browser-pane.test.ts` | Store actions: navigate, error, per-project state save/restore |
| `electron/__tests__/main-security.test.ts` | URL scheme validation, binary name validation, `will-attach-webview` policy simulation |
