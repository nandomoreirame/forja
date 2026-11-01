import { getDictionary } from '@/shared/i18n'
import { agentIds, roleIds, type AgentId, type RoleId } from '@/renderer/src/shared/api'

const normalize = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const aliases = new Map<string, RoleId>(
  roleIds.flatMap(
    (role) =>
      [
        [role, role],
        [normalize(getDictionary('pt-br').product[role]), role],
      ] as [string, RoleId][],
  ),
)

export function mentionedRoles(text: string): RoleId[] {
  const prose = normalize(text)
    .replace(/(^|\n)[ \t]*(`{3,}|~{3,})[^`\n]*\n[\s\S]*?(?:\n[ \t]*\2[ \t]*(?=\n|$)|$)/g, '$1 ')
    .replace(/(`+)[\s\S]*?\1/g, ' ')
  return Array.from(prose.matchAll(/(?:^|\s)@([\p{L}\p{N}_]+)/gu)).flatMap((match) => {
    const role = aliases.get(match[1])
    return role ? [role] : []
  })
}

export function mentionedRole(text: string): RoleId | null {
  return mentionedRoles(text).at(-1) ?? null
}

// Forge names in both languages also name an agent, so `@minerador` and `@miner` both work.
const agentAliases = new Map<string, AgentId>([
  ...aliases,
  ...agentIds.flatMap((id) =>
    (['en', 'pt-br'] as const).map(
      (locale) => [normalize(getDictionary(locale).agentNames[id]), id] as [string, AgentId],
    ),
  ),
  ...agentIds.map((id) => [id, id] as [string, AgentId]),
])

/**
 * The agent the prompt hands its turn to: the last `@` mention outside code, matched by id,
 * role, forge name or the viewer's own names. Without a mention the chat phase decides.
 */
export function mentionedAgent(
  text: string,
  custom: Partial<Record<AgentId, string>> = {},
): AgentId | null {
  const names = new Map(agentAliases)
  for (const id of agentIds) {
    const name = custom[id]?.trim()
    if (name) names.set(normalize(name), id)
  }
  const prose = normalize(text)
    .replace(/(^|\n)[ \t]*(`{3,}|~{3,})[^`\n]*\n[\s\S]*?(?:\n[ \t]*\2[ \t]*(?=\n|$)|$)/g, '$1 ')
    .replace(/(`+)[\s\S]*?\1/g, ' ')
  const mentions = Array.from(prose.matchAll(/(?:^|\s)@([\p{L}\p{N}_]+)/gu)).flatMap((match) => {
    const agent = names.get(match[1])
    return agent ? [agent] : []
  })
  return mentions.at(-1) ?? null
}
