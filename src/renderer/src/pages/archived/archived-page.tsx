import { useId } from 'react'
import { useWorkbench } from '@/renderer/src/entities/feature'
import { getDictionary } from '@/shared/i18n'
import { Button } from '@/shared/ui'

export function ArchivedPage() {
  const state = useWorkbench((s) => s)
  const a = getDictionary(state.source.locale).app
  const heading = useId()
  const snapshot = state.snapshot!
  const groups = [
    {
      kind: 'feature' as const,
      title: a.chats,
      items: snapshot.features.filter((f) => f.archived),
    },
    {
      kind: 'spec' as const,
      title: a.specs,
      items: snapshot.artifacts.filter((f) => f.kind === 'spec' && f.archived),
    },
    {
      kind: 'plan' as const,
      title: a.plans,
      items: snapshot.artifacts.filter((f) => f.kind === 'plan' && f.archived),
    },
  ]
  return (
    <section aria-labelledby={heading} className="flex flex-col gap-6 p-6">
      <h1 id={heading} className="text-lg font-semibold">
        {a.archived}
      </h1>
      {groups.every((group) => !group.items.length) && (
        <p className="text-muted-foreground">{a.archivedEmpty}</p>
      )}
      {groups.map((group) => (
        <div key={group.kind}>
          <h2 className="mb-2 text-sm font-semibold">{group.title}</h2>
          <ul>
            {group.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 border-b border-border py-2"
              >
                <span className="min-w-0 truncate">{item.name}</span>
                <Button
                  variant="ghost"
                  aria-label={`${a.restore} ${item.name}`}
                  onClick={() => state.restoreItem({ kind: group.kind, id: item.id })}
                >
                  {a.restore}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
