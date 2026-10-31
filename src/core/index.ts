import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createDatabase } from './database'
import { coreRequestSchema, type CoreResponse } from '../shared/contracts'

const dataDir = process.env.FORJA_DATA_DIR
if (!dataDir) throw new Error('FORJA_DATA_DIR is required')
mkdirSync(dataDir, { recursive: true })
const db = createDatabase(join(dataDir, 'forja.db'))

process.parentPort.on('message', ({ data }: { data: unknown }) => {
  const request = coreRequestSchema.safeParse(data)
  if (!request.success) return
  process.parentPort.postMessage({
    id: request.data.id,
    result: { status: 'ready' },
  } satisfies CoreResponse)
})
process.on('exit', () => db.close())
process.on('SIGTERM', () => process.exit(0))
