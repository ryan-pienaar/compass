/** The platform modifier key as shown in shortcut hints: ⌘ on Apple devices, Ctrl elsewhere. */
export const MOD_KEY = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl";
