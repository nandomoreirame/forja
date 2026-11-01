import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

it('opens the conversation summary, summarizes on demand and closes', async () => {
  const source = createMockSource({ locale: 'en' })
  const summarize = vi.spyOn(source, 'summarizeConversation')
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  const count = (await source.loadProject('dev')).features[0].messages.length
  fireEvent.click(await screen.findByRole('button', { name: 'Summary' }))
  const panel = screen.getByRole('region', { name: 'Conversation summary' })
  expect(panel).toHaveTextContent('none yet')
  expect(panel).toHaveTextContent(`Agents receive the ${count} messages of the conversation.`)
  expect(panel).toHaveTextContent(/Past 50 messages/)
  fireEvent.click(within(panel).getByRole('button', { name: 'Summarize now' }))
  expect(summarize).toHaveBeenCalledWith('feature-1')
  expect(await within(panel).findByText(/Login with OAuth/)).toBeInTheDocument()
  expect(panel).not.toHaveTextContent('none yet')
  fireEvent.click(within(panel).getByRole('button', { name: 'Close summary' }))
  expect(screen.queryByRole('region', { name: 'Conversation summary' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Summary' })).toHaveAttribute('aria-expanded', 'false')
})

it('keeps the summary per feature', async () => {
  const source = createMockSource({ locale: 'pt-br' })
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Resumo' }))
  const panel = screen.getByRole('region', { name: 'Resumo da conversa' })
  fireEvent.click(within(panel).getByRole('button', { name: 'Resumir agora' }))
  expect(await within(panel).findByText(/Login com OAuth|Login with OAuth/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('tab', { name: /Busca no catálogo|Catalog search/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Resumo' }))
  expect(screen.getByRole('region', { name: 'Resumo da conversa' })).toHaveTextContent(
    'ainda não há',
  )
})
