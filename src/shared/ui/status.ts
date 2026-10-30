export type UiState =
  'draft' | 'approved' | 'stale' | 'waiting' | 'running' | 'completed' | 'failed' | 'interrupted'

export function statusTone(state: UiState): 'muted' | 'accent' | 'danger' {
  if (state === 'running' || state === 'waiting') return 'accent'
  if (state === 'failed' || state === 'stale') return 'danger'
  return 'muted'
}
