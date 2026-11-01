import { useId, useState, type ReactNode } from 'react'
import { Pencil, Play, Plus, Trash2 } from 'lucide-react'
import { agentName, useWorkbench } from '@/renderer/src/entities/feature'
import type { Demand } from '@/renderer/src/shared/api'
import { getDictionary } from '@/shared/i18n'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Input,
  Label,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui'

type Editing = { id?: string; title: string; description: string }

/** Demands waiting for research; starting one asks for confirmation first (REQ-117). */
export function BacklogPage() {
  const state = useWorkbench((s) => s)
  const t = getDictionary(state.source.locale).app.backlog
  const heading = useId()
  const titleId = useId()
  const descriptionId = useId()
  const [editing, setEditing] = useState<Editing | null>(null)
  const [starting, setStarting] = useState<Demand | null>(null)
  const demands = [...(state.snapshot?.demands ?? [])].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )
  const save = () => {
    if (!editing?.title.trim()) return
    if (editing.id) state.updateDemand(editing.id, editing)
    else state.addDemand(editing)
    setEditing(null)
  }
  return (
    <section aria-labelledby={heading} className="flex flex-col gap-4 p-6">
      <header className="flex items-center gap-3">
        <h1 id={heading} className="flex-1 text-lg font-semibold">
          {t.title}
        </h1>
        <Button size="sm" onClick={() => setEditing({ title: '', description: '' })}>
          <Plus aria-hidden="true" />
          {t.add}
        </Button>
      </header>
      {editing ? (
        <form
          className="space-y-3 rounded-md border border-border p-3"
          onSubmit={(event) => {
            event.preventDefault()
            save()
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor={titleId}>{t.titleLabel}</Label>
            <Input
              id={titleId}
              autoFocus
              value={editing.title}
              onChange={(event) => setEditing({ ...editing, title: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={descriptionId}>{t.descriptionLabel}</Label>
            <Textarea
              id={descriptionId}
              value={editing.description}
              onChange={(event) => setEditing({ ...editing, description: event.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!editing.title.trim()}>
              {t.save}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>
              {t.cancel}
            </Button>
          </div>
        </form>
      ) : null}
      {demands.length ? (
        <ul aria-label={t.title} className="divide-y divide-border rounded-md border border-border">
          {demands.map((demand) => (
            <li
              key={demand.id}
              aria-label={demand.title}
              className="flex items-center gap-3 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{demand.title}</p>
                {demand.description ? (
                  <p className="truncate text-xs text-muted-foreground">{demand.description}</p>
                ) : null}
              </div>
              <IconAction
                label={t.edit.replace('{title}', demand.title)}
                onClick={() =>
                  setEditing({
                    id: demand.id,
                    title: demand.title,
                    description: demand.description,
                  })
                }
              >
                <Pencil aria-hidden="true" />
              </IconAction>
              <IconAction
                label={t.remove.replace('{title}', demand.title)}
                onClick={() => state.removeDemand(demand.id)}
              >
                <Trash2 aria-hidden="true" />
              </IconAction>
              <Button size="sm" variant="outline" onClick={() => setStarting(demand)}>
                <Play aria-hidden="true" />
                {t.start}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      )}
      <Dialog open={starting !== null} onOpenChange={(open) => !open && setStarting(null)}>
        <DialogContent showCloseButton={false}>
          <DialogTitle>{t.confirmTitle.replace('{title}', starting?.title ?? '')}</DialogTitle>
          <DialogDescription>
            {t.confirmBody.replace(
              '{agent}',
              agentName('research', state.source.locale, state.agentNames),
            )}
          </DialogDescription>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                const demand = starting
                setStarting(null)
                if (demand) state.startDemand(demand.id)
              }}
            >
              {t.confirm}
            </Button>
            <Button variant="ghost" onClick={() => setStarting(null)}>
              {t.cancel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function IconAction({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label} onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
