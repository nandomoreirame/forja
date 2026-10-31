import type { Locale } from '@/shared/i18n'
export function detectLocale(language = navigator.language): Locale {
  return language.toLowerCase().startsWith('pt') ? 'pt-br' : 'en'
}
