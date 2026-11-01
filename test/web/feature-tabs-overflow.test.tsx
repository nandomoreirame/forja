import { render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { FeatureTabs } from '../../src/widgets/workbench'

afterEach(() => vi.restoreAllMocks())

const items = Array.from({ length: 12 }, (_, index) => ({
  id: `tab-${index}`,
  label: `Tab ${index}`,
  state: 'idle' as const,
}))

it('scrolls the tab strip horizontally and reveals the selected tab', () => {
  const scrollIntoView = vi.fn()
  Element.prototype.scrollIntoView = scrollIntoView
  const { container, rerender } = render(
    <FeatureTabs items={items} selectedId="tab-0" onSelect={() => {}} />,
  )
  expect(container.querySelector('[data-slot="tab-strip"]')).toHaveClass('overflow-x-auto')
  scrollIntoView.mockClear()
  rerender(<FeatureTabs items={items} selectedId="tab-11" onSelect={() => {}} />)
  expect(scrollIntoView).toHaveBeenCalledTimes(1)
  expect(scrollIntoView.mock.contexts[0]).toBe(container.querySelector('#feature-tab-tab-11'))
})
