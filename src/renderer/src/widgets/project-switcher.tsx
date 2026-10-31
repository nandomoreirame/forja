import { Folder } from 'lucide-react'
import { getDictionary } from '@/shared/i18n'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui'
import { useWorkbench } from '@/renderer/src/entities/feature'

export function ProjectSwitcher() {
  const state = useWorkbench((s) => s)
  const project = state.snapshot?.project
  if (!project) return null
  const a = getDictionary(state.source.locale).app
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`${project.name}, ${a.switchProject}`}
          onClick={() => state.openPalette('recent')}
          className="flex min-w-0 items-center gap-2 rounded-sm px-1 py-0.5 text-xs hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Folder className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span className="truncate font-semibold">{project.name}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{a.projectActions}</TooltipContent>
    </Tooltip>
  )
}
