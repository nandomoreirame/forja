import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Messages } from '../../src/widgets/conversation'

it('summarizes the response and opens its details', async () => {
  render(
    <Messages
      items={[
        {
          id: 'a',
          author: 'Research',
          role: 'agent',
          text: 'Done',
          agent: 'research',
          tool: 'claude',
          toolLabel: 'Claude',
          response: {
            summary: 'Sonnet · 4.5k tokens · 5s',
            label: 'Response details',
            rows: [
              ['Engine', 'Claude'],
              ['Model', 'Sonnet'],
              ['Input', '4.3k'],
              ['From cache', '0'],
              ['Output', '202'],
              ['Duration', '5s'],
            ],
          },
        },
        { id: 'r', author: 'Tester', role: 'agent', text: '', status: 'running' },
      ]}
    />,
  )
  const trigger = screen.getByRole('button', { name: /Sonnet · 4.5k tokens · 5s/ })
  expect(trigger).toHaveAccessibleName(/Response details/)
  fireEvent.click(trigger)
  const details = await screen.findByRole('dialog', { name: 'Response details' })
  for (const [label, value] of [
    ['Engine', 'Claude'],
    ['Input', '4.3k'],
    ['Output', '202'],
  ]) {
    const row = within(details).getByText(label).closest('div')!
    expect(row).toHaveTextContent(value)
  }
  expect(screen.getAllByRole('button', { name: /tokens/ })).toHaveLength(1)
})
