import { useRef, type ReactNode } from 'react'
import { ResizablePanel, ResizablePanelGroup, useDefaultLayout, useGroupRef } from '@/shared/ui'
import { layoutStorage } from '@/renderer/src/shared/lib/layout-storage'
import { paneHeaderSize } from './section'
import { stackPanes } from './stack-panes'

const filler = 'pane-filler'

/**
 * A vertical stack of NavigatorSection panes, like a VS Code view container: sizes are
 * remembered under `id`, open panes share the free height and collapsed headers sit at the
 * bottom (all at the top when every pane is collapsed). Put a ResizableHandle between panes.
 */
export function PaneStack({
  id,
  panes,
  children,
}: {
  id: string
  /** Section ids of the panes, in order. */
  panes: string[]
  children: ReactNode
}) {
  const layout = useDefaultLayout({ id, storage: layoutStorage, panelIds: [...panes, filler] })
  const group = useGroupRef()
  const element = useRef<HTMLDivElement | null>(null)
  return (
    <ResizablePanelGroup
      orientation="vertical"
      className="min-h-0 flex-1"
      {...layout}
      groupRef={group}
      elementRef={element}
      onLayoutChanged={(next, meta) => {
        layout.onLayoutChanged(next, meta)
        const height = element.current?.clientHeight
        if (!height) return
        const stacked = stackPanes(next, (paneHeaderSize / height) * 100, filler)
        if (stacked) group.current?.setLayout(stacked)
      }}
    >
      {children}
      {/* Holds the free height only while every pane is collapsed (see stackPanes). */}
      <ResizablePanel id={filler} minSize={0} defaultSize={0} data-slot="pane-filler" />
    </ResizablePanelGroup>
  )
}
