import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { Messages } from '../../src/widgets/conversation'

const fence = '`'.repeat(3)

it('renders markdown, copyable code, a collapsible command run and an image attachment', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.assign(navigator, { clipboard: { writeText } })
  render(
    <Messages
      items={[
        {
          id: 'u',
          author: 'You',
          role: 'user',
          text: 'The login fails, see the screenshot.',
          attachments: [
            {
              kind: 'image',
              name: 'login-error.png',
              src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
              alt: 'Login error toast',
            },
          ],
        },
        {
          id: 'a',
          author: 'Implementer',
          role: 'agent',
          text: `Fixed in **token.ts**:\n\n${fence}ts\nexport const ttl = 3600\n${fence}`,
          parts: [
            {
              kind: 'command',
              command: 'npm test -- token',
              exitCode: 1,
              output: 'FAIL token.test.ts\nexpected 3600',
            },
          ],
        },
      ]}
    />,
  )
  expect(screen.getByRole('img', { name: 'Login error toast' })).toBeInTheDocument()
  expect(screen.getByText('token.ts').tagName).toBe('STRONG')
  fireEvent.click(screen.getByRole('button', { name: /Copy code/ }))
  expect(writeText).toHaveBeenCalledWith('export const ttl = 3600')
  expect(await screen.findByRole('status')).toHaveTextContent('Copied')
  const run = screen.getByRole('group', { name: /npm test -- token/ })
  expect(within(run).getByText(/exit 1/)).toBeInTheDocument()
  expect(within(run).queryByText(/expected 3600/)).not.toBeVisible()
})

it('keeps raw HTML as text and skips images without alt text', () => {
  render(
    <Messages
      items={[
        {
          id: 'u',
          author: 'You',
          role: 'user',
          text: '<img src=x onerror="alert(1)"> hi',
          attachments: [
            { kind: 'image', name: 'no-alt.png', src: 'data:image/png;base64,AA==', alt: '' },
          ],
        },
      ]}
    />,
  )
  expect(screen.queryByRole('img')).toBeNull()
  expect(document.querySelector('img')).toBeNull()
  expect(screen.getByText('no-alt.png')).toBeInTheDocument()
})

it('shows the first log lines and expands the rest on request', () => {
  const lines = Array.from({ length: 15 }, (_, i) => `line ${i + 1}`)
  render(
    <Messages
      items={[
        {
          id: 'a',
          author: 'Tester',
          role: 'agent',
          text: 'Logs:',
          parts: [{ kind: 'log', title: 'vitest', lines }],
        },
      ]}
    />,
  )
  expect(screen.getByText(/line 12/)).toBeInTheDocument()
  expect(screen.queryByText(/line 13/)).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Show all' }))
  expect(screen.getByText(/line 15/)).toBeInTheDocument()
})

it('opens an image attachment at full size in a dialog', () => {
  render(
    <Messages
      items={[
        {
          id: 'u',
          author: 'You',
          role: 'user',
          text: 'See',
          attachments: [
            {
              kind: 'image',
              name: 'shot.png',
              src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
              alt: 'Error toast',
            },
          ],
        },
      ]}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: /Open shot.png/ }))
  expect(
    within(screen.getByRole('dialog', { name: 'shot.png' })).getByRole('img', {
      name: 'Error toast',
    }),
  ).toBeInTheDocument()
})
