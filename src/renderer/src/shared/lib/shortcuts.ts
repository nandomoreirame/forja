import { useEffect, useLayoutEffect, useRef } from 'react'
export function useShortcuts(map: Record<string, () => void>) {
  const actions = useRef(map)
  useLayoutEffect(() => {
    actions.current = map
  }, [map])
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
      if (editable && key !== 'ctrl+shift+p') {
        if (key === 'ctrl+r' && actions.current[key]) event.preventDefault()
        return
      }
      if (!event.metaKey && actions.current[key]) {
        event.preventDefault()
        actions.current[key]()
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [])
}
