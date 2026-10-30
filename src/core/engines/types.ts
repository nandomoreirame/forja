export type EngineId = 'claude' | 'codex' | 'gemini' | 'opencode' | 'pi'

export interface EngineCapabilities {
  resume: boolean
  images: boolean
  approvals: boolean
  usage: boolean
}

export interface EngineTurn {
  prompt: string
  cwd: string
  sessionId?: string
  signal: AbortSignal
}

export type EngineEvent =
  | { type: 'text'; delta: string }
  | { type: 'session'; sessionId: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

export interface EngineAdapter {
  id: EngineId
  capabilities: EngineCapabilities
  run(turn: EngineTurn): AsyncIterable<EngineEvent>
}
