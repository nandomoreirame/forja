import { Terminal } from 'lucide-react'
import { CollapsedToolbar } from '@/widgets/terminal'
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui'
import { getDictionary } from '@/shared/i18n'
import { useWorkbench } from '@/renderer/src/entities/feature'
import type { FeatureSnapshot } from '@/renderer/src/shared/api'
import { toolbarItems } from './model'

export function TerminalFooterToolbar({ feature }: { feature?: FeatureSnapshot }) {
  const state = useWorkbench((s) => s)
  const d = getDictionary(state.source.locale)
  const a = d.app
  const open = state.panels.terminal
  return (
    <>
      {feature?.terminals.length ? (
        <CollapsedToolbar
          compact
          className=""
          items={toolbarItems(feature, d)}
          label={a.backgroundTerminals}
          expandLabel={a.expandTerminals}
          detailLabels={{
            agent: a.terminalAgent,
            command: a.terminalCommand,
            directory: a.terminalDirectory,
            hint: a.terminalHint,
          }}
          onExpand={(id) => state.openTerminal(feature.id, id)}
        />
      ) : null}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={a.terminals}
            aria-pressed={open}
            onClick={() => state.togglePanel('terminal')}
            className="shrink-0"
          >
            <Terminal className={open ? 'text-primary' : undefined} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">{a.terminals}</TooltipContent>
      </Tooltip>
    </>
  )
}
