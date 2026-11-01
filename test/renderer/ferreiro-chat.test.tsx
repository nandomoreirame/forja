import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

const newChat = () =>
  fireEvent.click(
    within(document.querySelector('[data-slot="tab-strip"]') as HTMLElement).getByRole('button', {
      name: 'New chat',
    }),
  )

const send = (text: string) => {
  const field = screen.getByRole('textbox', { name: /Send your prompt/ })
  fireEvent.change(field, { target: { value: text } })
  fireEvent.keyDown(field, { key: 'Enter', ctrlKey: true })
}

it('opens the chat with the Ferreiro as soon as the first prompt is sent', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  await screen.findByRole('tab', { name: /Login with OAuth/ })
  newChat()
  send('Discuss API limits')
  expect(screen.getByRole('tab', { name: /Discuss API limits/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  expect(screen.queryByRole('tab', { name: /New chat/ })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Start feature' })).toBeNull()
  const conversation = screen.getByRole('list', { name: 'Conversation' })
  expect(conversation).toHaveTextContent('Discuss API limits')
  expect(
    await within(conversation).findByText(/scripted mock reply/, {}, { timeout: 3000 }),
  ).toBeInTheDocument()
  expect(within(conversation).getByText('Smith')).toBeInTheDocument()
})

it('hands the first turn to an RPI agent mentioned with @', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  await screen.findByRole('tab', { name: /Login with OAuth/ })
  newChat()
  send('@miner Rate limit public endpoints')
  expect(screen.getByRole('tab', { name: /Rate limit public endpoints/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  expect(
    within(screen.getByRole('list', { name: 'Conversation' })).getAllByText('Miner').length,
  ).toBeGreaterThan(0)
})

it('keeps the Ferreiro outside the RPI Flow cycle', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Flow' }))
  const cycle = screen.getByRole('list', { name: 'Cycle' })
  expect(within(cycle).getAllByRole('listitem')).toHaveLength(5)
  expect(within(cycle).queryByText('Smith')).toBeNull()
})
