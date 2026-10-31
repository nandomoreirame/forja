// @vitest-environment node
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createPtyService,
  resolveDefaultShell,
  type PtyProcess,
  type PtySpawn,
} from '../../src/core/terminals/pty-service'

const dirs: string[] = []
const killGroup = vi.fn()
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})
const tempDir = () => {
  const dir = mkdtempSync(join(tmpdir(), 'forja-pty-'))
  dirs.push(dir)
  return dir
}

function fakeSpawn() {
  const processes: Array<
    PtyProcess & {
      file: string
      args: string[]
      options: Parameters<PtySpawn>[2]
      emitData(data: string): void
      emitExit(code: number): void
      written: string[]
      sizes: Array<[number, number]>
      killed: boolean
    }
  > = []
  const spawn: PtySpawn = (file, args, options) => {
    let onData: (data: string) => void = () => {}
    let onExit: (event: { exitCode: number }) => void = () => {}
    const proc = {
      file,
      args,
      options,
      pid: 4000 + processes.length,
      written: [] as string[],
      sizes: [] as Array<[number, number]>,
      killed: false,
      onData(listener: (data: string) => void) {
        onData = listener
        return { dispose() {} }
      },
      onExit(listener: (event: { exitCode: number }) => void) {
        onExit = listener
        return { dispose() {} }
      },
      write(data: string) {
        proc.written.push(data)
      },
      resize(cols: number, rows: number) {
        proc.sizes.push([cols, rows])
      },
      kill() {
        proc.killed = true
      },
      emitData: (data: string) => onData(data),
      emitExit: (code: number) => onExit({ exitCode: code }),
    }
    processes.push(proc)
    return proc
  }
  return { spawn, processes }
}

describe('resolveDefaultShell', () => {
  it('prefers the account shell, then $SHELL, then /bin/sh, only when executable', () => {
    const executable = (path: string) => path === '/usr/bin/fish' || path === '/bin/sh'
    expect(
      resolveDefaultShell({ accountShell: '/usr/bin/fish', envShell: '/bin/zsh', executable }),
    ).toBe('/usr/bin/fish')
    expect(
      resolveDefaultShell({ accountShell: '/missing', envShell: '/usr/bin/fish', executable }),
    ).toBe('/usr/bin/fish')
    expect(resolveDefaultShell({ accountShell: 'zsh', envShell: undefined, executable })).toBe(
      '/bin/sh',
    )
  })
})

describe('createPtyService', () => {
  it('spawns the default shell as a login shell in the canonical cwd with a terminal env', async () => {
    const { spawn, processes } = fakeSpawn()
    const dir = tempDir()
    const link = join(dir, 'link')
    symlinkSync(dir, link)
    const service = createPtyService({
      killGroup,
      spawn,
      shell: () => '/bin/sh',
      env: { PATH: '/usr/bin', ELECTRON_RUN_AS_NODE: '1' },
    })
    const result = await service.create(1, { cwd: link, cols: 80, rows: 24 })
    expect(result).toMatchObject({ status: 'started', shell: 'sh', cwd: dir })
    expect(processes[0].file).toBe('/bin/sh')
    expect(processes[0].args).toEqual(['-l'])
    expect(processes[0].options).toMatchObject({
      cwd: dir,
      cols: 80,
      rows: 24,
      name: 'xterm-256color',
    })
    expect(processes[0].options.env).toMatchObject({
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
    })
    expect(processes[0].options.env).not.toHaveProperty('ELECTRON_RUN_AS_NODE')
  })

  it('expands ~ and rejects missing, relative or non-directory cwd values', async () => {
    const { spawn } = fakeSpawn()
    const home = tempDir()
    const service = createPtyService({ killGroup, spawn, shell: () => '/bin/sh', home })
    expect(await service.create(1, { cwd: '~', cols: 80, rows: 24 })).toMatchObject({
      status: 'started',
      cwd: home,
    })
    expect(await service.create(1, { cwd: 'relative/dir', cols: 80, rows: 24 })).toEqual({
      status: 'error',
    })
    expect(await service.create(1, { cwd: join(home, 'missing'), cols: 80, rows: 24 })).toEqual({
      status: 'error',
    })
    expect(await service.create(1, { cwd: '/etc/hostname', cols: 80, rows: 24 })).toEqual({
      status: 'error',
    })
  })

  it('routes data and exit to the owner and only lets the owner write, resize or close', async () => {
    const { spawn, processes } = fakeSpawn()
    const onData = vi.fn()
    const onExit = vi.fn()
    const service = createPtyService({ killGroup, spawn, shell: () => '/bin/sh', onData, onExit })
    const started = await service.create(7, { cwd: tempDir(), cols: 80, rows: 24 })
    if (started.status !== 'started') throw new Error('not started')
    processes[0].emitData('hello')
    expect(onData).toHaveBeenCalledWith(7, started.id, 'hello')
    expect(service.write(8, started.id, 'ls\r')).toBe(false)
    expect(service.write(7, started.id, 'ls\r')).toBe(true)
    expect(processes[0].written).toEqual(['ls\r'])
    expect(service.resize(7, started.id, 0, 24)).toBe(false)
    expect(service.resize(7, started.id, 120, 40)).toBe(true)
    expect(processes[0].sizes).toEqual([[120, 40]])
    expect(service.close(8, started.id)).toBe(false)
    processes[0].emitExit(0)
    expect(onExit).toHaveBeenCalledWith(7, started.id, 0)
    expect(service.write(7, started.id, 'x')).toBe(false)
  })

  it('rejects oversized input and kills every session of a closed owner', async () => {
    const { spawn, processes } = fakeSpawn()
    const service = createPtyService({ killGroup, spawn, shell: () => '/bin/sh' })
    const cwd = tempDir()
    const first = await service.create(1, { cwd, cols: 80, rows: 24 })
    await service.create(1, { cwd, cols: 80, rows: 24 })
    await service.create(2, { cwd, cols: 80, rows: 24 })
    if (first.status !== 'started') throw new Error('not started')
    expect(service.write(1, first.id, 'x'.repeat(70_000))).toBe(false)
    expect(await service.create(1, { cwd, cols: 9999, rows: 24 })).toEqual({ status: 'error' })
    service.closeOwner(1)
    expect(processes.map((p) => p.killed)).toEqual([true, true, false])
    expect(killGroup).toHaveBeenCalledWith(processes[0].pid)
    service.closeAll()
    expect(processes.every((p) => p.killed)).toBe(true)
  })
})
