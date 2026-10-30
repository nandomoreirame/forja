import type { Locale, Page } from '@/shared/i18n'
import { switchLocalePath } from '@/shared/i18n'

export interface LocaleLinkProps {
  page: Page
  target: Locale
  label: string
  className?: string
}

export function LocaleLink({ page, target, label, className }: LocaleLinkProps) {
  const href = switchLocalePath(page === 'landing' ? '/' : '/styleguide', target)
  const hreflang = target === 'en' ? 'en' : 'pt-BR'
  return (
    <a href={href} hrefLang={hreflang} lang={hreflang} className={className}>
      {label}
    </a>
  )
}
