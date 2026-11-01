import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Messages } from '../../src/widgets/conversation'
import { AgentMascot } from '../../src/shared/ui'

it('gives agent replies a mascot, a tool-aware author and a gray surface, and users none', () => {
  render(
    <Messages
      items={[
        { id: 'u', author: 'You', role: 'user', text: 'Fix it' },
        {
          id: 'a',
          author: 'Research',
          role: 'agent',
          text: 'On it',
          agent: 'research',
          tool: 'claude',
          toolLabel: 'Claude',
        },
        { id: 'e', author: 'Tester', role: 'event', text: 'Tester requested a fix' },
      ]}
    />,
  )
  const [user, agent, event] = screen.getAllByRole('listitem')
  const mascot = agent.querySelector('[data-slot="agent-mascot-frame"]') as HTMLElement
  const bubble = agent.querySelector('[data-surface="reply"]')!
  expect(mascot.style.width).toBe('56px')
  expect(bubble.contains(mascot)).toBe(false)
  expect(bubble).toHaveClass('bg-secondary')
  expect(bubble).not.toHaveClass('border')
  const tail = bubble.querySelector('[data-slot="reply-tail"]')!
  expect(tail).toHaveAttribute('aria-hidden', 'true')
  expect(tail).toHaveClass('bg-secondary')
  expect(agent).toHaveTextContent('Research')
  expect(agent.querySelector('.sr-only')).toHaveTextContent('(Claude)')
  expect(user.querySelector('[data-slot="agent-mascot"]')).toBeNull()
  expect(user).not.toHaveClass('bg-secondary')
  expect(event.querySelector('[data-slot="agent-mascot"]')).toBeNull()
})

it('animates the mascot only while the reply streams, and only with motion allowed', () => {
  const { rerender } = render(<AgentMascot role="research" tool="claude" speaking />)
  const svg = document.querySelector('svg[data-slot="agent-mascot"]')!
  expect(svg).toHaveAttribute('data-speaking', 'true')
  expect(svg.getAttribute('class')).toMatch(/motion-safe:animate-\[mascot-bob/)
  const mouth = document.querySelectorAll('rect[data-part="mouth"]')
  expect(mouth.length).toBeGreaterThan(0)
  for (const rect of mouth)
    expect(rect.getAttribute('class')).toMatch(/motion-safe:animate-\[mascot-mouth/)
  rerender(<AgentMascot role="research" tool="claude" />)
  expect(svg).not.toHaveAttribute('data-speaking')
  expect(svg.getAttribute('class') ?? '').not.toMatch(/animate/)
})

it('marks a running agent reply as speaking', () => {
  render(
    <Messages
      items={[
        {
          id: 'a',
          author: 'Tester',
          role: 'agent',
          text: '',
          status: 'running',
          agent: 'tester',
          tool: 'grok',
          toolLabel: 'Grok',
          speaking: true,
        },
      ]}
    />,
  )
  expect(document.querySelector('svg[data-slot="agent-mascot"]')).toHaveAttribute(
    'data-speaking',
    'true',
  )
})
