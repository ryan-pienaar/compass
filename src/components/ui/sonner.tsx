import { useTheme } from "@/components/theme"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

/*
 * Folio §6.1 Toaster. Sonner's CSS is unlayered, so every class override needs `!`.
 * Undo toasts pass `duration: 10_000` at their call sites.
 */
const Toaster = ({ toastOptions, ...props }: ToasterProps) => {
  const { resolvedTheme: theme } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-success" />,
        info: <InfoIcon className="size-4 text-info" />,
        warning: <TriangleAlertIcon className="size-4 text-warning" />,
        error: <OctagonXIcon className="size-4 text-destructive" />,
        loading: <Loader2Icon className="size-4 animate-spin text-muted-foreground" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "transparent",
          "--border-radius": "12px",
          "--width": "380px",
        } as React.CSSProperties
      }
      toastOptions={{
        ...toastOptions,
        classNames: {
          toast: "ring-1! ring-edge! shadow-lg! gap-3! p-4! text-sm! font-sans!",
          title: "font-medium!",
          description: "text-xs! text-muted-foreground!",
          actionButton: "h-8! rounded-lg! bg-foreground! px-3! text-xs! font-medium! text-background!",
          cancelButton: "h-8! rounded-lg! bg-muted! text-foreground!",
          closeButton: "border-edge! bg-popover! text-muted-foreground!",
          ...toastOptions?.classNames,
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
