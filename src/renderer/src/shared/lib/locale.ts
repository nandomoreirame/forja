import type { Locale } from '@/shared/i18n'
export function detectLocale(language = navigator.language): Locale {
  return language.toLowerCase().startsWith('pt') ? 'pt-br' : 'en'
}

const localeKey = 'forja.locale'

/** The language chosen in Settings, kept per viewer; storage can be unavailable. */
export function storedLocale(): Locale | undefined {
  try {
    const value = localStorage.getItem(localeKey)
    return value === 'en' || value === 'pt-br' ? value : undefined
  } catch {
    return undefined
  }
}

export function saveLocale(locale: Locale) {
  try {
    localStorage.setItem(localeKey, locale)
  } catch {
    // The choice still applies to this session.
  }
}
