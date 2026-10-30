import { expect, it } from 'vitest'
import { en, ptBr, resolvePage, switchLocalePath } from '../../src/shared/i18n'

function leaves(value: unknown, prefix = ''): Array<[string, string]> {
  if (Array.isArray(value))
    return value.flatMap((item, index) => leaves(item, `${prefix}[${index}]`))
  if (value && typeof value === 'object')
    return Object.entries(value).flatMap(([key, child]) =>
      leaves(child, prefix ? `${prefix}.${key}` : key),
    )
  return [[prefix, String(value)]]
}

it('preserves the page across explicit locale switches and rejects unknown paths', () => {
  expect(resolvePage('/')).toEqual({ locale: 'en', page: 'landing' })
  expect(resolvePage('/pt-br/styleguide/')).toEqual({ locale: 'pt-br', page: 'styleguide' })
  expect(switchLocalePath('/styleguide', 'pt-br')).toBe('/pt-br/styleguide')
  expect(switchLocalePath('/pt-br', 'en')).toBe('/')
  expect(resolvePage('/unknown')).toBeNull()
})

it('keeps the pt-BR dictionary key-for-key identical to English, including array shape', () => {
  expect(leaves(ptBr).map(([path]) => path)).toEqual(leaves(en).map(([path]) => path))
})

it('keeps every visible copy value non-empty in both locales', () => {
  for (const dictionary of [en, ptBr])
    for (const [path, value] of leaves(dictionary))
      expect(value.trim().length, path).toBeGreaterThan(0)
})
