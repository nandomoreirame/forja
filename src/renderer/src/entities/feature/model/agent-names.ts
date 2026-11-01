import { getDictionary, type Locale } from '@/shared/i18n'
import { agentIds, type AgentId } from '@/renderer/src/shared/api'

export { agentIds, type AgentId }

export function agentName(
  id: AgentId,
  locale: Locale,
  custom: Partial<Record<AgentId, string>>,
): string {
  return custom[id]?.trim() || getDictionary(locale).agentNames[id]
}
