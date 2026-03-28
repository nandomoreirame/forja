import * as React from "react"
import { HoverCard as HoverCardPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function HoverCard({
  openDelay = 400,
  closeDelay = 200,
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Root>) {
  return (
    <HoverCardPrimitive.Root
      data-slot="hover-card"
      openDelay={openDelay}
      closeDelay={closeDelay}
      {...props}
    />
  )
}

function HoverCardTrigger({
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Trigger>) {
  return <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />
}

function HoverCardContent({
  className,
  align = "center",
  sideOffset = 8,
  children,
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Content>) {
  return (
    <HoverCardPrimitive.Portal>
      <HoverCardPrimitive.Content
        data-slot="hover-card-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-56 origin-(--radix-hover-card-content-transform-origin) rounded-md border border-ctp-surface1 bg-overlay-mantle p-3 text-ctp-text shadow-lg animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className
        )}
        {...props}
      >
        {children}
        <HoverCardPrimitive.Arrow asChild>
          <svg width="12" height="7" viewBox="0 0 30 11" preserveAspectRatio="none" className="-my-px">
            <polygon points="0,-1 30,-1 15,10" className="fill-overlay-mantle" />
            <polyline points="0,0 15,10 30,0" className="stroke-ctp-surface1" fill="none" strokeWidth="2" strokeLinejoin="round" />
          </svg>
        </HoverCardPrimitive.Arrow>
      </HoverCardPrimitive.Content>
    </HoverCardPrimitive.Portal>
  )
}

export { HoverCard, HoverCardTrigger, HoverCardContent }
