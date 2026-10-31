import { randomUUID } from 'node:crypto'
import { realpath, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, isAbsolute, join } from 'node:path'

export interface PtyProcess {
  pid: number
  readonly process?: string
  onData(listener: (data: string) => void): { dispose(): void }
  onExit(listener: (event: { exitCode: number }) => void): { dispose(): void }
  write(data: string): void
  resize(cols: number, rows: number): void
  kill(signal?: string): void
}

export type PtySpawn = (
  file: string,
  args: string[],
  options: { cwd: string; cols: number; rows: number; name: string; env: Record<string, string> },
) => PtyProcess

export type PtyCreateResult =
  { status: 'started'; id: string; shell: string; cwd: string } | { status: 'error' }

export interface PtyServiceOptions {
  spawn: PtySpawn
  shell(): string
  env?: Record<string, string | undefined>
  home?: string
  onData?(owner: number, id: string, data: string): void
  onExit?(owner: number, id: string, exitCode: number): void
  killGroup?(pid: number): void
  onProcess?(owner: number, id: string, name: string): void
  processPollMs?: number
}

const maxInput = 64 * 1024
const validSize = (cols: number, rows: number) =>
  Number.isInteger(cols) &&
  Number.isInteger(rows) &&
  cols >= 2 &&
  cols <= 500 &&
  rows >= 1 &&
  rows <= 300

export function resolveDefaultShell({
  accountShell,
  envShell,
  executable,
}: {
  accountShell?: string
  envShell?: string
  executable(path: string): boolean
}): string {
  for (const candidate of [accountShell, envShell])
    if (candidate && isAbsolute(candidate) && executable(candidate)) return candidate
  return '/bin/sh'
}

function shellEnv(source: Record<string, string | undefined>): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(source))
    if (value !== undefined && !key.startsWith('ELECTRON_') && key !== 'NODE_OPTIONS')
      env[key] = value
  env.TERM = 'xterm-256color'
  env.COLORTERM = 'truecolor'
  return env
}

export function createPtyService({
  spawn,
  shell,
  env = process.env,
  home = homedir(),
  onData,
  onExit,
  killGroup = (pid) => process.kill(-pid, 'SIGHUP'),
  onProcess,
  processPollMs = 1000,
}: PtyServiceOptions) {
  const sessions = new Map<
    string,
    {
      owner: number
      process: PtyProcess
      foreground?: string
      poll?: ReturnType<typeof setInterval>
    }
  >()
  const foregroundOf = (child: PtyProcess) => {
    try {
      const raw = child.process
      return raw ? basename(raw).replace(/^-/, '') || undefined : undefined
    } catch {
      return undefined
    }
  }
  const owned = (owner: number, id: string) => {
    const session = sessions.get(id)
    return session && session.owner === owner ? session : undefined
  }
  const stop = (id: string) => {
    const session = sessions.get(id)
    if (!session) return
    sessions.delete(id)
    clearInterval(session.poll)
    try {
      killGroup(session.process.pid)
    } catch {
      // The group may already be gone; the direct kill below still covers the shell.
    }
    session.process.kill()
  }

  return {
    async create(
      owner: number,
      request: { cwd: string; cols: number; rows: number },
    ): Promise<PtyCreateResult> {
      if (!validSize(request.cols, request.rows) || typeof request.cwd !== 'string')
        return { status: 'error' }
      const raw = request.cwd === '~' ? home : request.cwd.replace(/^~\//, `${home}/`)
      if (!isAbsolute(raw) || raw.includes('\0')) return { status: 'error' }
      let cwd: string
      try {
        cwd = await realpath(raw)
        if (!(await stat(cwd)).isDirectory()) return { status: 'error' }
      } catch {
        return { status: 'error' }
      }
      const file = shell()
      const id = randomUUID()
      let child: PtyProcess
      try {
        child = spawn(file, ['-l'], {
          cwd,
          cols: request.cols,
          rows: request.rows,
          name: 'xterm-256color',
          env: shellEnv({ ...env, HOME: env.HOME ?? home, PWD: join(cwd) }),
        })
      } catch {
        return { status: 'error' }
      }
      const session: {
        owner: number
        process: PtyProcess
        foreground?: string
        poll?: ReturnType<typeof setInterval>
      } = { owner, process: child, foreground: foregroundOf(child) }
      sessions.set(id, session)
      if (onProcess)
        session.poll = setInterval(() => {
          const name = foregroundOf(child)
          if (!name || name === session.foreground) return
          session.foreground = name
          onProcess(owner, id, name)
        }, processPollMs)
      child.onData((data) => onData?.(owner, id, data))
      child.onExit(({ exitCode }) => {
        if (!sessions.has(id)) return
        sessions.delete(id)
        clearInterval(session.poll)
        onExit?.(owner, id, exitCode)
      })
      return { status: 'started', id, shell: basename(file), cwd }
    },
    write(owner: number, id: string, data: string) {
      const session = owned(owner, id)
      if (!session || typeof data !== 'string' || data.length > maxInput) return false
      session.process.write(data)
      return true
    },
    resize(owner: number, id: string, cols: number, rows: number) {
      const session = owned(owner, id)
      if (!session || !validSize(cols, rows)) return false
      session.process.resize(cols, rows)
      return true
    },
    close(owner: number, id: string) {
      if (!owned(owner, id)) return false
      stop(id)
      return true
    },
    closeOwner(owner: number) {
      for (const [id, session] of sessions) if (session.owner === owner) stop(id)
    },
    closeAll() {
      for (const id of [...sessions.keys()]) stop(id)
    },
  }
}

export type PtyService = ReturnType<typeof createPtyService>
