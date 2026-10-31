import { getDictionary } from '@/shared/i18n'
import { roleIds, type RoleId } from '@/renderer/src/shared/api'

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
