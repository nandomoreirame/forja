import { Folder } from 'lucide-react'
import { getDictionary } from '@/shared/i18n'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui'
import { useWorkbench } from '@/renderer/src/entities/feature'
import { displayPath } from '@/renderer/src/shared/lib/display-path'

export function ProjectSwitcher() {
  const state = useWorkbench((s) => s)
  const project = state.snapshot?.project
  const a = getDictionary(state.source.locale).app
  // Without a project the same button reads "No project" and opens the project picker.
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={project ? `${project.name}, ${a.switchProject}` : a.noProject}
          onClick={() => state.openPalette('recent')}
          className="flex h-6 min-w-0 items-center gap-1.5 rounded-[3px] px-1.5 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Folder className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span className={project ? 'truncate font-mono' : 'truncate'}>
            {project ? displayPath(project.path) : a.noProject}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{a.recent} (Ctrl+R)</TooltipContent>
    </Tooltip>
  )
}
