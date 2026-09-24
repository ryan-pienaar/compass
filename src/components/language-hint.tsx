import { MessageSquareQuote, X } from "lucide-react";
import { useMemo, useRef, useState, type RefObject } from "react";
import { analyzeLanguage, type LanguageMatch } from "@shared/language.ts";
import { IconButton } from "@/components/icon-button";
import { useBootstrap } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const reframeChip = "rounded-full bg-card px-2 py-0.5 ring-1 ring-edge";

const TEXT_FIELD =
  'textarea, input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]), [contenteditable="true"]';
const FOCUSABLE = 'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

/**
 * Where focus goes when the hint is dismissed from the keyboard: the nearest text field before
 * the note (the text it describes), else the nearest focusable before it. Stays inside a dialog.
 */
function focusTargetBefore(note: HTMLElement): HTMLElement | null {
  const scope: ParentNode = note.closest('[role="dialog"], [role="alertdialog"]') ?? document;
  const usable = (el: HTMLElement) =>
    !note.contains(el) &&
    !!(note.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING) &&
    !el.matches(":disabled") &&
    el.getClientRects().length > 0;
  for (const selector of [TEXT_FIELD, FOCUSABLE]) {
    const found = [...scope.querySelectorAll<HTMLElement>(selector)].filter(usable);
    if (found.length > 0) return found[found.length - 1];
  }
  return null;
}

/**
 * Habit 1: listen to your language. Shows a gentle, dismissible nudge when the
 * text contains reactive phrasing, with one-click proactive rewrites.
 */
export function LanguageHint({
  text,
  onChange,
  returnFocusRef,
  className,
}: {
  text: string;
  /** When provided, clicking a reframe rewrites the phrase in place. */
  onChange?: (next: string) => void;
  /** The field the hint describes; focus returns there when the hint is dismissed from the keyboard. */
  returnFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
}) {
  const { settings } = useBootstrap();
  const matches = useMemo(() => {
    if (settings.languageCoach === "off") return [];
    const all = analyzeLanguage(text);
    return settings.languageCoach === "strong" ? all.filter((m) => m.severity === "strong") : all;
  }, [text, settings.languageCoach]);
  // The phrase that was dismissed. A different phrase brings the hint back.
  const [dismissed, setDismissed] = useState<string | null>(null);
  const noteRef = useRef<HTMLDivElement>(null);

  if (matches.length === 0) return null;
  const first = matches[0];
  if (dismissed === first.text) return null;

  const replace = (m: LanguageMatch, reframe: string) => {
    if (!onChange) return;
    const clean = reframe.replace(/…/g, "").trim();
    onChange(text.slice(0, m.index) + clean + text.slice(m.index + m.length));
  };

  const dismiss = () => {
    // The note (and the focused button) unmounts, so hand focus back before it goes.
    const note = noteRef.current;
    if (note && note.contains(document.activeElement)) {
      (returnFocusRef?.current ?? focusTargetBefore(note))?.focus();
    }
    setDismissed(first.text);
  };

  return (
    <div
      ref={noteRef}
      className={cn(
        "grid grid-rows-[1fr] transition-[grid-template-rows,opacity] duration-240 ease-out starting:grid-rows-[0fr] starting:opacity-0",
        className,
      )}
      role="note"
    >
      <div className="min-h-0 overflow-hidden">
        <div className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-foreground">
          <MessageSquareQuote aria-hidden className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 space-y-1">
            <p>
              <span className="font-medium">&ldquo;{first.text}&rdquo;</span> sounds reactive. {first.why}
            </p>
            <div className="flex flex-wrap items-center gap-1 pointer-coarse:gap-y-3">
              <span className="text-muted-foreground">Try:</span>
              {first.reframes.map((r) =>
                onChange && !r.includes("<") ? (
                  <button
                    key={r}
                    type="button"
                    onClick={() => replace(first, r)}
                    // The chip stays small; on touch an after: hit area makes the target 44px tall.
                    className={cn(
                      reframeChip,
                      "relative transition-shadow duration-120 ease-out hover:ring-border-strong pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-3",
                    )}
                  >
                    {r}
                  </button>
                ) : (
                  <span key={r} className={reframeChip}>
                    {r}
                  </span>
                ),
              )}
              {matches.length > 1 && <span className="text-muted-foreground">(+{matches.length - 1} more)</span>}
            </div>
          </div>
          <IconButton label="Dismiss language hint" icon={<X />} size="icon-xs" className="-my-1 -mr-1.5 shrink-0" onClick={dismiss} />
        </div>
      </div>
    </div>
  );
}
