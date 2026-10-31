// @vitest-environment node
import { expect, it } from 'vitest'
import { mentionedRole } from '../../src/renderer/src/features/composer/recipient'

it('takes the last explicit mention and ignores e-mails, unknown handles and code', () => {
  expect(mentionedRole('@research then @tester please')).toBe('tester')
  expect(mentionedRole('ask @pesquisador')).toBe('research')
  expect(mentionedRole('mail me at dev@tester.io')).toBeNull()
  expect(mentionedRole('@someone')).toBeNull()
  const fence = '`'.repeat(3)
  expect(mentionedRole(`${fence}\n@tester\n${fence}`)).toBeNull()
})

it('supports case-insensitive English and localized aliases', () => {
  for (const [alias, role] of Object.entries({
    RESEARCH: 'research',
    PESQUISADOR: 'research',
    PLANNER: 'planner',
    PLANEJADOR: 'planner',
    IMPLEMENTER: 'implementer',
    IMPLEMENTADOR: 'implementer',
    TESTER: 'tester',
    TESTADOR: 'tester',
    REVIEWER: 'reviewer',
    REVISOR: 'reviewer',
    téstádor: 'tester',
  }))
    expect(mentionedRole(`ask @${alias}`)).toBe(role)
})

it('ignores inline code and fenced code including unfinished fences', () => {
  expect(mentionedRole('@planner `@tester`')).toBe('planner')
  expect(mentionedRole('@research\n~~~ts\n@tester\n~~~')).toBe('research')
  expect(mentionedRole('```ts\n@tester')).toBeNull()
  expect(mentionedRole('x@tester @someone @testers')).toBeNull()
})
