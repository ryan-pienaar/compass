/**
 * Shared enter/exit motion for Base UI popups (Folio §6.1, §7.2).
 * Base UI drives these through `data-starting-style` / `data-ending-style`;
 * never combine them with tw-animate enter/exit classes or popups animate twice.
 */
export const popupMotion =
  "origin-(--transform-origin) transition-[opacity,scale,translate] duration-180 ease-out " +
  "data-starting-style:opacity-0 data-starting-style:scale-(--motion-scale-in) " +
  "data-ending-style:opacity-0 data-ending-style:scale-(--motion-scale-in) data-ending-style:duration-120 " +
  "data-[side=bottom]:data-starting-style:-translate-y-(--motion-rise) data-[side=top]:data-starting-style:translate-y-(--motion-rise) " +
  "data-[side=left]:data-starting-style:translate-x-(--motion-rise) data-[side=right]:data-starting-style:-translate-x-(--motion-rise) " +
  "data-instant:transition-none";

export const tooltipMotion =
  "origin-(--transform-origin) transition-[opacity,scale] duration-120 ease-out " +
  "data-starting-style:opacity-0 data-starting-style:scale-(--motion-scale-in) " +
  "data-ending-style:opacity-0 data-ending-style:duration-80 data-instant:transition-none";
