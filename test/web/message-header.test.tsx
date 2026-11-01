import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Messages } from '../../src/widgets/conversation'

it('shows larger author names with the message time next to them', () => {
  render(
    <Messages
      items={[
        {
          id: 'u',
          author: 'You',
          role: 'user',
          text: 'Fix it',
          time: '02:36',
          dateTime: '2026-11-01T05:36:00.000Z',
        },
        {
          id: 'a',
          author: 'Research',
          role: 'agent',
          text: 'On it',
          agent: 'research',
          tool: 'claude',
          toolLabel: 'Claude',
          time: '31 de out. · 23:47',
          dateTime: '2026-11-01T02:47:00.000Z',
        },
      ]}
    />,
  )
  for (const [name, time, dateTime] of [
    ['You', '02:36', '2026-11-01T05:36:00.000Z'],
    ['Research', '31 de out. · 23:47', '2026-11-01T02:47:00.000Z'],
  ]) {
    const author = screen.getByText(name, { selector: '[data-slot="message-author"]' })
    expect(author).toHaveClass('text-[13px]', 'font-semibold')
    const stamp = author.parentElement!.querySelector('time')!
    expect(stamp).toHaveTextContent(time)
    expect(stamp).toHaveAttribute('dateTime', dateTime)
  }
})
