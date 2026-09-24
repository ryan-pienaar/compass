import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

import { Spinner } from "@/components/ui/spinner"

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap select-none transition-[color,background-color,border-color,box-shadow,scale] duration-120 ease-out active:not-aria-[haspopup]:scale-(--motion-scale-press) disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs inset-shadow-2xs hover:bg-primary-hover",
        outline:
          "border-border bg-card text-foreground shadow-xs hover:border-border-strong hover:bg-[color-mix(in_oklab,var(--card),var(--foreground)_4%)] aria-expanded:bg-[color-mix(in_oklab,var(--card),var(--foreground)_4%)] dark:bg-muted dark:hover:bg-[color-mix(in_oklab,var(--muted),white_5%)] dark:aria-expanded:bg-[color-mix(in_oklab,var(--muted),white_5%)]",
        secondary:
          "bg-muted text-foreground hover:bg-[color-mix(in_oklab,var(--muted),var(--foreground)_6%)] aria-pressed:bg-selected",
        soft: "bg-primary-soft text-primary-soft-foreground hover:bg-[color-mix(in_oklab,var(--primary-soft),var(--primary)_12%)]",
        ghost:
          "text-muted-foreground hover:bg-subtle hover:text-foreground aria-expanded:bg-subtle aria-expanded:text-foreground aria-pressed:bg-selected aria-pressed:text-foreground",
        destructive:
          "bg-destructive-solid text-white shadow-xs inset-shadow-2xs hover:bg-destructive-solid-hover",
        "destructive-ghost": "text-destructive hover:bg-destructive-soft",
        link: "rounded-xs text-primary-ink underline decoration-[color-mix(in_oklab,var(--primary-ink)_40%,transparent)] underline-offset-4 hover:decoration-current",
      },
      size: {
        xs: "h-7 gap-1.5 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5 pointer-coarse:after:absolute pointer-coarse:after:-inset-2",
        sm: "h-8 px-3 pointer-coarse:h-11",
        default: "h-9 px-3.5 pointer-coarse:h-11",
        lg: "h-10 px-4 pointer-coarse:h-11",
        xl: "h-11 px-5 text-md [&_svg:not([class*='size-'])]:size-4.5",
        "icon-xs":
          "size-7 [&_svg:not([class*='size-'])]:size-3.5 pointer-coarse:after:absolute pointer-coarse:after:-inset-2",
        "icon-sm": "size-8 pointer-coarse:size-11",
        icon: "size-9 pointer-coarse:size-11",
        "icon-lg": "size-10 pointer-coarse:size-11",
        inline: "h-auto gap-1 p-0",
      },
    },
    compoundVariants: [{ variant: "link", class: "h-auto px-0" }],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>
type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    /**
     * While a mutation this button triggers is pending: swaps the leading icon
     * for a Spinner (same footprint, so the width stays put) and sets aria-busy.
     * It does not disable the button; callers keep their own `disabled` logic.
     */
    pending?: boolean
  }

/** Icon size a Spinner takes when it stands in for a button's leading icon. */
const spinnerSizeFor = (size: ButtonSize | null | undefined) =>
  size === "xs" || size === "icon-xs"
    ? "size-3.5"
    : size === "xl"
      ? "size-4.5"
      : "size-4"

function withPendingIcon(
  children: React.ReactNode,
  size: ButtonSize | null | undefined
) {
  const items = React.Children.toArray(children)
  const first = items[0]
  // A leading icon is an element whose type is a component (lucide icons) or a raw <svg>.
  if (
    !React.isValidElement<{ className?: string }>(first) ||
    (typeof first.type === "string" && first.type !== "svg")
  ) {
    return children
  }
  const own = first.props.className?.match(/(?:^|\s)(size-[\d.]+)(?=\s|$)/)?.[1]
  return [
    <Spinner
      key="button-pending"
      aria-hidden
      role={undefined}
      aria-label={undefined}
      className={cn(spinnerSizeFor(size), own, "text-current")}
    />,
    ...items.slice(1),
  ]
}

function Button({
  className,
  variant = "default",
  size = "default",
  render,
  nativeButton,
  pending,
  children,
  ...props
}: ButtonProps) {
  // Rendering as a link (e.g. a router <Link>) is not a native <button>.
  const isNative =
    nativeButton ?? (render == null || (React.isValidElement(render) && render.type === "button"))
  return (
    <ButtonPrimitive
      data-slot="button"
      data-variant={variant ?? "default"}
      data-size={size ?? "default"}
      className={cn(buttonVariants({ variant, size, className }))}
      render={render}
      nativeButton={isNative}
      aria-busy={pending || undefined}
      {...props}
    >
      {pending ? withPendingIcon(children, size) : children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
export type { ButtonProps, ButtonSize, ButtonVariant }
