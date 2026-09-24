import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva } from "class-variance-authority"
import { cn } from "cn"

/*
 * Folio §6.1 Card: a raised sheet that holds one real object (§1, §4.4). Never nest cards.
 * `interactive` lifts on hover; `flush` drops the padding for divided lists and the paper editor.
 * Card and CardTitle accept Base UI's `render` prop (e.g. `render={<button />}`,
 * `render={<h2 />}`); CardTitle also takes `as`.
 */

const cardVariants = cva(
  "group/card relative flex flex-col gap-4 rounded-xl bg-card p-5 text-sm text-card-foreground shadow-sm ring-1 ring-edge data-[size=sm]:gap-3 data-[size=sm]:p-4 max-sm:p-4",
  {
    variants: {
      variant: {
        default: "",
        interactive:
          "cursor-pointer transition-[box-shadow,translate,scale] duration-150 ease-out hover:shadow-md motion-safe:hover:-translate-y-px active:scale-(--motion-scale-press-lg)",
        flush: "gap-0 overflow-hidden p-0 max-sm:p-0 data-[size=sm]:p-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

type CardVariant = "default" | "interactive" | "flush"

function Card({
  className,
  size = "default",
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"div"> & {
  size?: "default" | "sm"
  variant?: CardVariant
}) {
  return useRender({
    defaultTagName: "div",
    render,
    props: mergeProps<"div">(
      {
        className: cn(cardVariants({ variant }), className),
      },
      props
    ),
    state: {
      slot: "card",
      size,
      variant,
    },
  })
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex items-start justify-between gap-3", className)}
      {...props}
    />
  )
}

function CardTitle({
  className,
  as = "div",
  render,
  ...props
}: useRender.ComponentProps<"div"> & {
  as?: "div" | "h2" | "h3" | "h4"
}) {
  return useRender({
    defaultTagName: as,
    render,
    props: mergeProps<"div">(
      {
        className: cn("text-base font-semibold text-foreground", className),
      },
      props
    ),
    state: {
      slot: "card-title",
    },
  })
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("ml-auto flex shrink-0 items-center gap-2", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={className} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "-mx-5 -mb-5 mt-1 flex items-center gap-2 border-t border-border-subtle px-5 py-3 max-sm:-mx-4 max-sm:-mb-4 max-sm:px-4",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
