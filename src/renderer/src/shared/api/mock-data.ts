import type { Locale } from '@/shared/i18n'
import { roleIds, type ProjectSnapshot } from './workbench-source'
export function mockProjects(locale: Locale): ProjectSnapshot[] {
  const names =
    locale === 'en'
      ? ['Login with OAuth', 'Catalog search']
      : ['Login com OAuth', 'Busca no catálogo']
  return ['acme-api', 'dev'].map((id, index) => {
    const path = id === 'dev' ? '~/dev' : '~/projects/acme-api'
    return {
      project: { id, name: id, path, lastOpenedAt: `2026-10-${31 - index}T12:00:00Z` },
      agents: roleIds.map((id) => ({ id, state: 'draft' })),
      artifacts: [],
      skills: [],
      branches: ['main'],
      changes: [],
      features:
        index === 0
          ? []
          : names.map((name, i) => ({
              id: `feature-${i + 1}`,
              slug: ['login-oauth', 'catalog-search'][i],
              name,
              state: i === 0 ? 'running' : 'waiting',
              mode: 'guided',
              destination: path,
              branch: `feature/${['login-oauth', 'catalog-search'][i]}`,
              worktree: null,
              target: path,
              stage: 'research',
              messages:
                i === 0
                  ? [
                      {
                        id: 'oauth-request',
                        role: 'user',
                        text:
                          locale === 'en'
                            ? 'Add OAuth login with clear error feedback.'
                            : 'Adicione login OAuth com mensagens de erro claras.',
                      },
                      {
                        id: 'oauth-research',
                        role: 'agent',
                        author: 'research',
                        text:
                          locale === 'en'
                            ? 'The flow needs a callback and an error state.'
                            : 'O fluxo precisa de um callback e um estado de erro.',
                      },
                      {
                        id: 'oauth-handoff',
                        role: 'event',
                        author: 'tester',
                        linkTo: 'oauth-request',
                        text:
                          locale === 'en'
                            ? 'Tester requested a fix'
                            : 'Testador solicitou uma correção',
                      },
                      {
                        id: 'oauth-implementation',
                        role: 'agent',
                        author: 'implementer',
                        text:
                          locale === 'en'
                            ? 'I am updating the callback error feedback.'
                            : 'Estou ajustando as mensagens de erro do callback.',
                      },
                    ]
                  : [],
              terminals: [],
            })),
    }
  })
}
