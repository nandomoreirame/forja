import { cn } from './utils'

// One tab look for every strip in the app (editor and terminal panels), after VS Code:
// the strip has no inset and its bottom line is an inset shadow, so the active tab can paint
// over it even inside a horizontal scroll clip. Tabs fill the strip height, so the active one
// uses the frame's top border and draws only its sides; a first tab keeps the frame's left
// border instead of doubling it. Inactive tabs have no box. Each strip picks its own display
// (flex, or grid when close buttons overlay the tabs).
export const tabStripClassName = 'h-9 min-w-0 items-stretch shadow-[inset_0_-1px_0_var(--border)]'

export function tabClassName(active: boolean) {
  return cn(
    'group/tab flex min-w-0 shrink-0 items-center self-stretch whitespace-nowrap border-x text-[11px] first:border-l-transparent',
    active
      ? 'border-border bg-background font-medium text-foreground'
      : 'border-transparent text-muted-foreground hover:text-foreground data-[hovered=true]:text-foreground',
  )
}
