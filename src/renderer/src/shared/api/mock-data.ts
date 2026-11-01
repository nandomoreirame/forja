import type { Locale } from '@/shared/i18n'
import { oauthConversation } from './mock-conversation'
import { roleIds, type ProjectSnapshot } from './workbench-source'
export function mockProjects(locale: Locale): ProjectSnapshot[] {
  const names =
    locale === 'en'
      ? ['Login with OAuth', 'Catalog search', 'Payment retry', 'Profile settings', 'Legacy import']
      : [
          'Login com OAuth',
          'Busca no catálogo',
          'Retentativa de pagamento',
          'Configurações de perfil',
          'Importação legada',
        ]
  const slugs = [
    'login-oauth',
    'catalog-search',
    'payment-retry',
    'profile-settings',
    'legacy-import',
  ]
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
      artifacts:
        id === 'dev'
          ? [
              {
                id: 'dev:login-oauth:spec',
                name: 'login-oauth/SPEC.md',
                kind: 'spec',
                featureId: 'feature-1',
                state: 'approved',
                author: 'research',
              },
              {
                id: 'dev:login-oauth:plan',
                name: 'login-oauth/PLAN.md',
                kind: 'plan',
                featureId: 'feature-1',
                specId: 'dev:login-oauth:spec',
                state: 'draft',
                author: 'planner',
              },
              {
                id: 'dev:login-oauth:review',
                name: 'login-oauth/REVIEW.md',
                kind: 'review',
                featureId: 'feature-1',
                state: 'completed',
                author: 'reviewer',
              },
              ...slugs.slice(1).flatMap((slug, index) => [
                {
                  id: `dev:${slug}:spec`,
                  name: `${slug}/SPEC.md`,
                  kind: 'spec' as const,
                  featureId: `feature-${index + 2}`,
                  state: 'draft' as const,
                  author: 'research' as const,
                  archived: index === 3,
                },
                {
                  id: `dev:${slug}:plan`,
                  name: `${slug}/PLAN.md`,
                  kind: 'plan' as const,
                  featureId: `feature-${index + 2}`,
                  specId: `dev:${slug}:spec`,
                  state: 'draft' as const,
                  author: 'planner' as const,
                  archived: index === 3,
                },
              ]),
            ]
          : [],
      skills:
        id === 'dev'
          ? [
              {
                id: 'project-testing',
                name: locale === 'en' ? 'Project testing' : 'Testes do projeto',
                scope: 'project',
              },
              {
                id: 'code-review',
                name: locale === 'en' ? 'Code review' : 'Revisão de código',
                scope: 'global',
              },
            ]
          : [],
      branches: ['main'],
      changes: [],
      features:
        id !== 'dev'
          ? []
          : names.map((name, i) => ({
              id: `feature-${i + 1}`,
              slug: slugs[i],
              name,
              state:
                i === 0 || i === 2
                  ? 'running'
                  : i === 1
                    ? 'waiting'
                    : i === 3
                      ? 'completed'
                      : 'draft',
              lastActivityAt: `2026-10-${31 - i}T12:00:00Z`,
              stalled: i === 2,
              endState: i === 3 ? 'integrated' : undefined,
              archived: i === 4,
              mode: 'guided',
              tool: i === 0 ? 'claude' : 'codex',
              destination: path,
              branch: `feature/${slugs[i]}`,
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

export function mockArtifactMarkdown(
  locale: Locale,
  artifact: ProjectSnapshot['artifacts'][number],
  feature: ProjectSnapshot['features'][number],
): string {
  const en = locale === 'en'
  const kind = artifact.kind
  if (feature.slug !== 'login-oauth') {
    const heading =
      kind === 'plan'
        ? en
          ? 'Implementation tasks'
          : 'Tarefas de implementação'
        : kind === 'review'
          ? en
            ? 'Findings'
            : 'Achados'
          : en
            ? 'Objective'
            : 'Objetivo'
    return [
      `# ${artifact.name}`,
      `## ${heading}
${feature.name}`,
      kind === 'spec'
        ? en
          ? `Define the requirements for ${feature.name}.
- [ ] Validate the expected behavior.`
          : `Definir os requisitos de ${feature.name}.
- [ ] Validar o comportamento esperado.`
        : kind === 'plan'
          ? en
            ? `- [ ] Implement and test ${feature.name}.`
            : `- [ ] Implementar e testar ${feature.name}.`
          : en
            ? `Review the implementation of ${feature.name}.`
            : `Revisar a implementação de ${feature.name}.`,
    ].join('\n\n')
  }
  if (kind === 'plan')
    return [
      '# login-oauth/PLAN.md',
      en ? '## Implementation tasks' : '## Tarefas de implementação',
      en
        ? '- [ ] Test callback expiration.\n- [ ] Validate state before exchanging the code.'
        : '- [ ] Testar a expiração do callback.\n- [ ] Validar o state antes de trocar o código.',
    ].join('\n\n')
  if (kind === 'review')
    return [
      '# login-oauth/REVIEW.md',
      en ? '## Findings' : '## Achados',
      en
        ? '| Finding | Status |\n| --- | --- |\n| Expired callback rejected | Verified |'
        : '| Achado | Estado |\n| --- | --- |\n| Callback expirado rejeitado | Verificado |',
    ].join('\n\n')
  return [
    '# login-oauth/SPEC.md',
    en
      ? '## Objective\nEnsure deterministic expiration handling for the OAuth callback.'
      : '## Objetivo\nGarantir tratamento determinístico da expiração do callback OAuth.',
    en
      ? '## Tasks\n- [ ] Validate state.\n- [ ] Reject expired callbacks.'
      : '## Tarefas\n- [ ] Validar o state.\n- [ ] Rejeitar callbacks expirados.',
    en
      ? '| Parameter | Meaning |\n| --- | --- |\n| state | Request identifier |\n| code | Authorization code |'
      : '| Parâmetro | Significado |\n| --- | --- |\n| state | Identificador da requisição |\n| code | Código de autorização |',
    '```mermaid\nflowchart TD\n  Login --> Callback\n  Callback --> Validate\n  Validate --> Session\n```',
    '```typescript\nconst expired = expiresAt <= now\nif (expired) throw new Error("Expired callback")\n```',
  ].join('\n\n')
}
