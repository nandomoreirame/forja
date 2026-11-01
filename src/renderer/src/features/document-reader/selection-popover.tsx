import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/shared/ui'

export interface SelectionPopoverProps {
  selection: { text: string; rect: DOMRect } | null
  label: string
  onReview: (text: string) => void
}

export function SelectionPopover({ selection, label, onReview }: SelectionPopoverProps) {
  if (!selection || selection.text.trim().length < 3) return null
  return (
    <Button
      type="button"
      size="sm"
      className="fixed z-50 -translate-y-full shadow-lg"
      style={{ left: Math.max(0, selection.rect.left), top: Math.max(36, selection.rect.top) }}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onReview(selection.text)}
    >
      {label}
    </Button>
  )
}

export function DocumentSelection({
  children,
  label,
  onReview,
}: {
  children: ReactNode
  label: string
  onReview: (text: string) => void
}) {
  const body = useRef<HTMLDivElement>(null)
  const [selection, setSelection] = useState<SelectionPopoverProps['selection']>(null)
  useEffect(() => {
    const read = () => {
      const selected = window.getSelection()
      const range = selected?.rangeCount ? selected.getRangeAt(0) : null
      const text = selected?.toString().trim() ?? ''
      return selected &&
        !selected.isCollapsed &&
        range &&
        text.length >= 3 &&
        body.current?.contains(range.startContainer) &&
        body.current.contains(range.endContainer)
        ? { text, rect: range.getBoundingClientRect() }
        : null
    }
    const update = () => setSelection(read())
    // Scroll and resize only move a visible popover; they never reopen a dismissed one.
    const reposition = () => setSelection((current) => (current ? read() : null))
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelection(null)
    }
    document.addEventListener('selectionchange', update)
    document.addEventListener('keydown', dismiss)
    document.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      document.removeEventListener('selectionchange', update)
      document.removeEventListener('keydown', dismiss)
      document.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [])
  return (
    <>
      <div ref={body}>{children}</div>
      <SelectionPopover
        selection={selection}
        label={label}
        onReview={(text) => {
          setSelection(null)
          onReview(text)
        }}
      />
    </>
  )
}
