import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { CommandPalette } from '../../src/renderer/src/features/command-palette'
const projects = [
  {
    id: 'acme-api',
    name: 'acme-api',
    path: '~/projects/acme-api',
    lastOpenedAt: '2026-10-31T12:00:00Z',
  },
  { id: 'dev', name: 'dev', path: '~/dev', lastOpenedAt: '2026-10-30T12:00:00Z' },
]
it('filters recent projects, marks the current one and selects with Enter', () => {
  const select = vi.fn()
  render(
    <CommandPalette
      open
      scope="recent"
      locale="en"
      now={new Date('2026-10-31T14:00:00Z')}
      projects={projects}
      currentProjectId="acme-api"
      onOpenChange={() => {}}
      onSelectProject={select}
      onCommand={() => {}}
    />,
  )
  expect(screen.getByRole('option', { name: /acme-api/ })).toHaveAttribute('aria-current', 'true')
  expect(screen.getByRole('option', { name: /dev/ })).toHaveTextContent('yesterday')
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'dev' } })
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' })
  expect(select).toHaveBeenCalledWith('dev')
})
it('only closes when selecting the current project', () => {
  const select = vi.fn(),
    close = vi.fn()
  render(
    <CommandPalette
      open
      scope="recent"
      locale="en"
      projects={projects}
      currentProjectId="acme-api"
      onOpenChange={close}
      onSelectProject={select}
      onCommand={() => {}}
    />,
  )
  fireEvent.click(screen.getByRole('option', { name: /acme-api/ }))
  expect(close).toHaveBeenCalledWith(false)
  expect(select).not.toHaveBeenCalled()
})
it('offers only localized commands and opens the folder picker, and shows no matches', () => {
  const command = vi.fn()
  render(
    <CommandPalette
      open
      scope="all"
      locale="pt-br"
      projects={projects}
      currentProjectId="acme-api"
      onOpenChange={() => {}}
      onSelectProject={() => {}}
      onCommand={command}
    />,
  )
  expect(screen.queryByRole('option', { name: /acme-api/ })).toBeNull()
  expect(screen.getByRole('option', { name: /Projetos recentes/ })).toHaveTextContent('Ctrl+R')
  expect(screen.getByRole('option', { name: /Configurações/ })).toHaveTextContent('Ctrl+,')
  expect(document.querySelector('[data-slot=command-input-wrapper] svg')).toBeNull()
  fireEvent.click(screen.getByRole('option', { name: /Abrir projeto/ }))
  expect(command).toHaveBeenCalledWith('open-project')
  fireEvent.click(screen.getByRole('option', { name: /Nova conversa/ }))
  expect(command).toHaveBeenCalledWith('new-conversation')
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'zzzzzz' } })
  expect(screen.getByText('Nenhum resultado encontrado.')).toBeInTheDocument()
})

it('disables project-only commands before a project is opened', () => {
  render(
    <CommandPalette
      open
      scope="all"
      locale="en"
      projects={projects}
      currentProjectId=""
      onOpenChange={() => {}}
      onSelectProject={() => {}}
      onCommand={() => {}}
    />,
  )
  expect(screen.getByRole('option', { name: /New conversation/ })).toHaveAttribute(
    'aria-disabled',
    'true',
  )
  expect(screen.getByRole('option', { name: /Toggle terminals/ })).toHaveAttribute(
    'aria-disabled',
    'true',
  )
})
