import type { Locale } from '@/shared/i18n'
export function relativeTime(iso: string, locale: Locale, now: Date): string {
  const elapsed = new Date(iso).getTime() - now.getTime()
  const formatter = new Intl.RelativeTimeFormat(locale === 'pt-br' ? 'pt-BR' : 'en', {
    numeric: 'auto',
  })
  if (Math.abs(elapsed) >= 86400000) return formatter.format(Math.round(elapsed / 86400000), 'day')
  if (Math.abs(elapsed) >= 3600000) return formatter.format(Math.round(elapsed / 3600000), 'hour')
  return formatter.format(Math.round(elapsed / 60000), 'minute')
}
