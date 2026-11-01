import { useId, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/shared/ui'
import { formatMessageTime, getDictionary, type Locale } from '@/shared/i18n'

/** Messages kept verbatim before older ones are folded into the summary. */
export const summaryWindow = 50

export function ConversationSummary({
  locale,
  messageCount,
  summary,
  onSummarize,
  onClose,
}: {
  locale: Locale
  messageCount: number
  summary?: { text: string; createdAt: string }
  onSummarize: () => Promise<void>
  onClose: () => void
}) {
  const s = getDictionary(locale).app.summary
  const heading = useId()
  const [busy, setBusy] = useState(false)
  const context =
    summary && messageCount > summaryWindow
      ? s.contextWindow.replace('{limit}', String(summaryWindow))
      : s.context.replace('{count}', String(messageCount))
  return (
    <section
      aria-labelledby={heading}
      className="grid gap-2 rounded-md border border-border bg-card p-3 text-[12px]"
    >
      <div className="flex items-center gap-2">
        <h3 id={heading} className="text-[13px] font-semibold text-foreground">
          {s.title}
        </h3>
        <span className="text-muted-foreground">
          {summary
            ? s.updated.replace('{time}', formatMessageTime(summary.createdAt, locale))
            : s.empty}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              await onSummarize()
            } finally {
              setBusy(false)
            }
          }}
        >
          {s.summarizeNow}
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={s.close} onClick={onClose}>
          <X />
        </Button>
      </div>
      {summary ? <p className="text-foreground">{summary.text}</p> : null}
      <p className="text-muted-foreground">{s.explain.replace('{limit}', String(summaryWindow))}</p>
      <p className="text-muted-foreground">{context}</p>
    </section>
  )
}
