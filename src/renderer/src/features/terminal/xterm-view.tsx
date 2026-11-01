import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import '@xterm/xterm/css/xterm.css'
import type { PtySessions } from './pty-sessions'

// Mirrors the user's VS Code terminal: a Nerd Font first so prompt glyphs render,
// then the design token so the terminal follows --font-mono.
const nerdFonts =
  "'FiraCode Nerd Font', 'JetBrainsMono Nerd Font', 'FiraMono Nerd Font Propo', 'Symbols Nerd Font Mono'"
const fallbackMono = "'JetBrains Mono', ui-monospace, monospace"

function monoFontStack(): string {
  if (typeof document === 'undefined') return fallbackMono
  const token = getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim()
  return token || fallbackMono
}

export function terminalFont() {
  return {
    fontFamily: `${nerdFonts}, ${monoFontStack()}`,
    fontSize: 12,
    lineHeight: 1.4,
  }
}

// Terminal Noir terminal colors (palette.json ansi, as in the theme's VS Code port).
const theme = {
  background: '#0b0b0c',
  foreground: '#f4f4f5',
  cursor: '#f5a623',
  cursorAccent: '#0b0b0c',
  selectionBackground: '#52525b',
  black: '#18181b',
  red: '#ff7b72',
  green: '#34d399',
  yellow: '#f5a623',
  blue: '#58a6ff',
  magenta: '#bc8cff',
  cyan: '#39c5cf',
  white: '#a1a1aa',
  brightBlack: '#808089',
  brightRed: '#ffb7b0',
  brightGreen: '#56d364',
  brightYellow: '#facf9e',
  brightBlue: '#79c0ff',
  brightMagenta: '#d2a8ff',
  brightCyan: '#56d4dd',
  brightWhite: '#f4f4f5',
}

export function XtermView({
  terminalId,
  featureId,
  cwd,
  sessions,
  label,
}: {
  terminalId: string
  featureId: string
  cwd: string
  sessions: PtySessions
  label: string
}) {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const node = host.current
    if (!node) return
    const terminal = new Terminal({
      ...terminalFont(),
      customGlyphs: true,
      rescaleOverlappingGlyphs: true,
      cursorBlink: true,
      scrollback: 5000,
      theme,
    })
    const fit = new FitAddon()
    terminal.loadAddon(fit)
    terminal.open(node)
    // WebGL draws block and box characters as full cells (like VS Code); fall back to DOM.
    try {
      const webgl = new WebglAddon()
      webgl.onContextLoss(() => webgl.dispose())
      terminal.loadAddon(webgl)
    } catch {
      // Keep the DOM renderer when WebGL is unavailable.
    }
    const refit = () => {
      try {
        fit.fit()
      } catch {
        // The host can be hidden or zero-sized while the panel animates.
      }
    }
    refit()
    // Replaying the transcript makes xterm answer old queries (device attributes,
    // cursor reports); those answers must not reach the live shell as input.
    let replaying = 0
    const input = terminal.onData((data) => {
      if (!replaying) sessions.write(terminalId, data)
    })
    const resize = terminal.onResize(({ cols, rows }) => sessions.resize(terminalId, cols, rows))
    void sessions.attach(
      terminalId,
      { featureId, cwd, cols: terminal.cols, rows: terminal.rows },
      (data, replay) => {
        if (!replay) return terminal.write(data)
        replaying += 1
        terminal.write(data, () => {
          replaying -= 1
        })
      },
    )
    const observer = new ResizeObserver(refit)
    observer.observe(node)
    // Focus after the click that selected this tab finishes, like VS Code does.
    const focusFrame = requestAnimationFrame(() => terminal.focus())
    return () => {
      cancelAnimationFrame(focusFrame)
      observer.disconnect()
      input.dispose()
      resize.dispose()
      sessions.detach(terminalId)
      terminal.dispose()
    }
  }, [terminalId, featureId, cwd, sessions])
  return (
    <div
      ref={host}
      role="group"
      aria-label={label}
      className="min-h-0 flex-1 overflow-hidden bg-background px-2 py-1"
    />
  )
}
