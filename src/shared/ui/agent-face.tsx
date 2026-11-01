import { ToolIcon, type ToolId } from './tool-icon'

export type AgentRole = 'smith' | 'research' | 'planner' | 'implementer' | 'tester' | 'reviewer'

/** Face color per agent; the Ferreiro shares the amber and is told apart by its mark. */
export const faceColors: Record<AgentRole, string> = {
  smith: 'var(--primary)',
  research: 'var(--warning)',
  planner: 'var(--success)',
  implementer: 'var(--primary)',
  tester: 'var(--destructive)',
  reviewer: 'var(--info)',
}

/**
 * Minimal agent avatar: a rounded square in the agent color with two eyes. The mouth only
 * exists while the agent speaks, opening and closing; reduced motion keeps it still.
 */
export function AgentFace({
  agent,
  tool,
  size = 28,
  speaking = false,
}: {
  agent: AgentRole
  tool: ToolId
  size?: number
  speaking?: boolean
}) {
  const badge = Math.max(12, Math.round(size * 0.32))
  return (
    <span
      data-slot="agent-face-frame"
      className="relative inline-flex shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        data-slot="agent-face"
        aria-hidden="true"
        viewBox="0 0 24 24"
        data-speaking={speaking ? 'true' : undefined}
        className="size-full"
      >
        <rect
          data-slot="face-body"
          x="1"
          y="1"
          width="22"
          height="22"
          rx="6"
          fill={faceColors[agent]}
        />
        {agent === 'smith' ? (
          // Anvil with a hammer above it, in the eye color.
          <g data-slot="smith-mark" fill="var(--background)">
            <rect x="10.5" y="3" width="4" height="1.6" rx="0.4" />
            <rect x="12" y="4.6" width="1" height="1.4" />
            <path d="M8 6.4h8.5l-1.6 1.6H9.6z" />
          </g>
        ) : null}
        <rect
          data-slot="face-eye"
          x="7"
          y="9.5"
          width="3"
          height="4"
          rx="1.5"
          fill="var(--background)"
        />
        <rect
          data-slot="face-eye"
          x="14"
          y="9.5"
          width="3"
          height="4"
          rx="1.5"
          fill="var(--background)"
        />
        {speaking ? (
          <rect
            data-slot="face-mouth"
            x="9.5"
            y="16"
            width="5"
            height="2.5"
            rx="1.25"
            fill="var(--background)"
            className="origin-center [transform-box:fill-box] motion-safe:animate-[face-talk_0.32s_ease-in-out_infinite]"
          />
        ) : null}
      </svg>
      {/* The tool badge grows with the face (18 px at 56 px), never under 12 px. */}
      <span
        className="absolute -right-1 -bottom-1 inline-flex rounded-full border border-border bg-secondary p-px"
        style={{ width: badge, height: badge }}
      >
        <ToolIcon tool={tool} className="size-full" />
      </span>
    </span>
  )
}
