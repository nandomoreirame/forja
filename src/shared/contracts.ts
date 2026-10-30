import { z } from 'zod'

export const coreRequestSchema = z.object({ id: z.string().min(1).max(128), method: z.literal('health') }).strict()
export type CoreRequest = z.infer<typeof coreRequestSchema>
export type CoreResponse = { id: string; result: { status: 'ready' } }
