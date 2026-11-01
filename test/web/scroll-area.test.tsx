import { render } from '@testing-library/react'
import { expect, it } from 'vitest'
import { ScrollArea } from '../../src/shared/ui'

it('shows an overlay scrollbar only on hover, like VS Code', () => {
  const { container } = render(
    <ScrollArea className="h-20">
      <div style={{ height: 400 }}>content</div>
    </ScrollArea>,
  )
  const root = container.querySelector('[data-slot="scroll-area"]')!
  expect(root).toHaveAttribute('data-scroll-type', 'hover')
  expect(root).toHaveClass('relative', 'overflow-hidden')
  expect(container.querySelector('[data-slot="scroll-area-viewport"]')).toHaveTextContent('content')
})
