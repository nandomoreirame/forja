import type { Locale } from '@/shared/i18n'
import { oauthConversation } from './mock-conversation'
import { roleIds, type ProjectSnapshot } from './workbench-source'
export function mockProjects(locale: Locale): ProjectSnapshot[] {
  const names =
    locale === 'en'
      ? ['Login with OAuth', 'Catalog search']
      : ['Login com OAuth', 'Busca no catálogo']
  const projects = [
    { id: 'nandomoreira.dev', path: '~/dev/projects/nandomoreira.dev', openedAt: '2026-10-31' },
    { id: 'dev', path: '~/dev', openedAt: '2026-10-30' },
    { id: 'contrateum.dev', path: '~/dev/projects/contrateum.dev', openedAt: '2026-10-27' },
    { id: 'mousai.gallery', path: '~/dev/projects/mousai.gallery', openedAt: '2026-10-22' },
    { id: 'terminalnoir', path: '~/dev/projects/terminalnoir', openedAt: '2026-10-14' },
    { id: 'tumodori', path: '~/dev/projects/tumodori', openedAt: '2026-09-30' },
  ]
  return projects.map(({ id, path, openedAt }) => {
    return {
      project: { id, name: id, path, lastOpenedAt: `${openedAt}T12:00:00Z` },
      agents: roleIds.map((id) => ({ id, state: 'draft' })),
      artifacts: [],
      skills: [],
      branches: ['main'],
      changes: [],
      features:
        id !== 'dev'
          ? []
          : names.map((name, i) => ({
              id: `feature-${i + 1}`,
              slug: ['login-oauth', 'catalog-search'][i],
              name,
              state: i === 0 ? 'running' : 'waiting',
              mode: 'guided',
              tool: i === 0 ? 'claude' : 'codex',
              destination: path,
              branch: `feature/${['login-oauth', 'catalog-search'][i]}`,
              worktree: null,
              target: path,
              stage: 'research',
              messages: i === 0 ? oauthConversation(locale) : [],
              terminals:
                i === 0
                  ? [
                      {
                        id: 'feature-1-implementer-dev',
                        label: `${locale === 'en' ? 'Implementer' : 'Implementador'} · dev`,
                        state: 'running',
                        kind: 'agent',
                        agent: 'implementer',
                        command: 'npm run dev',
                        cwd: path,
                        output: [
                          '$ npm run dev',
                          '> forja@2.0.0 dev',
                          '> electron-vite dev',
                          locale === 'en'
                            ? 'Mock dev server ready on http://127.0.0.1:5173'
                            : 'Servidor simulado pronto em http://127.0.0.1:5173',
                        ].join('\n'),
                      },
                      {
                        id: 'feature-1-implementer-tests',
                        label: `${locale === 'en' ? 'Implementer' : 'Implementador'} · tests`,
                        state: 'completed',
                        kind: 'agent',
                        agent: 'implementer',
                        command: 'npm test',
                        cwd: path,
                        output: [
                          '$ npm test',
                          ' ✓ test/oauth-callback.test.ts (3 tests)',
                          locale === 'en' ? 'Tests  3 passed (3)' : 'Testes  3 passaram (3)',
                        ].join('\n'),
                      },
                    ]
                  : [],
            })),
    }
  })
}
