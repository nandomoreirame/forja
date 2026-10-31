import { useEffect } from 'react'
export function useShortcuts(map: Record<string, () => void>) {
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.isComposing || event.repeat) return
      const key = [
        event.ctrlKey ? 'ctrl' : '',
        event.shiftKey ? 'shift' : '',
        event.altKey ? 'alt' : '',
        event.key.toLowerCase(),
      ]
        .filter(Boolean)
        .join('+')
      const target = event.target
      const editable =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          !!target.closest('input,textarea,select,[contenteditable="true"]'))
      if (editable && key !== 'ctrl+shift+p') return
      if (!event.metaKey && map[key]) {
        event.preventDefault()
        map[key]()
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [map])
}
