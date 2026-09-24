import * as React from "react"
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { dialogOverlayClassName } from "@/components/ui/dialog"
import { XIcon } from "lucide-react"

/*
 * Folio §6.1 Sheet. The right sheet floats on desktop and is full-screen on mobile; the left
 * sheet is the mobile sidebar. The close button must stay a direct child <button> of the popup:
 * the mobile sidebar hides it with `[&>button]:hidden`.
 */

type SheetSide = "top" | "right" | "bottom" | "left"

const sheetContentClassName =
  "fixed z-50 flex flex-col bg-popover text-sm text-popover-foreground shadow-xl ring-1 ring-edge outline-hidden transition-[translate,opacity] duration-320 ease-drawer data-ending-style:duration-240 data-ending-style:ease-in motion-reduce:data-starting-style:opacity-0 motion-reduce:data-ending-style:opacity-0"

const sheetSideClassName: Record<SheetSide, string> = {
  right:
    "inset-y-0 right-0 h-full w-full sm:inset-y-2 sm:right-2 sm:h-auto sm:w-[min(32rem,calc(100vw-1rem))] sm:rounded-2xl data-starting-style:translate-x-[calc(100%+1rem)] data-ending-style:translate-x-[calc(100%+1rem)] motion-reduce:data-starting-style:translate-x-0 motion-reduce:data-ending-style:translate-x-0",
  left:
    "inset-y-0 left-0 h-full w-3/4 max-w-[18rem] data-starting-style:-translate-x-full data-ending-style:-translate-x-full motion-reduce:data-starting-style:translate-x-0 motion-reduce:data-ending-style:translate-x-0",
  top:
    "inset-x-0 top-0 h-auto data-starting-style:-translate-y-full data-ending-style:-translate-y-full motion-reduce:data-starting-style:translate-y-0 motion-reduce:data-ending-style:translate-y-0",
  bottom:
    "inset-x-0 bottom-0 h-auto data-starting-style:translate-y-full data-ending-style:translate-y-full motion-reduce:data-starting-style:translate-y-0 motion-reduce:data-ending-style:translate-y-0",
}

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(dialogOverlayClassName, className)}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: SheetSide
  showCloseButton?: boolean
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          sheetContentClassName,
          sheetSideClassName[side],
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-3.5 right-3.5"
                size="icon-sm"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1 px-5 pt-5 pb-3", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        "mt-auto flex items-center gap-2 border-t border-border-subtle px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        className
      )}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-lg font-semibold text-foreground", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
