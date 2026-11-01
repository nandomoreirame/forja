import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { FeatureTabs } from '../../src/widgets/workbench'
import { TerminalPreview } from '../../src/widgets/terminal'
import { tabClassName, tabStripClassName } from '../../src/shared/ui/tab-strip'

const items = ['One', 'Two', 'Three'].map((label) => ({
  id: label,
  label,
  state: 'idle' as const,
}))

it('draws VS Code tabs: flush left, full height, plain inactive tabs, open-bottom active tab', () => {
  expect(tabStripClassName).not.toMatch(/\bpx-\d/)
  // The bottom line is an inset shadow so the active tab can cover it inside the scroll clip.
  expect(tabStripClassName).toMatch(/shadow-\[inset_0_-1px_0_var\(--border\)\]/)
  const active = tabClassName(true)
  const inactive = tabClassName(false)
  // No gap above the active tab: its top is the frame border, so it draws only its sides.
  expect(active).toMatch(/\bself-stretch\b/)
  expect(active).toMatch(/\bborder-x\b/)
  expect(active).not.toMatch(/\bborder-t\b|border-t-primary/)
  expect(active).toMatch(/\bbg-background\b/)
  expect(active).toMatch(/first:border-l-transparent/)
  expect(inactive).toMatch(/\bborder-transparent\b/)
})

it('uses the shared tab style for editor and terminal tabs', () => {
  const { container } = render(
    <>
      <FeatureTabs items={items} selectedId="Two" onSelect={() => {}} />
      <TerminalPreview
        tabs={items.map((item) => ({ ...item, stateLabel: '' }))}
        activeId="Two"
        output={[]}
        addLabel="New terminal"
        collapseLabel="Collapse"
      />
    </>,
  )
  const strips = container.querySelectorAll('[data-slot="tab-strip"]')
  expect(strips).toHaveLength(2)
  for (const strip of strips) expect(strip.className).toContain(tabStripClassName)
  const [editorTab, terminalTab] = screen.getAllByRole('tab', { name: /Two/ })
  expect(editorTab.closest('[data-slot="tab"]')!.className).toBe(tabClassName(true))
  expect(terminalTab.closest('[data-slot="tab"]')!.className).toBe(tabClassName(true))
})
