import { useEffect, useState } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'

export type FeatureStatusState =
  'working' | 'waiting' | 'done' | 'idle' | 'interrupted' | 'failed' | 'ended'
export type FeatureState =
  | FeatureStatusState
  | 'running'
  | 'stalled'
  | 'completed'
  | 'integrated'
  | 'draft'
  | 'abandoned'
  | 'approved'
  | 'stale'

const frames = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
const glyphs = {
  working: '⠋',
  waiting: '‖',
  done: '✔',
  idle: '●',
  interrupted: '↻',
  failed: '✗',
  ended: '×',
}
const colors = {
  working: 'text-primary',
  waiting: 'text-warning',
  done: 'text-success',
  idle: 'text-muted-foreground',
  interrupted: 'text-destructive',
  failed: 'text-destructive',
  ended: 'text-muted-foreground',
}
const states: Record<FeatureState, FeatureStatusState> = {
  working: 'working',
  running: 'working',
  waiting: 'waiting',
  stalled: 'waiting',
  done: 'done',
  completed: 'done',
  integrated: 'done',
  idle: 'idle',
  draft: 'idle',
  interrupted: 'interrupted',
  failed: 'failed',
  ended: 'ended',
  abandoned: 'ended',
  approved: 'done',
  stale: 'waiting',
}

export function statusGlyph(state: FeatureState) {
  return glyphs[states[state]]
}

export function FeatureStatus({
  state,
  label,
  slot,
}: {
  state: FeatureState
  label: string
  slot?: string
}) {
  const status = states[state]
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const spinning = status === 'working' && !reducedMotion
  useEffect(() => {
    if (!spinning) return
    const timer = window.setInterval(() => setFrame((value) => (value + 1) % frames.length), 80)
    return () => window.clearInterval(timer)
  }, [spinning])
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="img"
            aria-label={label}
            data-feature-status={status}
            data-slot={slot}
            data-spinning={spinning ? 'true' : undefined}
            className={`inline-flex shrink-0 items-center justify-center font-mono leading-none ${colors[status]}`}
            style={{ width: 12, minWidth: 12, maxWidth: 12 }}
          >
            {status === 'working' ? (reducedMotion ? '⠿' : frames[frame]) : statusGlyph(state)}
          </span>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
