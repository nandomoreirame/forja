export interface ConversationMessage {
  id: string
  author: string
  role: 'user' | 'agent'
  text: string
}

export interface MessagesProps {
  items: ConversationMessage[]
  emptyLabel?: string
  label?: string
}

export function Messages({
  items,
  emptyLabel = 'No conversation in this feature.',
  label = 'Conversation',
}: MessagesProps) {
  if (items.length === 0)
    return <p className="px-3 py-6 text-[13px] text-muted-foreground">{emptyLabel}</p>

  return (
    <ol aria-label={label} className="grid gap-3 px-3 py-4">
      {items.map((item) => (
        <li
          key={item.id}
          className={item.role === 'user' ? 'justify-self-end max-w-[80%]' : 'max-w-[80%]'}
        >
          <p className="mb-0.5 text-[11px] text-muted-foreground">{item.author}</p>
          <p className="rounded-md border border-border bg-card px-3 py-2 text-[13px] leading-5 text-foreground">
            {item.text}
          </p>
        </li>
      ))}
    </ol>
  )
}
