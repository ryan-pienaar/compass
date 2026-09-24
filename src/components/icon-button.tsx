import type { ComponentProps, ReactNode } from "react";
import { Button, type ButtonProps, type ButtonVariant } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type IconButtonProps = Omit<ButtonProps, "size" | "variant" | "children" | "aria-label"> & {
  /** The accessible name, repeated in the tooltip. */
  label: string;
  icon: ReactNode;
  /** A keyboard hint shown in the tooltip as a Kbd, e.g. "N" or `${MOD_KEY} K`. */
  shortcut?: string;
  tooltipSide?: ComponentProps<typeof TooltipContent>["side"];
  variant?: ButtonVariant;
  size?: "icon-xs" | "icon-sm" | "icon";
};

/**
 * An icon-only button with its name as `aria-label` and a tooltip for pointer users.
 * To open a popover or menu from it, compose it as the trigger's render element:
 * `<PopoverTrigger render={<IconButton label="…" icon={…} />} />`.
 */
export function IconButton({
  label,
  icon,
  shortcut,
  tooltipSide = "top",
  variant = "ghost",
  size = "icon-sm",
  // A composing trigger may pass children; the icon is the content.
  children: _children,
  ...props
}: IconButtonProps & { children?: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant={variant} size={size} aria-label={label} {...props} />}>{icon}</TooltipTrigger>
      <TooltipContent side={tooltipSide}>
        {label}
        {shortcut && <Kbd>{shortcut}</Kbd>}
      </TooltipContent>
    </Tooltip>
  );
}

export type { IconButtonProps };
