import type { DesktopTerminalApi } from '@/shared/desktop'

interface Session {
  featureId: string
  ptyId?: string
  starting?: Promise<boolean>
  failed?: boolean
  exited?: boolean
  buffer: string
  view?: (data: string, replay: boolean) => void
}

const defaultMaxBuffer = 256 * 1024

export function createPtySessions(
  api: DesktopTerminalApi,
  {
    onExit,
    onStart,
    onProcess,
    maxBuffer = defaultMaxBuffer,
  }: {
    onExit(featureId: string, terminalId: string, exitCode: number): void
    onStart?(featureId: string, terminalId: string, shell: string): void
    onProcess?(featureId: string, terminalId: string, name: string): void
    maxBuffer?: number
  },
) {
  const sessions = new Map<string, Session>()
  const byPty = new Map<string, string>()

  api.onData(({ id, data }) => {
    const terminalId = byPty.get(id)
    const session = terminalId ? sessions.get(terminalId) : undefined
    if (!session) return
    session.buffer = (session.buffer + data).slice(-maxBuffer)
    session.view?.(data, false)
  })
  api.onProcess(({ id, name }) => {
    const terminalId = byPty.get(id)
    const session = terminalId ? sessions.get(terminalId) : undefined
    if (terminalId && session) onProcess?.(session.featureId, terminalId, name)
  })
  api.onExit(({ id, exitCode }) => {
    const terminalId = byPty.get(id)
    const session = terminalId ? sessions.get(terminalId) : undefined
    if (!terminalId || !session) return
    session.exited = true
    byPty.delete(id)
    onExit(session.featureId, terminalId, exitCode)
  })

  return {
    async attach(
      terminalId: string,
      request: { featureId: string; cwd: string; cols: number; rows: number },
      write: (data: string, replay: boolean) => void,
    ): Promise<boolean> {
      let session = sessions.get(terminalId)
      if (!session) {
        session = { featureId: request.featureId, buffer: '' }
        sessions.set(terminalId, session)
        const current = session
        current.starting = api
          .create({ cwd: request.cwd, cols: request.cols, rows: request.rows })
          .then((result) => {
            if (result.status !== 'started') {
              current.failed = true
              onExit(request.featureId, terminalId, -1)
              return false
            }
            current.ptyId = result.id
            byPty.set(result.id, terminalId)
            onStart?.(request.featureId, terminalId, result.shell)
            return true
          })
      }
      session.view = write
      if (session.buffer) write(session.buffer, true)
      return (await session.starting) ?? false
    },
    detach(terminalId: string) {
      const session = sessions.get(terminalId)
      if (session) session.view = undefined
    },
    write(terminalId: string, data: string) {
      const session = sessions.get(terminalId)
      if (session?.ptyId && !session.exited) api.write(session.ptyId, data)
    },
    resize(terminalId: string, cols: number, rows: number) {
      const session = sessions.get(terminalId)
      if (session?.ptyId && !session.exited) api.resize(session.ptyId, cols, rows)
    },
    close(terminalId: string) {
      const session = sessions.get(terminalId)
      if (!session) return
      sessions.delete(terminalId)
      if (session.ptyId) byPty.delete(session.ptyId)
      if (session.ptyId && !session.exited) api.close(session.ptyId)
    },
  }
}

export type PtySessions = ReturnType<typeof createPtySessions>
