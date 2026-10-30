import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Checkbox } from '../../src/shared/ui/checkbox'
import { Input } from '../../src/shared/ui/input'
import { Kbd } from '../../src/shared/ui/kbd'
import { Label } from '../../src/shared/ui/label'
import { Switch } from '../../src/shared/ui/switch'
import { statusTone } from '../../src/shared/ui/status'

it('changes only local state through the controlled primitive', () => {
  const values: boolean[] = []
  render(
    <Switch
      aria-label="Interrupt when sending"
      checked={false}
      onCheckedChange={(value) => values.push(value)}
    />,
  )
  fireEvent.click(screen.getByRole('switch', { name: 'Interrupt when sending' }))
  expect(values).toEqual([true])
})

it('maps every UI state to a tone that never relies on color alone', () => {
  expect(statusTone('running')).toBe('accent')
  expect(statusTone('waiting')).toBe('accent')
  expect(statusTone('failed')).toBe('danger')
  expect(statusTone('stale')).toBe('danger')
  for (const state of ['draft', 'approved', 'completed', 'interrupted'] as const)
    expect(statusTone(state)).toBe('muted')
})

it('associates an invalid input with its visible label and error description', () => {
  render(
    <>
      <Label htmlFor="model">Modelo</Label>
      <Input id="model" aria-invalid="true" aria-describedby="model-error" defaultValue="" />
      <p id="model-error">Informe um valor válido</p>
    </>,
  )
  const input = screen.getByRole('textbox', { name: 'Modelo' })
  expect(input).toHaveAttribute('aria-invalid', 'true')
  expect(input).toHaveAccessibleDescription('Informe um valor válido')
})

it('toggles a labelled checkbox through controlled state', () => {
  const changes: boolean[] = []
  render(
    <Checkbox
      aria-label="git"
      checked={false}
      onCheckedChange={(value) => changes.push(value === true)}
    />,
  )
  fireEvent.click(screen.getByRole('checkbox', { name: 'git' }))
  expect(changes).toEqual([true])
})

it('renders keyboard shortcuts as readable text', () => {
  render(<Kbd>Ctrl+Enter</Kbd>)
  expect(screen.getByText('Ctrl+Enter')).toBeInTheDocument()
})
