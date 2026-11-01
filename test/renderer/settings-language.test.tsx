import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
import { App } from '../../src/renderer/src/app/App'
import { storedLocale } from '../../src/renderer/src/shared/lib/locale'

afterEach(() => localStorage.clear())

const openSettings = async () => {
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  fireEvent.click(within(sidebar).getByRole('button', { name: 'Settings' }))
}

it('opens Settings on General, with Agents second', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  await openSettings()
  const tabs = await screen.findAllByRole('tab', { name: /^(General|Agents|Connectors)$/ })
  expect(tabs.map((tab) => tab.textContent)).toEqual(['General', 'Agents', 'Connectors'])
  expect(screen.getByRole('tab', { name: 'General' })).toHaveAttribute('aria-selected', 'true')
  fireEvent.keyDown(window, { key: ',', ctrlKey: true })
  expect(screen.getByRole('tab', { name: 'General' })).toHaveAttribute('aria-selected', 'true')
})

it('lists English first and switches the app language on save', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  await openSettings()
  const language = await screen.findByRole('combobox', { name: 'Language' })
  expect(language).toHaveTextContent('English')
  fireEvent.click(language)
  const options = await screen.findAllByRole('option')
  expect(options.map((option) => option.textContent)).toEqual(['English', 'Português (Brasil)'])
  fireEvent.click(options[1])
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(await screen.findByRole('heading', { name: 'Configurações' })).toBeInTheDocument()
  expect(screen.getByRole('combobox', { name: 'Idioma' })).toHaveTextContent('Português (Brasil)')
  expect(storedLocale()).toBe('pt-br')
})

it('starts in English and restores the saved language', async () => {
  const { unmount } = render(<App />)
  expect(await screen.findByRole('button', { name: /Open project/ })).toBeInTheDocument()
  unmount()
  localStorage.setItem('forja.locale', 'pt-br')
  render(<App />)
  expect(await screen.findByRole('button', { name: /Abrir projeto/ })).toBeInTheDocument()
})
