export type Locale = 'en' | 'pt-br'
export type Page = 'landing' | 'styleguide'
export const paths: Record<Locale, Record<Page, string>> = {
  en: { landing: '/', styleguide: '/styleguide' },
  'pt-br': { landing: '/pt-br', styleguide: '/pt-br/styleguide' },
}
export function resolvePage(pathname: string): { locale: Locale; page: Page } | null {
  const path = pathname.replace(/\/+$/, '') || '/'
  for (const locale of ['en', 'pt-br'] as const)
    for (const page of ['landing', 'styleguide'] as const)
      if (paths[locale][page] === path) return { locale, page }
  return null
}
export function switchLocalePath(pathname: string, locale: Locale): string {
  return paths[locale][resolvePage(pathname)?.page ?? 'landing']
}
