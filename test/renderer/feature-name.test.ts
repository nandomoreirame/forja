// @vitest-environment node
import { expect, it } from 'vitest'
import { featureIdentity } from '../../src/renderer/src/entities/feature/model/feature-name'
it('names features at a word boundary and produces unique slugs', () => {
  expect(
    featureIdentity('Adicionar rate limiting com Redis nos endpoints públicos da API', []),
  ).toEqual({
    name: 'Adicionar rate limiting com Redis nos…',
    slug: 'adicionar-rate-limiting-com-redis-nos',
  })
  expect(featureIdentity('Login', ['login', 'login-2']).slug).toBe('login-3')
  expect(() => featureIdentity('   ', [])).toThrow('Empty prompt')
})
it('normalizes accents and whitespace and handles punctuation, emoji and long words', () => {
  expect(featureIdentity('  Autenticação   rápida\nsecond line', [])).toEqual({
    name: 'Autenticação rápida',
    slug: 'autenticacao-rapida',
  })
  expect(featureIdentity('🔥', ['feature']).slug).toBe('feature-2')
  expect(featureIdentity('1234', []).slug).toBe('feature')
  expect(featureIdentity('a'.repeat(60), []).name).toBe('a'.repeat(40) + '…')
})
