import library from 'virtual:forja-mock-library'
import { useState } from 'react'
import type { Locale } from '@/shared/i18n'
import { createMockSource } from '@/renderer/src/shared/api'
import { storedLocale } from '@/renderer/src/shared/lib/locale'
import { WorkbenchPage } from '@/renderer/src/pages/workbench'
export function App({ locale }: { locale?: Locale } = {}) {
  const [source] = useState(() =>
    createMockSource({
      // English is the primary language until the viewer picks another in Settings.
      locale: locale ?? storedLocale() ?? 'en',
      library,
      loadSkills: (root) =>
        fetch('/__forja/skills?root=' + encodeURIComponent(root))
          .then((response) => (response.ok ? response.json() : []))
          .then((payload: unknown) =>
            Array.isArray(payload) &&
            payload.every(
              (item) =>
                item !== null &&
                typeof item === 'object' &&
                typeof item.id === 'string' &&
                typeof item.name === 'string' &&
                typeof item.markdown === 'string',
            )
              ? payload
              : [],
          )
          .catch(() => []),
    }),
  )
  return <WorkbenchPage source={source} />
}
