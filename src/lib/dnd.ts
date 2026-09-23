import { PointerActivationConstraints } from "@dnd-kit/dom";
import { KeyboardSensor, PointerSensor } from "@dnd-kit/react";

/**
 * Sensors for card-like draggables whose body is also clickable (open details).
 * - A drag needs a few pixels of movement, even on a handle (dnd-kit starts mouse drags
 *   on handles immediately, which swallows the click), so a plain click still opens the card.
 * - Touch keeps press-and-hold, so swiping still scrolls.
 * - dnd-kit refuses to start a drag on interactive children by default; cards should be
 *   draggable from anywhere except inputs and controls marked `data-no-drag`.
 */
export const cardSensors = [
  PointerSensor.configure({
    activationConstraints: (event) =>
      event.pointerType === "touch"
        ? [new PointerActivationConstraints.Delay({ value: 250, tolerance: 5 })]
        : [new PointerActivationConstraints.Distance({ value: 4 })],
    preventActivation: (event) => {
      const t = event.target;
      return t instanceof Element && !!t.closest("[data-no-drag], input, textarea, select, [contenteditable='true']");
    },
  }),
  KeyboardSensor,
];
