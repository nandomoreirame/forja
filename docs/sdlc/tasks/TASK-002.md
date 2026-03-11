# TASK-002: Implement Browser Screenshot to Clipboard

**Story:** US-002
**PRD:** PRD-002
**ADR:** ADR-002
**Status:** In Progress
**Estimated:** 2h

---

## Subtasks

### TASK-002-1: IPC Handler (electron/main.ts)

Add `browser:screenshot` handler:
- Import `clipboard, webContents` from electron
- Accept `{ webContentsId: number }` as args
- Call `webContents.fromId(id)?.capturePage()`
- Write result with `clipboard.writeImage(image)`
- Return `{ success: true }`

### TASK-002-2: Preload exposure (electron/preload.cts)

Add to `browser` contextBridge object:
```typescript
screenshot: (webContentsId: number) => ipcRenderer.invoke("browser:screenshot", { webContentsId }),
```

### TASK-002-3: IPC abstraction (frontend/lib/ipc.ts)

Add to `electronAPI` window interface:
```typescript
browser: {
  // existing...
  screenshot: (webContentsId: number) => Promise<{ success: boolean }>;
}
```

Add exported function:
```typescript
export function screenshotBrowser(webContentsId: number): Promise<{ success: boolean }>
```

### TASK-002-4: Camera button (frontend/components/browser-pane.tsx)

- Import `Camera, Check` from lucide-react
- Add `screenshotState` state: `'idle' | 'success' | 'error'`
- Add `handleScreenshot` callback:
  - Gets `webContentsId` from `webviewRef.current.getWebContentsId()`
  - Calls `invoke("browser:screenshot", { webContentsId })`
  - On success: set state to 'success', setTimeout 2000ms to reset to 'idle'
  - On error: console.error, reset to 'idle'
- Add button in toolbar between loading indicator area and close button:
  - aria-label="Take screenshot"
  - Shows `Camera` icon normally, `Check` icon on success
  - Green color on success

### TASK-002-5: Tests

Update `frontend/components/__tests__/browser-pane.test.tsx`:
- Add `screenshot: vi.fn().mockResolvedValue({ success: true })` to mockState
- Test: renders camera button
- Test: camera button calls `invoke` with correct args
- Test: feedback state shows success icon

## Files Modified

| File | Type |
|------|------|
| `electron/main.ts` | Modified - add IPC handler |
| `electron/preload.cts` | Modified - expose screenshot |
| `frontend/lib/ipc.ts` | Modified - add screenshotBrowser() |
| `frontend/components/browser-pane.tsx` | Modified - add button |
| `frontend/components/__tests__/browser-pane.test.tsx` | Modified - add tests |

## Definition of Done

- [ ] All new tests pass
- [ ] All existing tests pass
- [ ] Camera button renders in toolbar
- [ ] Screenshot copied to clipboard on click
- [ ] 2s success feedback implemented
- [ ] TypeScript compiles without errors
