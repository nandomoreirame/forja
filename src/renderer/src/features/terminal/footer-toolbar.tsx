import { CollapsedToolbar } from '@/widgets/terminal'
import { getDictionary } from '@/shared/i18n'
import { useWorkbench } from '@/renderer/src/entities/feature'
import type { FeatureSnapshot } from '@/renderer/src/shared/api'
import { toolbarItems } from './model'

export function TerminalFooterToolbar({ feature }: { feature: FeatureSnapshot }) {
  const state = useWorkbench((s) => s)
  const d = getDictionary(state.source.locale)
  const a = d.app
  return (
    <CollapsedToolbar
      className="border-t"
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
  )
}
