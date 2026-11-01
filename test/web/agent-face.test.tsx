import { render } from '@testing-library/react'
import { expect, it } from 'vitest'
import { AgentFace, faceColors } from '../../src/shared/ui/agent-face'

const agents = ['smith', 'research', 'planner', 'implementer', 'tester', 'reviewer'] as const

it('draws a face per agent with a distinct Ferreiro mark and a mouth only while speaking', () => {
  const { container, rerender } = render(<AgentFace agent="research" tool="claude" />)
  expect(container.querySelectorAll('[data-slot="face-eye"]')).toHaveLength(2)
  // Idle faces have no mouth at all.
  expect(container.querySelector('[data-slot="face-mouth"]')).toBeNull()
  rerender(<AgentFace agent="research" tool="claude" speaking />)
  expect(container.querySelector('[data-speaking="true"]')).not.toBeNull()
  const mouth = container.querySelector('[data-slot="face-mouth"]')!
  expect(mouth).not.toBeNull()
  expect(mouth.getAttribute('class')).toContain('motion-safe:animate-[face-talk')
  rerender(<AgentFace agent="smith" tool="claude" />)
  expect(container.querySelector('[data-slot="smith-mark"]')).not.toBeNull()
  rerender(<AgentFace agent="planner" tool="claude" />)
  expect(container.querySelector('[data-slot="smith-mark"]')).toBeNull()
})

it('stays decorative and keeps the tool badge', () => {
  const { container } = render(<AgentFace agent="tester" tool="codex" size={56} />)
  const svg = container.querySelector('svg[data-slot="agent-face"]')!
  expect(svg).toHaveAttribute('aria-hidden', 'true')
  expect(container.querySelector('[data-slot="tool-icon"]')).not.toBeNull()
  const frame = container.querySelector('[data-slot="agent-face-frame"]') as HTMLElement
  expect(frame.style.width).toBe('56px')
  // The tool badge grows with the face: 18 px at 56 px, never under 12 px.
  const icon = container.querySelector('[data-slot="tool-icon"]') as HTMLElement
  expect(icon.parentElement!.style.width).toBe('18px')
})

it('gives each agent a theme color, the Ferreiro told apart by its mark', () => {
  for (const agent of agents) expect(faceColors[agent]).toMatch(/^var\(--/)
  const { container } = render(<AgentFace agent="reviewer" tool="claude" />)
  expect(container.querySelector('[data-slot="face-body"]')).toHaveAttribute(
    'fill',
    faceColors.reviewer,
  )
})

it('shows every agent face, idle and speaking, in the styleguide', async () => {
  const { Styleguide } = await import('../../site/src/pages/styleguide')
  const { container } = render(<Styleguide locale="en" />)
  const cards = container.querySelectorAll('[data-slot="face-card"]')
  expect(cards).toHaveLength(6)
  for (const card of cards) {
    expect(card.querySelectorAll('[data-slot="agent-face"]').length).toBeGreaterThanOrEqual(2)
    expect(card.querySelector('[data-slot="agent-face"][data-speaking="true"]')).not.toBeNull()
  }
  expect(cards[0].querySelector('[data-slot="smith-mark"]')).not.toBeNull()
  expect(container.querySelector('[data-slot="agent-mascot"]')).toBeNull()
})
