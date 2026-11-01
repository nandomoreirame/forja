import { render } from '@testing-library/react'
import { expect, it } from 'vitest'
import { StatusBadge } from '../../src/shared/ui'

it('renders a compact badge for dense rows and tabs', () => {
  const { container } = render(
    <StatusBadge state="approved" size="sm">
      Approved
    </StatusBadge>,
  )
  const badge = container.querySelector('[data-slot="status-badge"]')!
  expect(badge).toHaveAttribute('data-size', 'sm')
  expect(badge).toHaveClass('text-[10px]', 'px-1', 'py-0')
  expect(badge).not.toHaveClass('py-1')
})
