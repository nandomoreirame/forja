import { expect, it } from 'vitest'
import { agentName, agentIds } from '../../src/renderer/src/entities/feature/model/agent-names'
import { createWorkbenchStore } from '../../src/renderer/src/entities/feature'
import { createMockSource, roleIds } from '../../src/renderer/src/shared/api'
import { getDictionary } from '../../src/shared/i18n'

it('names the forge agents per language and keeps user names', () => {
  expect(agentIds).toEqual(['smith', 'research', 'planner', 'implementer', 'tester', 'reviewer'])
  expect(agentIds.map((id) => agentName(id, 'pt-br', {}))).toEqual([
    'Ferreiro',
    'Minerador',
    'Moldador',
    'Bigorneiro',
    'Temperador',
    'Polidor',
  ])
  expect(agentIds.map((id) => agentName(id, 'en', {}))).toEqual([
    'Smith',
    'Miner',
    'Moldmaker',
    'Anvilsmith',
    'Temperer',
    'Polisher',
  ])
  expect(agentName('research', 'en', { research: 'Scout' })).toBe('Scout')
  expect(agentName('research', 'en', { research: '  Scout  ' })).toBe('Scout')
  expect(agentName('research', 'en', { research: '   ' })).toBe('Miner')
  expect(agentName('smith', 'pt-br', { smith: '' })).toBe('Ferreiro')
})

it('persists custom names through settings and translates only defaults on language changes', async () => {
  const source = createMockSource({ locale: 'en' })
  const store = createWorkbenchStore(source)
  await store.getState().openProject('dev')
  expect(store.getState().agentNames).toEqual({})
  await store.getState().setAgentName('research', '  Scout  ')
  await store.getState().setAgentName('smith', 'Master')
  expect((await source.loadSettings()).agentNames).toEqual({ research: 'Scout', smith: 'Master' })
  const restored = createWorkbenchStore(source)
  await restored.getState().openProject('dev')
  restored.getState().setLocale('pt-br')
  const names = () =>
    agentIds.map((id) =>
      agentName(id, restored.getState().source.locale, restored.getState().agentNames),
    )
  expect(names()).toEqual(['Master', 'Scout', 'Moldador', 'Bigorneiro', 'Temperador', 'Polidor'])
  restored.getState().setLocale('en')
  expect(names()).toEqual(['Master', 'Scout', 'Moldmaker', 'Anvilsmith', 'Temperer', 'Polisher'])
  await restored.getState().setAgentName('research', '   ')
  expect(agentName('research', 'en', restored.getState().agentNames)).toBe('Miner')
  expect((await source.loadSettings()).agentNames).toEqual({ smith: 'Master' })
  expect((await source.loadSettings()).agents).toEqual(
    (await createMockSource({ locale: 'en' }).loadSettings()).agents,
  )
})

it('keeps the fixed role labels separate from forge names', () => {
  expect(roleIds.map((id) => getDictionary('en').product[id])).toEqual([
    'Research',
    'Planner',
    'Implementer',
    'Tester',
    'Reviewer',
  ])
  expect(roleIds.map((id) => getDictionary('pt-br').product[id])).toEqual([
    'Pesquisador',
    'Planejador',
    'Implementador',
    'Testador',
    'Revisor',
  ])
})
