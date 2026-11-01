import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

it('shows plan usage above Archived for tools with data', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  const usage = await within(sidebar).findByRole('region', { name: 'Plan usage' })
  const archived = within(sidebar).getByRole('button', { name: 'Archived' })
  expect(usage.compareDocumentPosition(archived) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(within(usage).getAllByRole('meter').length).toBeGreaterThan(0)
  expect(document.querySelector('header')).not.toHaveTextContent('Usage')
})

it('labels meters and switches colors exactly at the thresholds', async () => {
  const source = createMockSource({ locale: 'en' })
  const usage = await source.loadUsage()
  const base = usage[0].windows[0]
  source.loadUsage = async () => [
    {
      ...usage[0],
      windows: [69, 70, 89, 90].map((usedPercent) => ({
        ...base,
        id: String(usedPercent),
        usedPercent,
      })),
    },
  ]
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  const panel = await screen.findByRole('region', { name: 'Plan usage' })
  for (const [value, color] of [
    [69, 'success'],
    [70, 'warning'],
    [89, 'warning'],
    [90, 'destructive'],
  ] as const) {
    const meter = await within(panel).findByRole('meter', { name: `claude 5h, ${value}%` })
    expect(meter).toHaveAttribute('aria-valuenow', String(value))
    expect(meter.firstElementChild).toHaveClass(`bg-${color}`)
  }
  expect(panel).toHaveTextContent('updated now')
  expect(panel).toHaveTextContent('3h16m')
  expect(panel).not.toHaveTextContent('OpenCode')
})

it('keeps usage scrollable in the footer and the workspace menu outside its scroll area', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const panel = await screen.findByRole('region', { name: 'Plan usage' })
  const menu = screen.getByRole('navigation', { name: 'Workspace' })
  expect(panel.parentElement).toBe(menu.parentElement)
  expect(panel.parentElement).toHaveClass('min-h-0', 'max-h-full')
  expect(panel).toHaveClass('overflow-y-auto', 'min-h-0')
  expect(menu).toHaveClass('shrink-0')
})

it('shows one unavailable line when no tool reports windows or loading fails', async () => {
  const source = createMockSource({ locale: 'en' })
  source.loadUsage = async () => {
    throw new Error('offline')
  }
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  const panel = await screen.findByRole('region', { name: 'Plan usage' })
  expect(await within(panel).findByText('Usage unavailable')).toBeInTheDocument()
  expect(within(panel).queryByRole('meter')).toBeNull()
})

it('omits tools without windows and localizes the unavailable state', async () => {
  const source = createMockSource({ locale: 'pt-br' })
  source.loadUsage = async () => [{ tool: 'claude', windows: [] }]
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  const panel = await screen.findByRole('region', { name: 'Uso do plano' })
  expect(await within(panel).findByText('Uso indisponível')).toBeInTheDocument()
  expect(panel).not.toHaveTextContent('Claude')
})

it('shows the highest window per tool in the collapsed rail tooltip and expands on click', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  await screen.findByRole('region', { name: 'Plan usage' })
  fireEvent.click(screen.getByRole('button', { name: /Collapse.*sidebar/i }))
  const gauge = await screen.findByRole('button', { name: 'Plan usage' })
  fireEvent.focus(gauge)
  const tooltip = await screen.findByRole('tooltip')
  expect(tooltip).toHaveTextContent('Claude 5h: 35%')
  expect(tooltip).toHaveTextContent('Grok week: 42%')
  expect(tooltip).not.toHaveTextContent('OpenCode')
  fireEvent.click(gauge)
  expect(await screen.findByRole('region', { name: 'Plan usage' })).toBeInTheDocument()
})
