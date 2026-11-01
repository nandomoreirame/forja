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

const theme = {
  background: '#0e0e0e',
  foreground: '#e4e4e7',
  cursor: '#F5A623',
  cursorAccent: '#0e0e0e',
  selectionBackground: '#F5A62355',
  // VS Code's default integrated terminal palette.
  black: '#000000',
  red: '#cd3131',
  green: '#0dbc79',
  yellow: '#e5e510',
  blue: '#2472c8',
  magenta: '#bc3fbc',
  cyan: '#11a8cd',
  white: '#e5e5e5',
  brightBlack: '#666666',
  brightRed: '#f14c4c',
  brightGreen: '#23d18b',
  brightYellow: '#f5f543',
  brightBlue: '#3b8eea',
  brightMagenta: '#d670d6',
  brightCyan: '#29b8db',
  brightWhite: '#e5e5e5',
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
      className="min-h-0 flex-1 overflow-hidden bg-[#0e0e0e] px-2 py-1"
    />
  )
}
