import { ToolIcon, type ToolId } from './tool-icon'

export type AgentRole = 'research' | 'planner' | 'implementer' | 'tester' | 'reviewer'

export interface AgentSprite {
  /** Twelve rows of twelve characters; `.` is transparent. */
  rows: readonly string[]
  /** Maps each sprite character to a Terminal Noir token. */
  palette: Readonly<Record<string, string>>
}

// One silhouette family (same head and body) with a role accessory and accent.
const shared = {
  h: 'var(--foreground)',
  e: 'var(--background)',
  m: 'var(--background)',
  b: 'var(--muted-foreground)',
}

export const agentSprites: Record<AgentRole, AgentSprite> = {
  // Magnifying glass.
  research: {
    rows: [
      '............',
      '...hhhhhh...',
      '..hhhhhhhh..',
      '..hhehhehh..',
      '..hhhhhhhh..',
      '...hhmmhh.kk',
      '....bbbb.k.k',
      '..bbbbbbbk.k',
      '.bbbbbbbbbkk',
      '.bbaabbbbk..',
      '..bb..bbk...',
      '..bb..bb....',
    ],
    palette: { ...shared, a: 'var(--primary)', k: 'var(--primary)' },
  },
  // Clipboard.
  planner: {
    rows: [
      '....aaaa....',
      '...hhhhhh...',
      '..hhhhhhhh..',
      '..hhehhehh..',
      '..hhhhhhhh..',
      '...hhmmhh...',
      'kkk.bbbb....',
      'kwk.bbbbbb..',
      'kkkbbbbbbbb.',
      'kwkbbaabbbb.',
      'kkk.bb..bb..',
      '....bb..bb..',
    ],
    palette: { ...shared, a: 'var(--success)', k: 'var(--foreground)', w: 'var(--background)' },
  },
  // Wrench.
  implementer: {
    rows: [
      '..aaaaaaaa..',
      '...hhhhhh...',
      '..hhhhhhhh..',
      '..hhehhehh..',
      '..hhhhhhhh..',
      '...hhmmhh..k',
      '....bbbb..kk',
      '..bbbbbbbkk.',
      '.bbbbbbbkkb.',
      '.bbaabbkkbb.',
      '..bb..bk.b..',
      '..bb..bb....',
    ],
    palette: { ...shared, a: 'var(--primary)', k: 'var(--foreground)' },
  },
  // Flask.
  tester: {
    rows: [
      '.....a......',
      '...hhhhhh...',
      '..hhhhhhhh..',
      '..hhehhehh..',
      '..hhhhhhhh..',
      '...hhmmhh...',
      '....bbbb.kk.',
      '..bbbbbbbkk.',
      '.bbbbbbbkaak',
      '.bbaabbbkaak',
      '..bb..bbkkkk',
      '..bb..bb....',
    ],
    palette: { ...shared, a: 'var(--destructive)', k: 'var(--foreground)' },
  },
  // Glasses and a check.
  reviewer: {
    rows: [
      '....a..a....',
      '...hhhhhh...',
      '..hhhhhhhh..',
      '.kkkkhkkkkk.',
      '..kekkkekh..',
      '...hhmmhh...',
      '....bbbb....',
      '..bbbbbbbb..',
      '.bbbbbbbbsb.',
      '.bbaabbbsbb.',
      '..bb.sbsbb..',
      '..bb..sbb...',
    ],
    palette: { ...shared, a: 'var(--success)', k: 'var(--primary)', s: 'var(--success)' },
  },
}

export function AgentMascot({
  role,
  tool,
  size = 28,
}: {
  role: AgentRole
  tool: ToolId
  size?: number
}) {
  const { rows, palette } = agentSprites[role]
  return (
    <span
      data-slot="agent-mascot-frame"
      className="relative inline-flex shrink-0 items-center justify-center rounded-md bg-background p-[3px]"
      style={{ width: size, height: size }}
    >
      <svg
        data-slot="agent-mascot"
        aria-hidden="true"
        viewBox="0 0 12 12"
        shapeRendering="crispEdges"
        className="size-full"
      >
        {rows.flatMap((row, y) =>
          [...row].map((char, x) =>
            char === '.' ? null : (
              <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={palette[char]} />
            ),
          ),
        )}
      </svg>
      <span className="absolute -right-1 -bottom-1 inline-flex rounded-full border border-border bg-secondary p-px">
        <ToolIcon tool={tool} className="size-2.5" />
      </span>
    </span>
  )
}
