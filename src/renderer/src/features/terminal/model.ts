import type { TerminalTab, ToolbarItem } from '@/widgets/terminal'
import type { FeatureSnapshot, MockTerminal } from '@/renderer/src/shared/api'
import type { getDictionary } from '@/shared/i18n'

type Dictionary = ReturnType<typeof getDictionary>

export function terminalTabState(terminal: MockTerminal): TerminalTab['state'] {
  if (terminal.state === 'running') return 'running'
  if (terminal.state === 'completed') return 'done'
  return 'idle'
}

export function terminalStateLabel(terminal: MockTerminal, d: Dictionary): string {
  if (terminal.kind === 'shell' && terminal.state === 'draft') return d.app.idle
  return terminal.state === 'interrupted' ? d.app.stopped : d.app.states[terminal.state]
}

export function selectedTerminal(
  feature: FeatureSnapshot | undefined,
  tabs: Record<string, string>,
): MockTerminal | undefined {
  if (!feature) return undefined
  return (
    feature.terminals.find((terminal) => terminal.id === tabs[feature.id]) ?? feature.terminals[0]
  )
}

export function toolbarItems(feature: FeatureSnapshot, d: Dictionary): ToolbarItem[] {
  return feature.terminals.map((terminal) => ({
    id: terminal.id,
    label: terminal.label,
    state: terminalTabState(terminal),
    stateLabel: terminalStateLabel(terminal, d),
    detail: {
      agent: terminal.agent ? d.product[terminal.agent] : undefined,
      command: terminal.command,
      dir: terminal.cwd ?? feature.worktree ?? feature.destination,
    },
  }))
}
