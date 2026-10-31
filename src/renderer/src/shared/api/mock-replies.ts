import type { Locale } from '@/shared/i18n'
import type { RoleId } from './workbench-source'

interface MockReply {
  text: string
  terminalLines?: string[]
}

export const mockReplies: Record<Locale, Record<RoleId, MockReply>> = {
  en: {
    research: {
      text: 'What is the scope of this feature? Which behavior should stay unchanged? What acceptance criteria should we use?',
    },
    planner: {
      text: 'Proposed tasks: write a failing test, implement the smallest change, and run the checks. Review the results before continuing.',
    },
    implementer: {
      text: 'The mock changes are ready. I updated the implementation and its regression test. The simulated checks are running in the terminal.',
      terminalLines: ['$ npm run dev', 'Mock development server ready.'],
    },
    tester: {
      text: 'The mock check completed. The scripted test passes and covers the expected behavior. This simulated result does not execute a real test suite.',
      terminalLines: ['$ npm test', 'Mock check: 1 test passed.'],
    },
    reviewer: {
      text: 'One mock finding: an edge case needs a regression test. Add coverage for cancellation before accepting the change.',
    },
  },
  'pt-br': {
    research: {
      text: 'Qual é o escopo desta funcionalidade? Qual comportamento deve ser preservado? Quais critérios de aceitação devemos usar?',
    },
    planner: {
      text: 'Proposta de tarefas: escrever um teste que falha, implementar a menor alteração e executar as verificações. Revisar os resultados antes de continuar.',
    },
    implementer: {
      text: 'As alterações simuladas estão prontas. Atualizei a implementação e o teste de regressão. As verificações simuladas estão em execução no terminal.',
      terminalLines: ['$ npm run dev', 'Servidor de desenvolvimento simulado pronto.'],
    },
    tester: {
      text: 'A verificação simulada terminou. O teste roteirizado passa e cobre o comportamento esperado. Este resultado simulado não executa uma suíte real.',
      terminalLines: ['$ npm test', 'Verificação simulada: 1 teste passou.'],
    },
    reviewer: {
      text: 'Um achado simulado: um caso de borda precisa de teste de regressão. Adicione cobertura para cancelamento antes de aceitar a alteração.',
    },
  },
}
