import {
  Button,
  Kbd,
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
  sendLabel = 'Send',
  shortcutHint = 'Ctrl+Enter',
}: ComposerProps) {
  const selected = recipients.find((item) => item.id === recipientId)

  return (
    <form
      className="grid gap-2 rounded-lg border border-border bg-card p-2"
      onSubmit={(event) => {
        event.preventDefault()
        if (value.trim()) onSend()
      }}
    >
      <Textarea
        aria-label={placeholder}
        value={value}
        placeholder={placeholder}
        rows={2}
        className="min-h-12 resize-none border-0 bg-transparent px-1 text-[13px] shadow-none focus-visible:ring-0"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && value.trim()) {
            event.preventDefault()
            onSend()
          }
        }}
      />
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Select value={recipientId} onValueChange={onRecipientChange}>
          <SelectTrigger size="sm" aria-label={recipientLabel} className="h-7 text-[12px]">
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
        <span className="min-w-0 flex-1 truncate">
          {featureLabel} · {targetLabel}
        </span>
        <Kbd>{shortcutHint}</Kbd>
        <Button type="submit" size="sm" disabled={!value.trim()}>
          {sendLabel}
        </Button>
      </div>
    </form>
  )
}
