import { getDictionary, type Locale } from '@/shared/i18n'
import { roleIds } from '@/renderer/src/shared/api'

export const agentIds = ['smith', ...roleIds] as const
export type AgentId = (typeof agentIds)[number]

export function agentName(
  id: AgentId,
  locale: Locale,
  custom: Partial<Record<AgentId, string>>,
): string {
  return custom[id]?.trim() || getDictionary(locale).agentNames[id]
}
