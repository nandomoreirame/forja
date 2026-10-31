import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
it('switches projects from sidebar and restores opener focus', async () => {
  render(
    <WorkbenchPage
      source={createMockSource({ locale: 'en' })}
      initialProjectId="nandomoreira.dev"
    />,
  )
  const header = await screen.findByRole('button', { name: 'nandomoreira.dev, switch project' })
  header.focus()
  fireEvent.click(header)
  fireEvent.click(screen.getByRole('option', { name: /^dev/ }))
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
  render(
    <WorkbenchPage
      source={createMockSource({ locale: 'en' })}
      initialProjectId="nandomoreira.dev"
    />,
  )
  await screen.findByRole('complementary', { name: 'nandomoreira.dev' })
  const recent = screen.getByRole('button', { name: /Recent projects/ })
  recent.focus()
  fireEvent.click(recent)
  expect(screen.queryByRole('option', { name: /^Settings/ })).toBeNull()
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' })
  await waitFor(() => expect(recent).toHaveFocus())
  const command = screen.getByRole('button', { name: /nandomoreira.devCtrl/ })
  command.focus()
  fireEvent.click(command)
  expect(screen.getByRole('option', { name: /^Settings/ })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('option', { name: /^Settings/ }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByRole('main')).toHaveTextContent('Settings')
})

it('keeps commands and recent history in separate shortcut scopes', async () => {
  render(
    <WorkbenchPage
      source={createMockSource({ locale: 'en' })}
      initialProjectId="nandomoreira.dev"
    />,
  )
  await screen.findByRole('complementary', { name: 'nandomoreira.dev' })
  fireEvent.keyDown(window, { key: 'P', ctrlKey: true, shiftKey: true })
  expect(screen.queryByRole('option', { name: /nandomoreira.dev/ })).toBeNull()
  expect(screen.getByRole('option', { name: /Recent projects/ })).toHaveTextContent('Ctrl+R')
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Settings' } })
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'r', ctrlKey: true })
  expect(screen.getByRole('option', { name: /nandomoreira.dev/ })).toBeInTheDocument()
  expect(screen.queryByRole('option', { name: /^Settings/ })).toBeNull()
})

it('navigates to Settings even before opening a project', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} />)
  fireEvent.click(screen.getByRole('button', { name: /^Settings/ }))
  expect(screen.getByRole('main')).toHaveTextContent('Settings')
  expect(screen.queryByRole('heading', { name: 'FORJA' })).toBeNull()
})

it('opens Settings with Ctrl+comma from home and the command input', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} />)
  fireEvent.keyDown(window, { key: ',', ctrlKey: true })
  expect(screen.getByRole('main')).toHaveTextContent('Settings')
  fireEvent.keyDown(window, { key: 'P', ctrlKey: true, shiftKey: true })
  expect(screen.getByRole('option', { name: /Settings/ })).toHaveTextContent('Ctrl+,')
  fireEvent.keyDown(screen.getByRole('combobox'), { key: ',', ctrlKey: true })
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByRole('main')).toHaveTextContent('Settings')
})
it('opens recent history from its command and clears the command query', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} />)
  fireEvent.keyDown(window, { key: 'P', ctrlKey: true, shiftKey: true })
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Recent projects' } })
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' })
  expect(await screen.findByRole('option', { name: /nandomoreira.dev/ })).toBeInTheDocument()
  expect(screen.getByRole('combobox')).toHaveValue('')
})
