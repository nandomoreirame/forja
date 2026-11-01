import { useEffect, useRef } from 'react'
import { ArrowRight } from 'lucide-react'
import { Textarea } from '@/shared/ui'

const sendShortcut = 'Ctrl+Enter'

export interface ComposerProps {
  focusKey?: number
  autoFocus?: boolean
  featureLabel: string
  targetLabel: string
  targetPrefix?: string
  value: string
  onChange: (value: string) => void
  onSend: () => void
  placeholder: string
  contextLabel?: string
  sendLabel?: string
  shortcutHint?: string
}

export function Composer({
  autoFocus = false,
  focusKey,
  featureLabel,
  targetLabel,
  targetPrefix,
  value,
  onChange,
  onSend,
  placeholder,
  contextLabel = 'Context',
  sendLabel = 'Send',
  shortcutHint = 'Press Ctrl+Enter to send',
}: ComposerProps) {
  const field = useRef<HTMLTextAreaElement>(null)
  const previousFocusKey = useRef(focusKey)
  useEffect(() => {
    if (autoFocus || previousFocusKey.current !== focusKey) field.current?.focus()
    previousFocusKey.current = focusKey
  }, [autoFocus, focusKey])
  const [hintBefore, hintAfter] = shortcutHint.includes(sendShortcut)
    ? shortcutHint.split(sendShortcut, 2)
    : [shortcutHint, null]

  return (
    <form
      className="space-y-1.5 rounded-part border border-border bg-card p-2.5 shadow-2xl shadow-black/40 transition-colors focus-within:border-primary/70 motion-reduce:transition-none"
      onSubmit={(event) => {
        event.preventDefault()
        if (value.trim()) onSend()
      }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 text-[11px]">
        {/* min-h-7 keeps the header as tall as it was with the agent selector. */}
        <div className="flex min-h-7 items-center gap-3">
          <span className="truncate text-muted-foreground/80">
            {contextLabel}:{' '}
            <strong className="font-normal text-foreground/90">{featureLabel}</strong>
          </span>
        </div>
        <span className="truncate text-muted-foreground/70" title={targetLabel}>
          {targetPrefix ? `${targetPrefix}: ` : null}
          <span className="font-mono text-muted-foreground">{targetLabel}</span>
        </span>
      </div>
      <Textarea
        ref={field}
        aria-label={placeholder}
        value={value}
        placeholder={placeholder}
        rows={2}
        className="min-h-10 resize-none border-0 bg-transparent p-0 text-[13px] leading-5 text-foreground shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0 dark:bg-transparent"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && value.trim()) {
            event.preventDefault()
            onSend()
          }
        }}
      />
      <div className="flex items-center justify-between border-t border-border/60 pt-2">
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
          {hintBefore}
          {hintAfter !== null ? (
            <>
              <kbd className="rounded-[3px] border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {sendShortcut}
              </kbd>
              {hintAfter}
            </>
          ) : null}
        </span>
        <button
          type="submit"
          disabled={!value.trim()}
          className="flex h-6 items-center gap-1.5 rounded-[3px] bg-primary px-3 text-[12px] font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50 motion-reduce:transition-none"
        >
          {sendLabel}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </form>
  )
}
