import { ArrowRight, ChevronDown } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/shared/ui'

export interface ComposerRecipient {
  id: string
  label: string
}

export interface ComposerProps {
  recipients: ComposerRecipient[]
  recipientId: string
  onRecipientChange: (id: string) => void
  featureLabel: string
  targetLabel: string
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
  recipients,
  recipientId,
  onRecipientChange,
  featureLabel,
  targetLabel,
  value,
  onChange,
  onSend,
  placeholder,
  recipientLabel = 'Recipient',
  contextLabel = 'Context',
  sendLabel = 'Send',
  shortcutHint = 'Ctrl+Enter to send',
}: ComposerProps) {
  const selected = recipients.find((item) => item.id === recipientId)

  return (
    <form
      className="space-y-3 rounded-[4px] border border-border bg-background p-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (value.trim()) onSend()
      }}
    >
      <div className="flex items-center justify-between border-b border-border pb-2 text-[11px]">
        <div className="flex items-center gap-3">
          <Select value={recipientId} onValueChange={onRecipientChange}>
            <SelectTrigger
              size="sm"
              aria-label={recipientLabel}
              className="h-6 gap-1.5 rounded-[2px] border-border bg-secondary px-2 text-[12px] text-foreground"
            >
              <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
              <SelectValue>{selected?.label}</SelectValue>
              <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
            </SelectTrigger>
            <SelectContent>
              {recipients.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground">
            {contextLabel}: <strong className="font-normal text-foreground">{featureLabel}</strong>
          </span>
        </div>
        <span className="text-muted-foreground">{targetLabel}</span>
      </div>
      <Textarea
        aria-label={placeholder}
        value={value}
        placeholder={placeholder}
        rows={2}
        className="min-h-[44px] resize-none border-0 bg-transparent p-0 text-[13px] text-foreground shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && value.trim()) {
            event.preventDefault()
            onSend()
          }
        }}
      />
      <div className="flex items-center justify-between border-t border-border/50 pt-2">
        <span className="text-[11px] text-muted-foreground">{shortcutHint}</span>
        <button
          type="submit"
          disabled={!value.trim()}
          className="flex h-7 items-center gap-1.5 rounded-[3px] bg-primary px-3 text-[12px] font-semibold text-primary-foreground disabled:opacity-50"
        >
          {sendLabel}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </form>
  )
}
