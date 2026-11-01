import * as React from 'react'
import { cn } from '@/shared/ui/utils'
import { ScrollArea as ScrollAreaPrimitive } from 'radix-ui'

// Styled after VS Code's scrollable element: the scrollbar overlays the content (no gutter),
// stays hidden until the pointer is over the area and fades out 800 ms after it leaves.
function ScrollArea({
  className,
  children,
  type = 'hover',
  scrollHideDelay = 800,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      data-scroll-type={type}
      type={type}
      scrollHideDelay={scrollHideDelay}
      className={cn('relative overflow-hidden', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="size-full rounded-[inherit] outline-none [&>div]:!block focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-ring"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        'z-10 flex touch-none select-none transition-opacity duration-100 data-[state=hidden]:opacity-0 data-[state=hidden]:duration-700 motion-reduce:transition-none',
        // Same look as the native scrollbars in theme.css: 8 px track, 4 px rounded thumb.
        'p-0.5 data-[orientation=horizontal]:h-2 data-[orientation=horizontal]:flex-col data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2',
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-(--scrollbar-thumb) hover:bg-primary active:bg-primary"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
