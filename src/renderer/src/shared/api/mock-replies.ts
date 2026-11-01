import type { Locale } from '@/shared/i18n'
import type { MessagePart, RoleId } from './workbench-source'

interface MockReply {
  text: string
  terminalLines?: string[]
  part?: MessagePart
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
      text: 'The mock changes are ready. I updated the callback and its regression test:\n\n```ts\nexport function callbackError(code: string) {\n  return code === "access_denied" ? "login.denied" : "login.failed"\n}\n```\n\nThe simulated checks are running in the terminal.',
      terminalLines: ['$ npm run dev', 'Mock development server ready.'],
    },
    tester: {
      text: 'The mock check completed. The scripted test passes and covers the expected behavior. This simulated result does not execute a real test suite.',
      terminalLines: ['$ npm test', 'Mock check: 1 test passed.'],
      part: {
        kind: 'command',
        command: 'npm test',
        exitCode: 0,
        output: ' ✓ test/oauth-callback.test.ts (3 tests)\n Tests  3 passed (3)',
      },
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
      text: 'As alterações simuladas estão prontas. Atualizei o callback e o teste de regressão:\n\n```ts\nexport function callbackError(code: string) {\n  return code === "access_denied" ? "login.denied" : "login.failed"\n}\n```\n\nAs verificações simuladas estão em execução no terminal.',
      terminalLines: ['$ npm run dev', 'Servidor de desenvolvimento simulado pronto.'],
    },
    tester: {
      text: 'A verificação simulada terminou. O teste roteirizado passa e cobre o comportamento esperado. Este resultado simulado não executa uma suíte real.',
      terminalLines: ['$ npm test', 'Verificação simulada: 1 teste passou.'],
      part: {
        kind: 'command',
        command: 'npm test',
        exitCode: 0,
        output: ' ✓ test/oauth-callback.test.ts (3 testes)\n Testes  3 passaram (3)',
      },
    },
    reviewer: {
      text: 'Um achado simulado: um caso de borda precisa de teste de regressão. Adicione cobertura para cancelamento antes de aceitar a alteração.',
    },
  },
}

export const authoringReplies: Record<Locale, Record<'skill' | 'memory', MockReply>> = {
  en: {
    skill: { text: 'Let’s author this skill. What instructions and examples should it contain?' },
    memory: { text: 'Let’s curate this memory. What decision and context should we preserve?' },
  },
  'pt-br': {
    skill: { text: 'Vamos escrever esta skill. Quais instruções e exemplos ela deve conter?' },
    memory: { text: 'Vamos organizar esta memória. Qual decisão e contexto devemos preservar?' },
  },
}
