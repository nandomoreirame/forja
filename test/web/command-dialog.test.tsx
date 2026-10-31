import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { CommandDialog, CommandInput, CommandItem, CommandList } from '../../src/shared/ui'
it('renders a titled command dialog and closes with Escape', () => {
  const change = vi.fn()
  render(
    <CommandDialog open onOpenChange={change} title="Command bar" description="Search commands">
      <CommandInput placeholder="Type a command" />
      <CommandList>
        <CommandItem>Settings</CommandItem>
      </CommandList>
    </CommandDialog>,
  )
  expect(screen.getByRole('dialog', { name: 'Command bar' })).toBeInTheDocument()
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' })
  expect(change).toHaveBeenCalledWith(false)
})
