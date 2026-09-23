/**
 * Affirmation checker (Habit 2). A good affirmation is personal, positive,
 * present tense, visual and emotional. We check the first four heuristically
 * and let the user confirm "visual", since only they can picture it.
 */

import { straightenApostrophes } from "./language.ts";

export type AffirmationIngredient = "personal" | "positive" | "present" | "visual" | "emotional";

export interface IngredientResult {
  key: AffirmationIngredient;
  label: string;
  ok: boolean;
  hint: string;
}

const PERSONAL = /\b(i|i'm|i am|i've|my|me|myself)\b/i;
const FUTURE_OR_WISH = /\b(will|won't|going to|gonna|shall|someday|one day|would|want to|hope to|try to|wish)\b/i;
const NEGATIVE = /\b(not|never|no|don't|doesn't|won't|can't|cannot|stop|quit|avoid|without|less|nor)\b/i;
const EMOTION =
  /\b(joy|joyful|joyfully|happy|happily|glad|love|loving|lovingly|grateful|gratefully|thankful|proud|satisf\w*|fulfill\w*|peace|peaceful|peacefully|calm|calmly|confident|confidently|excit\w*|delight\w*|energi[sz]ed|content|thrill\w*|serene|warm|warmly|deeply|gentle|gently|patient|patiently|cheerful\w*|enthusias\w*|alive)\b/i;
const SCENE = /\b(when|whenever|as i|while|each morning|every morning|each day|at work|at home)\b/i;

export function checkAffirmation(text: string, visualConfirmed = false): IngredientResult[] {
  const t = straightenApostrophes(text.trim());
  const has = t.length > 0;
  return [
    {
      key: "personal",
      label: "Personal",
      ok: has && PERSONAL.test(t),
      hint: "Write it about yourself: use “I” or “my”.",
    },
    {
      key: "positive",
      label: "Positive",
      ok: has && !NEGATIVE.test(t),
      hint: "Describe what you do, not what you avoid (no “not”, “never”, “stop”).",
    },
    {
      key: "present",
      label: "Present tense",
      ok: has && !FUTURE_OR_WISH.test(t),
      hint: "Say it as if it's already true: “I respond”, not “I will respond”.",
    },
    {
      key: "visual",
      label: "Visual",
      ok: has && (visualConfirmed || SCENE.test(t)),
      hint: "Anchor it in a scene you can picture: where you are, who's there, what happens.",
    },
    {
      key: "emotional",
      label: "Emotional",
      ok: has && EMOTION.test(t),
      hint: "Include how it feels: satisfying, calm, joyful, proud…",
    },
  ];
}
