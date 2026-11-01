const collapsedTerminal = (value: string) => {
  try {
    const layout: unknown = JSON.parse(value)
    return Boolean(
      layout && typeof layout === 'object' && (layout as Record<string, unknown>).terminal === 0,
    )
  } catch {
    return false
  }
}

// Layout sizes are a per-viewer convenience; storage can be unavailable (private mode, tests).
export const layoutStorage = {
  getItem(key: string) {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem(key: string, value: string) {
    // A terminal panel dragged closed must reopen at its last real size, as in VS Code.
    if (collapsedTerminal(value)) return
    try {
      localStorage.setItem(key, value)
    } catch {
      // Keep the in-memory layout when storage is unavailable.
    }
  },
}
