// @vitest-environment node
import { expect, it } from 'vitest'
import type { MenuItemConstructorOptions } from 'electron'
import { appMenuTemplate } from '../../src/main/app-menu'

const flatten = (items: MenuItemConstructorOptions[]): MenuItemConstructorOptions[] =>
  items.flatMap((item) => [
    item,
    ...(Array.isArray(item.submenu) ? flatten(item.submenu as MenuItemConstructorOptions[]) : []),
  ])

it.each(['linux', 'win32', 'darwin'] as const)(
  'leaves Ctrl+W to the renderer on %s so it closes a tab, never the window',
  (platform) => {
    const items = flatten(appMenuTemplate(platform))
    expect(items.some((item) => item.role === 'close')).toBe(false)
    expect(items.some((item) => /W$/i.test(String(item.accelerator ?? '')))).toBe(false)
    // Editing and DevTools shortcuts from the default menu still work.
    for (const role of ['copy', 'paste', 'undo', 'selectAll', 'toggleDevTools', 'quit'])
      expect(
        items.some((item) => item.role === role),
        role,
      ).toBe(true)
  },
)
