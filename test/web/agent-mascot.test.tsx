import { render } from '@testing-library/react'
import { expect, it } from 'vitest'
import { AgentMascot, agentSprites } from '../../src/shared/ui'

const roles = ['research', 'planner', 'implementer', 'tester', 'reviewer'] as const

it('draws five distinct 12x12 decorative sprites with a tool badge', () => {
  const grids = roles.map((role) => agentSprites[role].rows.join('\n'))
  expect(new Set(grids).size).toBe(5)
  for (const role of roles) {
    expect(agentSprites[role].rows).toHaveLength(12)
    expect(agentSprites[role].rows.every((row) => row.length === 12)).toBe(true)
  }
  const { container } = render(<AgentMascot role="tester" tool="claude" />)
  const svg = container.querySelector('svg[data-slot="agent-mascot"]')!
  expect(svg).toHaveAttribute('aria-hidden', 'true')
  expect(svg).toHaveAttribute('shape-rendering', 'crispEdges')
  expect(container.querySelector('[data-slot="tool-icon"]')).not.toBeNull()
})

it('maps every sprite character to a palette token and draws one rect per pixel', () => {
  for (const role of roles) {
    const { rows, palette } = agentSprites[role]
    const used = new Set(rows.join('').replace(/\./g, ''))
    for (const char of used) expect(palette[char]).toMatch(/^var\(--[a-z-]+\)$/)
    const { container, unmount } = render(<AgentMascot role={role} tool="codex" />)
    const pixels = rows.join('').replace(/\./g, '').length
    expect(container.querySelectorAll('svg[data-slot="agent-mascot"] rect')).toHaveLength(pixels)
    unmount()
  }
})

it('scales with the size prop', () => {
  const { container } = render(<AgentMascot role="planner" tool="grok" size={56} />)
  const frame = container.querySelector('[data-slot="agent-mascot-frame"]') as HTMLElement
  expect(frame.style.width).toBe('56px')
  expect(frame.style.height).toBe('56px')
})
