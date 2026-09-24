import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/*
 * Folio §6.1 Tabs: one style, an underline with a sliding ink bar (Base UI Tabs.Indicator,
 * positioned by --active-tab-left / --active-tab-width). `variant` is still accepted;
 * "default" and "line" render the same. Panels fade in on enter only and are never kept mounted.
 */

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  // Additions to the §6.1 string: the 40px triggers sit in a 39px content box (the list's border
  // takes 1px), so overflow-y-hidden stops a 1px vertical scroll; pointer-coarse:h-11 matches the
  // 44px touch triggers so they aren't clipped.
  "group/tabs-list relative flex h-10 w-full items-center gap-1 overflow-x-auto overflow-y-hidden no-scrollbar scroll-fade-x border-b border-border-subtle pointer-coarse:h-11",
  {
    variants: {
      variant: {
        default: "",
        line: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  children,
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      {children}
      <TabsPrimitive.Indicator
        data-slot="tabs-indicator"
        // Under reduced motion the bar jumps (ink and bar still mark the tab); in forced colours it
        // keeps a system colour, since backgrounds are otherwise flattened to Canvas.
        className="absolute bottom-0 left-0 h-0.5 w-(--active-tab-width) translate-x-(--active-tab-left) rounded-full bg-foreground transition-[translate,width] duration-180 ease-in-out data-[activation-direction=none]:transition-none motion-reduce:transition-none forced-color-adjust-none forced-colors:bg-[Highlight]"
      />
    </TabsPrimitive.List>
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors duration-120 hover:text-foreground data-active:text-foreground focus-ring-inset disabled:pointer-events-none disabled:opacity-45 pointer-coarse:h-11 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn(
        "pt-6 text-sm transition-opacity duration-120 ease-out data-starting-style:opacity-0",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
