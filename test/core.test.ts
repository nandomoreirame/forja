// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createDatabase } from '../src/core/database'
import { coreRequestSchema } from '../src/shared/contracts'

describe('Core boundaries', () => {
  it('rejects unsupported commands and malformed request identifiers', () => {
    expect(coreRequestSchema.safeParse({ id: 'request-1', method: 'health' }).success).toBe(true)
    expect(coreRequestSchema.safeParse({ id: '', method: 'health' }).success).toBe(false)
    expect(coreRequestSchema.safeParse({ id: 'request-1', method: 'execute' }).success).toBe(false)
  })
  it('initializes the versioned local schema and stores settings', () => {
    const db = createDatabase(':memory:')
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('theme', 'dark')
    expect(db.prepare('SELECT value FROM settings WHERE key = ?').get('theme')).toEqual({ value: 'dark' })
    expect(db.prepare('PRAGMA user_version').get()).toEqual({ user_version: 1 })
    db.close()
  })
})
