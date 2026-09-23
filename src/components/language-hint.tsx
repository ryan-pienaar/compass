import { MessageSquareQuote } from "lucide-react";
import { useMemo } from "react";
import { analyzeLanguage, type LanguageMatch } from "@shared/language.ts";
import { useBootstrap } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/**
 * Habit 1: listen to your language. Shows a gentle, dismissible nudge when the
 * text contains reactive phrasing, with one-click proactive rewrites.
 */
export function LanguageHint({
  text,
  onChange,
  className,
}: {
  text: string;
  /** When provided, clicking a reframe rewrites the phrase in place. */
  onChange?: (next: string) => void;
  className?: string;
}) {
  const { settings } = useBootstrap();
  const matches = useMemo(() => {
    if (settings.languageCoach === "off") return [];
    const all = analyzeLanguage(text);
    return settings.languageCoach === "strong" ? all.filter((m) => m.severity === "strong") : all;
  }, [text, settings.languageCoach]);

  if (matches.length === 0) return null;
  const first = matches[0];

  const replace = (m: LanguageMatch, reframe: string) => {
    if (!onChange) return;
    const clean = reframe.replace(/…/g, "").trim();
    onChange(text.slice(0, m.index) + clean + text.slice(m.index + m.length));
  };

  return (
    <div className={cn("flex items-start gap-2 rounded-lg bg-accent/60 px-2.5 py-2 text-xs text-accent-foreground", className)} role="note">
      <MessageSquareQuote className="mt-0.5 size-3.5 shrink-0" />
      <div className="min-w-0 space-y-1">
        <p>
          <span className="font-medium">&ldquo;{first.text}&rdquo;</span> sounds reactive. {first.why}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-accent-foreground/70">Try:</span>
          {first.reframes.map((r) =>
            onChange && !r.includes("<") ? (
              <button
                key={r}
                type="button"
                onClick={() => replace(first, r)}
                className="rounded-full border border-accent-foreground/20 bg-background/60 px-2 py-0.5 hover:bg-background"
              >
                {r}
              </button>
            ) : (
              <span key={r} className="rounded-full border border-accent-foreground/20 px-2 py-0.5">
                {r}
              </span>
            ),
          )}
          {matches.length > 1 && <span className="text-accent-foreground/70">(+{matches.length - 1} more)</span>}
        </div>
      </div>
    </div>
  );
}
