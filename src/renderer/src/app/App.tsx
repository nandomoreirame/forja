import { useState } from 'react'
import type { Locale } from '@/shared/i18n'
import { createMockSource } from '@/renderer/src/shared/api'
import { detectLocale } from '@/renderer/src/shared/lib/locale'
import { WorkbenchPage } from '@/renderer/src/pages/workbench'
export function App({ locale }: { locale?: Locale } = {}) {
  const [source] = useState(() => createMockSource({ locale: locale ?? detectLocale() }))
  return <WorkbenchPage source={source} />
}
