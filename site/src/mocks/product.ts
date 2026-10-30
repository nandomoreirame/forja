import { getDictionary, type Locale } from '@/shared/i18n'

const localized = {
  en: {
    features: ['Login with OAuth', 'Catalog search'],
    targetPath: '~/dev/projects/forja',
    worktree: '~/.worktrees/login-oauth',
    specName: 'login-oauth/SPEC.md',
    skillName: 'rpi-implement',
    terminals: ['Implementer · tests', 'Implementer · dev', 'zsh'],
    prompt: 'Send an instruction, @ to select an agent',
    cwd: 'Working directory',
    output: ['$ npm run dev', 'VITE v8 ready in 210 ms', '  ➜  Local: http://127.0.0.1:5173/'],
    messageUser: 'Fix the expired token scenario.',
    messageAgent: 'I will fix the scenario and run the tests.',
    stateRunning: 'Running',
    stateCompleted: 'Completed',
    stateIdle: 'Idle',
  },
  'pt-br': {
    features: ['Login com OAuth', 'Busca no catálogo'],
    targetPath: '~/dev/projects/forja',
    worktree: '~/.worktrees/login-oauth',
    specName: 'login-oauth/SPEC.md',
    skillName: 'rpi-implement',
    terminals: ['Implementador · testes', 'Implementador · dev', 'zsh'],
    prompt: 'Envie uma instrução, @ para selecionar um agente',
    cwd: 'Diretório de trabalho',
    output: ['$ npm run dev', 'VITE v8 pronto em 210 ms', '  ➜  Local: http://127.0.0.1:5173/'],
    messageUser: 'Corrija o cenário de token expirado.',
    messageAgent: 'Vou corrigir o cenário e executar os testes.',
    stateRunning: 'Em execução',
    stateCompleted: 'Concluído',
    stateIdle: 'Ocioso',
  },
} as const

export function productMock(locale: Locale) {
  const dictionary = getDictionary(locale)
  const copy = localized[locale]
  const roles = dictionary.workflow.roles.map(([name]) => name)
  return {
    ...copy,
    roles,
    rpiSteps: dictionary.workflow.roles.map(([name]) => name),
    recipients: roles.map((name, index) => ({ id: `role-${index}`, label: name })),
    statusLabels: {
      approved: dictionary.product.approved,
      draft: dictionary.product.draft,
      running: dictionary.product.running,
      done: dictionary.product.done,
    },
    labels: dictionary.product,
  }
}
