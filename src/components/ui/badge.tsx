import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/** Badge takes the Chip geometry (Folio §6.2). New screens use `Chip`. */
const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3.5",
  {
    variants: {
      variant: {
        default: "bg-primary-soft text-primary-soft-foreground",
        secondary: "bg-muted text-foreground",
        destructive: "bg-destructive-soft text-destructive",
        outline: "inset-ring inset-ring-border-strong text-muted-foreground",
        ghost:
          "text-muted-foreground transition-colors duration-120 ease-out [a]:hover:bg-subtle [a]:hover:text-foreground",
        link: "text-primary-ink underline-offset-4 [a]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
