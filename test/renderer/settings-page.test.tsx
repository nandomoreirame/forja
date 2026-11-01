import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

it('enables Save only after an edit and guards leaving with unsaved changes', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  fireEvent.click(within(sidebar).getByRole('button', { name: 'Settings' }))
  fireEvent.click(await screen.findByRole('tab', { name: 'Agents' }))
  const save = await screen.findByRole('button', { name: 'Save changes' })
  expect(save).toBeDisabled()
  expect(screen.getByText(/of 3 active/)).toHaveTextContent('2 of 3 active')
  fireEvent.click(screen.getByRole('checkbox', { name: 'git' }))
  expect(save).toBeEnabled()
  expect(screen.getByText(/of 3 active/)).toHaveTextContent('3 of 3 active')
  fireEvent.click(screen.getByRole('tab', { name: /General/ }))
  expect(screen.getByRole('dialog', { name: 'Unsaved changes' })).toBeInTheDocument()
})

it.each(['Refresh', 'Save changes'])(
  'scans the edited folder with %s and updates sidebar skills',
  async (action) => {
    const source = createMockSource({
      locale: 'en',
      loadSkills: async (root) =>
        root === '/edited' ? [{ id: 'new', name: 'New real skill', markdown: '# Skill' }] : [],
    })
    const scan = vi.spyOn(source, 'scanSkills')
    render(<WorkbenchPage source={source} initialProjectId="dev" />)
    const sidebar = await screen.findByRole('complementary', { name: 'dev' })
    fireEvent.click(within(sidebar).getByRole('button', { name: 'Settings' }))
    fireEvent.click(await screen.findByRole('tab', { name: /General/ }))
    const input = await screen.findByRole('textbox', { name: 'Skills folder' })
    expect(input).toHaveValue('~/.skills')
    fireEvent.change(input, { target: { value: '/edited' } })
    fireEvent.click(screen.getByRole('button', { name: action }))
    expect(await within(sidebar).findByText('New real skill')).toBeInTheDocument()
    expect(scan).toHaveBeenCalledWith('/edited')
  },
)

it.each(['discard', 'save'])(
  'restores the saved folder after a draft Refresh on %s',
  async (action) => {
    const source = createMockSource({
      locale: 'en',
      loadSkills: async (root) => [
        { id: root, name: root === '/edited' ? 'Draft skill' : 'Saved skill', markdown: '# Skill' },
      ],
    })
    const scan = vi.spyOn(source, 'scanSkills')
    render(<WorkbenchPage source={source} initialProjectId="dev" />)
    const sidebar = await screen.findByRole('complementary', { name: 'dev' })
    fireEvent.click(within(sidebar).getByRole('button', { name: 'Settings' }))
    fireEvent.click(await screen.findByRole('tab', { name: /General/ }))
    const input = await screen.findByRole('textbox', { name: 'Skills folder' })
    fireEvent.change(input, { target: { value: '/edited' } })
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    await within(sidebar).findByText('Draft skill')
    if (action === 'discard') {
      fireEvent.click(screen.getByRole('tab', { name: /Agents/ }))
      fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    } else {
      fireEvent.change(input, { target: { value: '~/.skills' } })
      fireEvent.change(screen.getByRole('spinbutton', { name: /Inactivity/ }), {
        target: { value: '31' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    }
    await waitFor(() => expect(scan).toHaveBeenLastCalledWith('~/.skills'))
    expect(await within(sidebar).findByText('Saved skill')).toBeInTheDocument()
    expect(within(sidebar).queryByText('Draft skill')).toBeNull()
  },
)
