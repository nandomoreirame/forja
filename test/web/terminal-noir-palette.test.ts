import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { expect, it } from 'vitest'

// Terminal Noir dark palette (palette/palette.json, terminalnoir.web.app/palette).
const noir = {
  'surface.base': '#0b0b0c',
  'surface.raised': '#121214',
  'surface.elevated': '#18181b',
  'surface.border': '#222226',
  'surface.outline': '#64646b',
  'surface.selection': '#52525b',
  'text.primary': '#f4f4f5',
  'text.muted': '#a1a1aa',
  'text.faint': '#6b6b74',
  'accent.primary': '#f5a623',
  'accent.onPrimary': '#0b0b0c',
  'accent.success': '#34d399',
  'accent.warning': '#facf9e',
  'accent.error': '#ffb7b0',
  'accent.info': '#79c0ff',
} as const
const ansi = [
  '#18181b',
  '#ff7b72',
  '#34d399',
  '#f5a623',
  '#58a6ff',
  '#bc8cff',
  '#39c5cf',
  '#a1a1aa',
  '#808089',
  '#ffb7b0',
  '#56d364',
  '#facf9e',
  '#79c0ff',
  '#d2a8ff',
  '#56d4dd',
  '#f4f4f5',
]

// Each Forja theme token and the palette role it takes (roles from the theme's VS Code port).
const tokens: Record<string, keyof typeof noir> = {
  background: 'surface.base',
  foreground: 'text.primary',
  card: 'surface.raised',
  'card-foreground': 'text.primary',
  popover: 'surface.elevated',
  'popover-foreground': 'text.primary',
  primary: 'accent.primary',
  'primary-foreground': 'accent.onPrimary',
  secondary: 'surface.elevated',
  'secondary-foreground': 'text.primary',
  muted: 'surface.elevated',
  'muted-foreground': 'text.muted',
  accent: 'surface.border',
  'accent-foreground': 'text.primary',
  destructive: 'accent.error',
  border: 'surface.border',
  input: 'surface.border',
  ring: 'accent.primary',
  sidebar: 'surface.raised',
  'sidebar-foreground': 'text.primary',
  'sidebar-primary': 'accent.primary',
  'sidebar-primary-foreground': 'accent.onPrimary',
  'sidebar-accent': 'surface.border',
  'sidebar-accent-foreground': 'text.primary',
  'sidebar-border': 'surface.border',
  'sidebar-ring': 'accent.primary',
  success: 'accent.success',
  warning: 'accent.warning',
  info: 'accent.info',
}

const darkBlock = () => {
  const css = readFileSync('src/shared/styles/theme.css', 'utf8')
  const start = css.indexOf(':root,\n.dark {')
  return css.slice(start, css.indexOf('\n}', start))
}

it.each(Object.entries(tokens))('maps --%s to Terminal Noir %s', (token, role) => {
  const value = darkBlock().match(new RegExp(`\\n\\s*--${token}: (#[0-9a-fA-F]{6});`))?.[1]
  expect(value?.toLowerCase()).toBe(noir[role])
})

it('uses the Terminal Noir ANSI colors in the integrated terminal', () => {
  const source = readFileSync('src/renderer/src/features/terminal/xterm-view.tsx', 'utf8')
  const names = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']
  const keys = [...names, ...names.map((n) => 'bright' + n[0].toUpperCase() + n.slice(1))]
  keys.forEach((key, index) => {
    const value = source.match(new RegExp(`\\n\\s*${key}: '(#[0-9a-fA-F]{6})'`))?.[1]
    expect(value?.toLowerCase(), key).toBe(ansi[index])
  })
})

it('hardcodes no color outside the palette in app code', () => {
  const allowed = new Set<string>([...Object.values(noir), ...ansi])
  // Mock screenshots are fixture images, not app chrome.
  const grep = spawnSync(
    'git',
    [
      'grep',
      '-noiE',
      '--untracked',
      '#[0-9a-f]{6}\\b',
      '--',
      'src',
      ':!src/renderer/src/shared/api/mock-*',
    ],
    { encoding: 'utf8' },
  )
  const offPalette = grep.stdout
    .split('\n')
    .filter(Boolean)
    .filter((line) => !allowed.has(line.slice(line.lastIndexOf(':') + 1).toLowerCase()))
  expect(offPalette).toEqual([])
})
