import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
it('switches projects from sidebar and restores opener focus', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="acme-api" />)
  const header = await screen.findByRole('button', { name: 'acme-api, switch project' })
  header.focus()
  fireEvent.click(header)
  fireEvent.click(screen.getByRole('option', { name: /dev/ }))
  await screen.findByRole('complementary', { name: 'dev' })
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'dev, switch project' })).toHaveFocus(),
  )
  fireEvent.keyDown(window, { key: 'P', ctrlKey: true, shiftKey: true })
  expect(screen.getByRole('dialog', { name: 'Command bar' })).toBeInTheDocument()
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' })
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
})
it('opens recent projects without reloading and opens all commands from text input', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="acme-api" />)
  await screen.findByRole('complementary', { name: 'acme-api' })
  const recent = screen.getByRole('button', { name: /Recent projects/ })
  recent.focus()
  fireEvent.click(recent)
  expect(screen.queryByRole('option', { name: 'Settings' })).toBeNull()
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' })
  await waitFor(() => expect(recent).toHaveFocus())
  const command = screen.getByRole('button', { name: /acme-apiCtrl/ })
  command.focus()
  fireEvent.click(command)
  expect(screen.getByRole('option', { name: 'Settings' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('option', { name: 'Settings' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByRole('main')).toHaveTextContent('Settings')
})
