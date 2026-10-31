import type { DesktopApi } from '@/shared/desktop'
import { createPtySessions, type PtySessions } from './pty-sessions'

type ExitListener = (featureId: string, terminalId: string, exitCode: number) => void
type StartListener = (featureId: string, terminalId: string, shell: string) => void

let runtime:
  | { sessions: PtySessions; listeners: Set<ExitListener>; startListeners: Set<StartListener> }
  | undefined

export function getPtyRuntime() {
  const api = (window as { forja?: DesktopApi }).forja?.terminal
  if (!api) return undefined
  if (!runtime) {
    const listeners = new Set<ExitListener>()
    const startListeners = new Set<StartListener>()
    runtime = {
      listeners,
      startListeners,
      sessions: createPtySessions(api, {
        onExit: (featureId, terminalId, exitCode) => {
          for (const listener of listeners) listener(featureId, terminalId, exitCode)
        },
        onStart: (featureId, terminalId, shell) => {
          for (const listener of startListeners) listener(featureId, terminalId, shell)
        },
      }),
    }
  }
  return runtime
}

export function resetPtyRuntime() {
  runtime = undefined
}
