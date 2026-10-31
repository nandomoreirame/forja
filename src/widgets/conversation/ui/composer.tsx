import { useEffect, useRef } from 'react'
import { ArrowRight } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/shared/ui'

const sendShortcut = 'Ctrl+Enter'

export interface ComposerRecipient {
  id: string
  label: string
}

export interface ComposerProps {
  autoFocus?: boolean
  recipients: ComposerRecipient[]
  recipientId: string
  onRecipientChange: (id: string) => void
  featureLabel: string
  targetLabel: string
  targetPrefix?: string
  value: string
  onChange: (value: string) => void
  onSend: () => void
  placeholder: string
  recipientLabel?: string
  contextLabel?: string
  sendLabel?: string
  shortcutHint?: string
}

export function Composer({
  autoFocus = false,
  recipients,
  recipientId,
  onRecipientChange,
  featureLabel,
  targetLabel,
  targetPrefix,
  value,
  onChange,
  onSend,
  placeholder,
  recipientLabel = 'Recipient',
  contextLabel = 'Context',
  sendLabel = 'Send',
  shortcutHint = 'Press Ctrl+Enter to send',
}: ComposerProps) {
  const field = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (autoFocus) field.current?.focus()
  }, [autoFocus])
  const selected = recipients.find((item) => item.id === recipientId)
  const [hintBefore, hintAfter] = shortcutHint.includes(sendShortcut)
    ? shortcutHint.split(sendShortcut, 2)
    : [shortcutHint, null]

  return (
    <form
      className="space-y-2.5 rounded-xl border border-border bg-card p-3.5 shadow-2xl shadow-black/40 transition-colors focus-within:border-primary/70 motion-reduce:transition-none"
      onSubmit={(event) => {
        event.preventDefault()
        if (value.trim()) onSend()
      }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 text-[11px]">
        <div className="flex items-center gap-3">
          <Select value={recipientId} onValueChange={onRecipientChange}>
            <SelectTrigger
              size="sm"
              aria-label={recipientLabel}
              className="h-6 gap-1.5 rounded-[3px] border-transparent bg-transparent px-1.5 text-[12px] font-medium text-foreground hover:border-border hover:bg-secondary dark:bg-transparent dark:hover:bg-secondary data-[state=open]:border-border data-[state=open]:bg-secondary [&_svg:not([class*='size-'])]:size-3.5"
            >
              <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
              <SelectValue>{selected?.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {recipients.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        rows={3}
        className="min-h-[72px] resize-none border-0 bg-transparent p-0 text-[13px] leading-5 text-foreground shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0 dark:bg-transparent"
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
