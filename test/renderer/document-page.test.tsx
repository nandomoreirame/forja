import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: async (_id: string, source: string) => {
      if (source.includes('malformed')) throw new Error('Invalid diagram')
      return { svg: '<svg role="presentation"></svg>' }
    },
  },
}))
it('opens the spec from the sidebar as a closable tab with rendered content', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  fireEvent.click(await screen.findByRole('button', { name: /login-oauth\/SPEC.md/ }))
  expect(await screen.findByRole('tab', { name: /^login-oauth\/SPEC.md/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  expect(screen.getByRole('table')).toBeInTheDocument()
  expect(await screen.findByRole('img', { name: 'Diagram' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Close login-oauth/SPEC.md' }))
  expect(screen.queryByRole('tab', { name: /SPEC.md/ })).toBeNull()
})
it('keeps malformed Mermaid failures inline in English', async () => {
  const source = createMockSource({ locale: 'en' })
  source.readArtifact = async () => '```mermaid\nmalformed\n```'
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  fireEvent.click(await screen.findByRole('button', { name: /login-oauth\/SPEC.md/ }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Diagram could not be rendered.')
})
it('uses an English size limit fallback on the English route', async () => {
  const source = createMockSource({ locale: 'en' })
  source.readArtifact = async () => 'x'.repeat(20_001)
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  fireEvent.click(await screen.findByRole('button', { name: /login-oauth\/SPEC.md/ }))
  expect(await screen.findByText('Content exceeds the preview limit.')).toBeInTheDocument()
  expect(screen.queryByText('Conteúdo maior que o limite de visualização.')).toBeNull()
})

it('approves a draft plan and keeps the approved action unavailable', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  fireEvent.click(await screen.findByRole('button', { name: /login-oauth\/PLAN.md/ }))
  fireEvent.click(await screen.findByRole('button', { name: 'Approve plan' }))
  expect(screen.queryByRole('button', { name: 'Approve plan' })).toBeNull()
  expect(screen.getByText('Document approved.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /login-oauth\/SPEC.md/ }))
  expect(await screen.findByRole('tab', { name: /SPEC.md/ })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Approve spec' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: /login-oauth\/REVIEW.md/ }))
  expect(await screen.findByRole('tab', { name: /REVIEW.md/ })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /^Approve / })).toBeNull()
})
