import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import type { PtySessions } from './pty-sessions'

const theme = {
  background: '#0e0e0e',
  foreground: '#e4e4e7',
  cursor: '#F5A623',
  cursorAccent: '#0e0e0e',
  selectionBackground: '#F5A62355',
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
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      fontSize: 12,
      lineHeight: 1.25,
      cursorBlink: true,
      scrollback: 5000,
      theme,
    })
    const fit = new FitAddon()
    terminal.loadAddon(fit)
    terminal.open(node)
    const refit = () => {
      try {
        fit.fit()
      } catch {
        // The host can be hidden or zero-sized while the panel animates.
      }
    }
    refit()
    const input = terminal.onData((data) => sessions.write(terminalId, data))
    const resize = terminal.onResize(({ cols, rows }) => sessions.resize(terminalId, cols, rows))
    void sessions.attach(
      terminalId,
      { featureId, cwd, cols: terminal.cols, rows: terminal.rows },
      (data) => terminal.write(data),
    )
    const observer = new ResizeObserver(refit)
    observer.observe(node)
    terminal.focus()
    return () => {
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
      className="min-h-40 flex-1 overflow-hidden bg-[#0e0e0e] px-2 py-1"
    />
  )
}
