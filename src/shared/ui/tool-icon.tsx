import claudeMark from '@lobehub/icons-static-svg/icons/claude-color.svg'
import codexMark from '@lobehub/icons-static-svg/icons/codex-color.svg'
import opencodeMark from '@lobehub/icons-static-svg/icons/opencode.svg'
import antigravityMark from '@lobehub/icons-static-svg/icons/antigravity-color.svg'
import grokMark from '@lobehub/icons-static-svg/icons/grok.svg'
import { cn } from './utils'

export const toolIds = ['claude', 'codex', 'opencode', 'agy', 'grok'] as const
export type ToolId = (typeof toolIds)[number]

export const toolNames: Record<ToolId, string> = {
  claude: 'Claude',
  codex: 'Codex',
  opencode: 'OpenCode',
  agy: 'Antigravity',
  grok: 'Grok',
}

// Marks come from @lobehub/icons-static-svg (MIT). Colored marks render as images to keep their
// brand colors; monochrome marks render as a CSS mask over currentColor so they follow the theme.
const marks: Record<ToolId, { src: string; colored: boolean }> = {
  claude: { src: claudeMark, colored: true },
  codex: { src: codexMark, colored: true },
  opencode: { src: opencodeMark, colored: false },
  agy: { src: antigravityMark, colored: true },
  grok: { src: grokMark, colored: false },
}

export function ToolIcon({ tool, className }: { tool: ToolId; className?: string }) {
  const mark = marks[tool]
  const base = cn('inline-block size-3 shrink-0', className)
  if (mark.colored)
    return (
      <span role="img" aria-label={toolNames[tool]} data-slot="tool-icon" className={base}>
        <img src={mark.src} alt="" className="block size-full" draggable={false} />
      </span>
    )
  const mask = `url("${mark.src}") center / contain no-repeat`
  return (
    <span
      role="img"
      aria-label={toolNames[tool]}
      data-slot="tool-icon"
      className={cn(base, 'bg-current text-foreground')}
      style={{ mask, WebkitMask: mask, maskImage: `url("${mark.src}")` }}
    />
  )
}
