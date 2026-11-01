import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { ToolIcon, toolIds, toolNames } from '../../src/shared/ui'

it('renders every tool from the icon library instead of hand-drawn paths', () => {
  for (const tool of toolIds) {
    const { container, unmount } = render(<ToolIcon tool={tool} />)
    const icon = screen.getByRole('img', { name: toolNames[tool] })
    expect(icon).toHaveAttribute('data-slot', 'tool-icon')
    expect(container.querySelector('path')).toBeNull()
    const image = icon.querySelector('img')
    if (image) {
      expect(image.getAttribute('src')).toMatch(
        /\.svg|^data:image\/svg\+xml|url\("data:image\/svg\+xml/,
      )
      expect(image).toHaveAttribute('alt', '')
    } else {
      expect(icon.style.maskImage || icon.style.webkitMaskImage).toMatch(
        /\.svg|^data:image\/svg\+xml|url\("data:image\/svg\+xml/,
      )
      expect(icon).toHaveClass('bg-current')
    }
    unmount()
  }
})

it('keeps brand colors for colored marks and follows the theme for monochrome ones', () => {
  const { container } = render(
    <>
      <ToolIcon tool="claude" />
      <ToolIcon tool="grok" />
    </>,
  )
  const [claude, grok] = container.querySelectorAll('[data-slot="tool-icon"]')
  expect(claude.querySelector('img')).not.toBeNull()
  expect(grok.querySelector('img')).toBeNull()
})
