import { useState } from 'react'
import { BookOpen, Brain, Plus } from 'lucide-react'
import { NavigatorSection, PaneRow, rowButton } from './section'
import { getDictionary, type Locale } from '@/shared/i18n'
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogTrigger,
  StatusBadge,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/shared/ui'
import { cn } from '@/shared/ui/utils'
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
  const Icon = kind === 'skill' ? BookOpen : Brain
  const newLabel = kind === 'skill' ? a.newSkill : a.newMemory
  return (
    <NavigatorSection
      section={kind === 'skill' ? 'skills' : 'memories'}
      title={kind === 'skill' ? a.skills : a.memories}
      count={items.length}
      defaultSize="15%"
      defaultOpen={false}
      empty={a.libraryEmpty}
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={newLabel}
                  className="size-5 [&_svg]:size-4"
                >
                  <Plus aria-hidden="true" />
                </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent>{newLabel}</TooltipContent>
          </Tooltip>
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
      }
    >
      {items.map((item) => (
        <PaneRow
          key={item.id}
          hover={
            <StatusBadge size="sm" state="draft">
              {item.scope === 'project' ? a.projectScopeLabel : a.globalScopeLabel}
            </StatusBadge>
          }
        >
          <button
            type="button"
            className={cn(rowButton, 'pl-5')}
            onClick={() => {
              setError(false)
              void state.openDocument(item.id).catch(() => setError(true))
            }}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            <span className="min-w-0 truncate">{item.name}</span>
          </button>
        </PaneRow>
      ))}
      {error && (
        <p role="alert" className="pl-5 text-[12px] text-destructive">
          {a.documentError}
        </p>
      )}
    </NavigatorSection>
  )
}
