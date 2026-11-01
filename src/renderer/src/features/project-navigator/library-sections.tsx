import { useState } from 'react'
import { NavigatorSection } from './section'
import { getDictionary, type Locale } from '@/shared/i18n'
import {
  Button,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
  StatusBadge,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/shared/ui'
import { useWorkbench } from '@/renderer/src/entities/feature'
import type { LibraryKind } from '@/renderer/src/shared/api'

export function SkillsSection({ locale }: { locale: Locale }) {
  return <LibrarySection locale={locale} kind="skill" />
}

export function MemoriesSection({ locale }: { locale: Locale }) {
  return <LibrarySection locale={locale} kind="memory" />
}

function LibrarySection({ locale, kind }: { locale: Locale; kind: LibraryKind }) {
  const state = useWorkbench((s) => s)
  const a = getDictionary(locale).app
  const [open, setOpen] = useState(false)
  const [error, setError] = useState(false)
  const items =
    kind === 'skill'
      ? state.snapshot!.skills
      : state.memories.map((memory) => ({
          id: `memory:${memory.id}`,
          name: memory.title,
          scope: memory.scope,
        }))
  return (
    <NavigatorSection
      section={kind === 'skill' ? 'skills' : 'memories'}
      title={kind === 'skill' ? a.skills : a.memories}
      count={items.length}
    >
      <div
        data-testid="section-scroll"
        className={`max-h-[16.5rem] shrink overflow-y-auto ${items.length ? 'min-h-16' : 'min-h-0'}`}
      >
        {items.map((item) => (
          <Tooltip key={item.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                onClick={() => {
                  setError(false)
                  void state.openDocument(item.id).catch(() => setError(true))
                }}
              >
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                <StatusBadge size="sm" state="draft">
                  {item.scope === 'project' ? a.projectScopeLabel : a.globalScopeLabel}
                </StatusBadge>
              </button>
            </TooltipTrigger>
            <TooltipContent>{item.name}</TooltipContent>
          </Tooltip>
        ))}
        {!items.length && <p className="py-1 text-muted-foreground">{a.libraryEmpty}</p>}
      </div>
      {error && <p role="alert">{a.documentError}</p>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="w-full py-1 text-left text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          >
            {kind === 'skill' ? a.newSkill : a.newMemory}
          </button>
        </DialogTrigger>
        <DialogContent showCloseButton={false}>
          <DialogTitle>{kind === 'skill' ? a.skillScope : a.memoryScope}</DialogTitle>
          <DialogDescription>{a.scopeDescription}</DialogDescription>
          <div className="flex gap-2">
            {(['project', 'global'] as const).map((scope) => (
              <Button
                key={scope}
                variant="outline"
                onClick={() => {
                  setOpen(false)
                  state.startAuthoring(kind, scope)
                }}
              >
                {scope === 'project' ? a.projectScope : a.globalScope}
              </Button>
            ))}
            <DialogClose asChild>
              <Button variant="ghost">{a.cancel}</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </NavigatorSection>
  )
}
