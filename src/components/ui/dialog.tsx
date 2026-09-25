"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

/*
 * Folio §6.1 Dialog. AlertDialog imports these recipes so the two always change together.
 * Motion comes from Base UI's data-starting-style / data-ending-style, never tw-animate.
 */

/** Scrim behind dialogs, alert dialogs and sheets. */
const dialogOverlayClassName =
  "fixed inset-0 isolate z-50 bg-scrim transition-opacity duration-240 ease-out data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-180 supports-backdrop-filter:backdrop-blur-[2px] supports-[-webkit-touch-callout:none]:absolute supports-[-webkit-touch-callout:none]:min-h-dvh"

/** Centred on desktop; a bottom-anchored floating card below `sm` for thumb reach. */
const dialogContentClassName =
  "fixed top-1/2 left-1/2 z-50 flex w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-5 overflow-y-auto overscroll-contain rounded-2xl bg-popover p-6 text-sm text-popover-foreground shadow-xl ring-1 ring-edge outline-hidden max-h-[calc(100dvh-2rem)] transition-[opacity,scale,translate] duration-240 ease-out data-starting-style:scale-[0.97] data-starting-style:opacity-0 data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-ending-style:duration-180 max-sm:top-auto max-sm:right-3 max-sm:bottom-[max(0.75rem,env(safe-area-inset-bottom))] max-sm:left-3 max-sm:w-auto max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:p-5 max-sm:max-h-[calc(100dvh-1.5rem)] max-sm:data-starting-style:translate-y-4 max-sm:data-ending-style:translate-y-4 max-sm:motion-reduce:data-starting-style:translate-y-0 max-sm:motion-reduce:data-ending-style:translate-y-0"

type DialogSize = "sm" | "md" | "lg" | "xl"
type DialogPlacement = "center" | "top"

const dialogSizeClassName: Record<DialogSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-xl",
  xl: "sm:max-w-2xl",
}

const dialogPlacementClassName: Record<DialogPlacement, string> = {
  center: "",
  top: "sm:top-[max(1rem,8dvh)] sm:translate-y-0 sm:max-h-[calc(100dvh-max(2rem,16dvh))]",
}

/**
 * Footer that bleeds to the popup edges. Dialog makes it sticky; AlertDialog doesn't.
 * The sticky offset is the negative of the popup padding: sticky insets are measured from the
 * scroll container's content box, so `bottom-0` would float a padding-height above the edge.
 */
const dialogFooterClassName =
  "-mx-6 -mb-6 mt-1 flex flex-wrap items-center justify-end gap-2 border-t border-border-subtle bg-popover px-6 py-4 max-sm:-mx-5 max-sm:-mb-5 max-sm:px-5"

const dialogFooterStickyClassName = "sticky -bottom-6 z-10 max-sm:-bottom-5"

/** Scroll padding on Dialog's scroller so a field focused from the keyboard lands clear of the sticky footer. */
const dialogContentScrollPaddingClassName = "scroll-pb-24"

function DialogFooterStart({ children }: { children: React.ReactNode }) {
  return (
    <div data-slot="dialog-footer-start" className="mr-auto flex items-center gap-2">
      {children}
    </div>
  )
}

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(dialogOverlayClassName, className)}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  size = "md",
  placement = "center",
  onKeyUp,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
  size?: DialogSize
  placement?: DialogPlacement
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        data-size={size}
        data-placement={placement}
        className={cn(
          dialogContentClassName,
          dialogContentScrollPaddingClassName,
          dialogSizeClassName[size],
          dialogPlacementClassName[placement],
          className
        )}
        onKeyUp={(event) => {
          // Tabbing into a textarea scrolls only its caret into view, which can leave the rest of the field
          // under the sticky footer: bring the whole field in (scroll padding applies). Keyboard only, so a
          // click never scrolls the text under the pointer; portaled popups are excluded.
          const field = document.activeElement
          if (event.key === "Tab" && field instanceof HTMLTextAreaElement && event.currentTarget.contains(field)) {
            field.scrollIntoView({ block: "nearest" })
          }
          onKeyUp?.(event)
        }}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-3 right-3"
                size="icon-sm"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5 pr-8", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  start,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
  /** Rendered first, pushed to the start edge (destructive actions, hints). */
  start?: React.ReactNode
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        dialogFooterClassName,
        dialogFooterStickyClassName,
        className
      )}
      {...props}
    >
      {start != null && start !== false && (
        <DialogFooterStart>{start}</DialogFooterStart>
      )}
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg font-semibold text-foreground", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogFooterStart,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  dialogContentClassName,
  dialogFooterClassName,
  dialogOverlayClassName,
  dialogSizeClassName,
}
export type { DialogPlacement, DialogSize }
