import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Button } from '../../src/shared/ui'
it('keeps disabled and loading actions inert with accessible names', () => {
  let calls = 0
  render(
    <>
      <Button disabled onClick={() => calls++}>
        Save changes
      </Button>
      <Button loading onClick={() => calls++}>
        Working
      </Button>
    </>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  fireEvent.click(screen.getByRole('button', { name: 'Working' }))
  expect(calls).toBe(0)
  expect(screen.getByRole('button', { name: 'Working' })).toBeDisabled()
})
