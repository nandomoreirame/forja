import type { Locale } from './routes'

const tag = (locale: Locale) => (locale === 'en' ? 'en-US' : 'pt-BR')

/** Message time: `HH:mm` for today, `<day month> · HH:mm` for other days. */
export function formatMessageTime(iso: string, locale: Locale, now = new Date()): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const time = new Intl.DateTimeFormat(tag(locale), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
  if (date.toDateString() === now.toDateString()) return time
  const day = new Intl.DateTimeFormat(tag(locale), { day: 'numeric', month: 'short' }).format(date)
  return `${day} · ${time}`
}

export function formatTokens(count: number, locale: Locale): string {
  if (count < 1000) return String(count)
  const value = new Intl.NumberFormat(tag(locale), { maximumFractionDigits: 1 }).format(
    count / 1000,
  )
  return `${value}k`
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}
