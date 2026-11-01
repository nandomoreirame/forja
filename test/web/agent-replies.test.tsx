import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Messages } from '../../src/widgets/conversation'
import { faceColors } from '../../src/shared/ui'

it('gives agent replies a face and a bubble in the agent color, and users none', () => {
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
  const face = agent.querySelector('[data-slot="agent-face-frame"]') as HTMLElement
  const bubble = agent.querySelector('[data-surface="reply"]') as HTMLElement
  expect(face.style.width).toBe('56px')
  expect(bubble.contains(face)).toBe(false)
  // Plain bubble with the default border; only the author name carries the agent color.
  expect(bubble).toHaveClass('border', 'border-border')
  expect(bubble.className).not.toMatch(/\bbg-/)
  const author = agent.querySelector('[data-slot="message-author"]') as HTMLElement
  expect(author.style.color).toBe(faceColors.research)
  const tail = bubble.querySelector('[data-slot="reply-tail"]')!
  expect(tail).toHaveAttribute('aria-hidden', 'true')
  expect(tail).toHaveClass('border-border', 'bg-background')
  expect(agent).toHaveTextContent('Research')
  expect(agent.querySelector('.sr-only')).toHaveTextContent('(Claude)')
  expect(user.querySelector('[data-slot="agent-face"]')).toBeNull()
  expect(user.querySelector('[data-surface="reply"]')).toBeNull()
  expect(event.querySelector('[data-slot="agent-face"]')).toBeNull()
  expect(document.querySelector('[data-slot="agent-mascot"]')).toBeNull()
})

it('marks a running agent reply as speaking, with a moving mouth', () => {
  const { rerender } = render(
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
  expect(document.querySelector('svg[data-slot="agent-face"]')).toHaveAttribute(
    'data-speaking',
    'true',
  )
  expect(document.querySelector('[data-slot="face-mouth"]')).not.toBeNull()
  rerender(
    <Messages
      items={[
        {
          id: 'a',
          author: 'Tester',
          role: 'agent',
          text: 'Done',
          agent: 'tester',
          tool: 'grok',
          toolLabel: 'Grok',
        },
      ]}
    />,
  )
  expect(document.querySelector('[data-slot="face-mouth"]')).toBeNull()
})
