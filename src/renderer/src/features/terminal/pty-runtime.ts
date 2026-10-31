import type { DesktopApi } from '@/shared/desktop'
import { createPtySessions, type PtySessions } from './pty-sessions'

type ExitListener = (featureId: string, terminalId: string, exitCode: number) => void
type StartListener = (featureId: string, terminalId: string, shell: string) => void
type ProcessListener = StartListener

let runtime:
  | {
      sessions: PtySessions
      listeners: Set<ExitListener>
      startListeners: Set<StartListener>
      processListeners: Set<ProcessListener>
    }
  | undefined

export function getPtyRuntime() {
  const api = (window as { forja?: DesktopApi }).forja?.terminal
  if (!api) return undefined
  if (!runtime) {
    const listeners = new Set<ExitListener>()
    const startListeners = new Set<StartListener>()
    const processListeners = new Set<ProcessListener>()
    runtime = {
      listeners,
      startListeners,
      processListeners,
      sessions: createPtySessions(api, {
        onExit: (featureId, terminalId, exitCode) => {
          for (const listener of listeners) listener(featureId, terminalId, exitCode)
        },
        onStart: (featureId, terminalId, shell) => {
          for (const listener of startListeners) listener(featureId, terminalId, shell)
        },
        onProcess: (featureId, terminalId, name) => {
          for (const listener of processListeners) listener(featureId, terminalId, name)
        },
      }),
    }
  }
  return runtime
}

export function resetPtyRuntime() {
  runtime = undefined
}
