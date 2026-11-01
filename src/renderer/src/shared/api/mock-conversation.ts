import type { Locale } from '@/shared/i18n'
import type { ChatMessage } from './workbench-source'

const fence = '`'.repeat(3)

// Seeded conversation starts on 2026-10-31 at 23:20 local time, a few minutes per message.
const seededAt = (minutes: number) => new Date(2026, 9, 31, 23, 20 + minutes).toISOString()

function screenshot(title: string, body: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270" viewBox="0 0 480 270">
<rect width="480" height="270" fill="#111113"/>
<rect x="140" y="50" width="200" height="150" rx="6" fill="#1b1b1f" stroke="#2b2b31"/>
<rect x="160" y="80" width="160" height="18" rx="3" fill="#26262c"/>
<rect x="160" y="108" width="160" height="18" rx="3" fill="#26262c"/>
<rect x="160" y="140" width="160" height="26" rx="3" fill="#F5A623"/>
<rect x="250" y="206" width="210" height="48" rx="4" fill="#2a1214" stroke="#ff4d4f"/>
<text x="264" y="226" font-family="monospace" font-size="12" fill="#ff4d4f">${title}</text>
<text x="264" y="243" font-family="monospace" font-size="10" fill="#c9c9cf">${body}</text>
</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export function oauthConversation(locale: Locale): ChatMessage[] {
  const en = locale === 'en'
  return [
    {
      id: 'oauth-request',
      createdAt: seededAt(0),
      role: 'user',
      text: en
        ? 'Add OAuth login with clear error feedback.'
        : 'Adicione login OAuth com mensagens de erro claras.',
      attachments: [
        {
          kind: 'image',
          name: 'login-error.png',
          src: screenshot(en ? 'Login failed' : 'Falha no login', 'error=access_denied'),
          alt: en
            ? 'Login screen with a generic red error toast'
            : 'Tela de login com um aviso de erro vermelho genérico',
        },
      ],
    },
    {
      id: 'oauth-research',
      model: 'Opus',
      durationMs: 48000,
      usage: { input: 6200, cached: 0, output: 410 },
      createdAt: seededAt(3),
      role: 'agent',
      author: 'research',
      text: en
        ? 'The flow needs a callback and an error state. Constraints found in the codebase:\n\n- The callback lives in `src/auth/callback.ts`\n- Errors reach the UI only as a generic toast\n- The return URL is not kept in `state`\n\nWhat the provider returns today:\n\n| Provider error | Current message | Proposed message |\n| --- | --- | --- |\n| `access_denied` | Login failed | You cancelled the sign-in |\n| `invalid_grant` | Login failed | Your session expired, try again |\n| network timeout | (none) | We could not reach the provider |\n\nOpen question: should a cancelled sign-in return to the previous page?'
        : 'O fluxo precisa de um callback e um estado de erro. Restrições encontradas no código:\n\n- O callback fica em `src/auth/callback.ts`\n- Os erros chegam à interface só como um aviso genérico\n- A URL de retorno não é guardada em `state`\n\nO que o provedor devolve hoje:\n\n| Erro do provedor | Mensagem atual | Mensagem proposta |\n| --- | --- | --- |\n| `access_denied` | Falha no login | Você cancelou o login |\n| `invalid_grant` | Falha no login | Sua sessão expirou, tente de novo |\n| tempo esgotado | (nenhuma) | Não conseguimos falar com o provedor |\n\nPergunta em aberto: um login cancelado deve voltar à página anterior?',
    },
    {
      id: 'oauth-plan',
      model: 'Opus',
      durationMs: 36000,
      usage: { input: 8100, cached: 4300, output: 520 },
      createdAt: seededAt(6),
      role: 'agent',
      author: 'planner',
      text: en
        ? 'Plan for the callback:\n\n- [x] Map provider errors to message keys\n- [x] Write the failing callback test\n- [ ] Show the message in the login toast\n- [ ] Keep the return URL after a cancel'
        : 'Plano para o callback:\n\n- [x] Mapear erros do provedor para chaves de mensagem\n- [x] Escrever o teste do callback que falha\n- [ ] Mostrar a mensagem no aviso de login\n- [ ] Manter a URL de retorno após cancelar',
    },
    {
      id: 'oauth-implementation',
      model: 'Sonnet',
      durationMs: 95000,
      usage: { input: 12400, cached: 6100, output: 880 },
      createdAt: seededAt(9),
      role: 'agent',
      author: 'implementer',
      text: en
        ? `I added the error mapping in \`src/auth/callback.ts\`:\n\n${fence}ts\nconst messages: Record<string, string> = {\n  access_denied: 'login.cancelled',\n  invalid_grant: 'login.expired',\n}\n\nexport function callbackError(code: string): string {\n  return messages[code] ?? 'login.failed'\n}\n${fence}\n\nThe first run failed because the test still expected the old key:`
        : `Adicionei o mapeamento de erros em \`src/auth/callback.ts\`:\n\n${fence}ts\nconst messages: Record<string, string> = {\n  access_denied: 'login.cancelled',\n  invalid_grant: 'login.expired',\n}\n\nexport function callbackError(code: string): string {\n  return messages[code] ?? 'login.failed'\n}\n${fence}\n\nA primeira execução falhou porque o teste ainda esperava a chave antiga:`,
      parts: [
        {
          kind: 'command',
          command: 'npm test -- oauth-callback',
          exitCode: 1,
          cwd: '~/dev',
          output:
            " FAIL  test/oauth-callback.test.ts > maps access_denied\nAssertionError: expected 'login.cancelled' to be 'login.failed'\n Tests  1 failed | 2 passed (3)",
        },
        {
          kind: 'command',
          command: 'npm test -- oauth-callback',
          exitCode: 0,
          cwd: '~/dev',
          output: ' ✓ test/oauth-callback.test.ts (3 tests) 12ms\n Tests  3 passed (3)',
        },
      ],
    },
    {
      id: 'oauth-log',
      model: 'Sonnet',
      durationMs: 22000,
      usage: { input: 9800, cached: 7200, output: 240 },
      createdAt: seededAt(12),
      role: 'agent',
      author: 'tester',
      text: en
        ? 'Callback log from the mock provider while reproducing the cancel:'
        : 'Log do callback no provedor simulado ao reproduzir o cancelamento:',
      parts: [
        {
          kind: 'log',
          title: 'auth-callback.log',
          level: 'warn',
          lines: [
            '12:04:01.112 GET /auth/callback?error=access_denied',
            '12:04:01.113 provider=github state=8f3c… verified',
            '12:04:01.114 mapped error access_denied -> login.cancelled',
            '12:04:01.115 redirect /login?reason=login.cancelled',
            '12:04:01.240 GET /login?reason=login.cancelled 200',
            '12:04:01.241 toast shown: login.cancelled',
            '12:04:03.900 GET /auth/start provider=github',
            '12:04:04.512 GET /auth/callback?code=… state=8f3c…',
            '12:04:04.630 token exchange 200 in 118ms',
            '12:04:04.631 session created user=demo',
            '12:04:04.632 redirect /dashboard',
            '12:04:04.700 GET /dashboard 200',
            '12:04:09.001 WARN return URL lost after cancel (expected /settings)',
            '12:04:09.002 WARN falling back to /dashboard',
          ],
        },
      ],
    },
    {
      id: 'oauth-handoff',
      createdAt: seededAt(15),
      role: 'event',
      author: 'tester',
      linkTo: 'oauth-request',
      text: en ? 'Tester requested a fix' : 'Testador solicitou uma correção',
    },
    {
      id: 'oauth-fix',
      createdAt: seededAt(18),
      role: 'agent',
      author: 'implementer',
      text: en
        ? 'I am updating the callback error feedback and keeping the return URL in `state`. Next command: `npm run test:e2e -- login`.'
        : 'Estou ajustando as mensagens de erro do callback e guardando a URL de retorno em `state`. Próximo comando: `npm run test:e2e -- login`.',
    },
  ]
}
