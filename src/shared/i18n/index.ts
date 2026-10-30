import { en } from './en'
import { ptBr } from './pt-br'
import { resolvePage, switchLocalePath, paths } from './routes'
import type { Locale, Page } from './routes'
export { en, ptBr, resolvePage, switchLocalePath, paths }
export type { Locale, Page }
export type Dictionary = typeof en
export function getDictionary(locale: Locale): Dictionary {
  return (locale === 'en' ? en : ptBr) as unknown as Dictionary
}
