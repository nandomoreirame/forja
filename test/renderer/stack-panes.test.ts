import { expect, it } from 'vitest'
import { stackPanes } from '../../src/renderer/src/features/project-navigator/stack-panes'

const header = 5

it('gives the filler all free height when every pane is collapsed', () => {
  expect(stackPanes({ a: 5, b: 5, c: 5, filler: 85 }, header, 'filler')).toBeNull()
  expect(stackPanes({ a: 5, b: 50, c: 5, filler: 40 }, header, 'filler')).toEqual({
    a: 5,
    b: 90,
    c: 5,
    filler: 0,
  })
  expect(stackPanes({ a: 5, b: 5, c: 5, filler: 0 }, header, 'filler')).toEqual({
    a: 5,
    b: 5,
    c: 5,
    filler: 85,
  })
})

it('shares the free height among open panes in proportion to their sizes', () => {
  expect(stackPanes({ a: 30, b: 10, c: 5, filler: 55 }, header, 'filler')).toEqual({
    a: 71.25,
    b: 23.75,
    c: 5,
    filler: 0,
  })
})

it('leaves a balanced layout alone', () => {
  expect(stackPanes({ a: 60, b: 35, c: 5, filler: 0 }, header, 'filler')).toBeNull()
})
