/**
 * Proactive language coach (Habit 1).
 *
 * Reactive language hands responsibility to circumstances or other people.
 * We detect common reactive phrasings and offer a proactive reframe. The
 * patterns and suggestions are our own wording of the principle.
 */

export type CoachSeverity = "strong" | "gentle";

export interface LanguagePattern {
  id: string;
  pattern: RegExp;
  severity: CoachSeverity;
  /** Short proactive alternatives the user can reach for. */
  reframes: string[];
  /** One sentence explaining why the phrasing is reactive. */
  why: string;
}

export interface LanguageMatch {
  patternId: string;
  text: string;
  index: number;
  length: number;
  severity: CoachSeverity;
  reframes: string[];
  why: string;
}

// Note: every pattern must be global + case-insensitive so matchAll works.
export const LANGUAGE_PATTERNS: LanguagePattern[] = [
  {
    id: "have-to",
    pattern: /\b(?:i|we)\s+(?:really\s+)?(?:have|has|got)\s+to\b|\b(?:i've|we've)\s+got\s+to\b|\bgotta\b/gi,
    severity: "strong",
    reframes: ["I choose to", "I will", "I've decided to"],
    why: "“Have to” hides a choice. Name what you gain by doing it, and it becomes your decision.",
  },
  {
    id: "must",
    pattern: /\b(?:i|we)\s+must\b/gi,
    severity: "strong",
    reframes: ["I prefer to", "I choose to", "It matters to me to"],
    why: "“Must” frames the action as imposed. Owning the preference keeps you in charge.",
  },
  {
    id: "cant",
    pattern: /\b(?:i|we)\s+(?:can't|cannot|can not)\b/gi,
    severity: "strong",
    reframes: ["I choose not to", "I haven't found a way yet", "I won't, because"],
    why: "Most “can'ts” are choices about priorities. Say which it is.",
  },
  {
    id: "if-only",
    pattern: /\bif\s+only\b/gi,
    severity: "strong",
    reframes: ["I will", "What I can do is", "Next time I'll"],
    why: "“If only” waits for circumstances to change. Turn it into an action you control.",
  },
  {
    id: "makes-me",
    pattern:
      /\b(?:makes?|made|making)\s+me\s+(?:so\s+|really\s+|feel\s+)?(?:mad|angry|crazy|furious|upset|sad|anxious|stressed|nervous|miserable|frustrated|annoyed)\b/gi,
    severity: "strong",
    reframes: ["I choose how I respond to", "I feel … when …, and I can", "I control my own reaction"],
    why: "Nobody controls your feelings without your consent. Take back the response.",
  },
  {
    id: "nothing-i-can-do",
    pattern: /\bnothing\s+(?:i|we)\s+can\s+do\b/gi,
    severity: "strong",
    reframes: ["Let me look at my options", "What's one thing I can do?"],
    why: "There is always a first step inside your Circle of Influence, even if it's your attitude.",
  },
  {
    id: "way-i-am",
    pattern: /\bthat'?s\s+(?:just\s+)?(?:the\s+way|how)\s+i\s+am\b|\bi'?m\s+just\s+like\s+that\b/gi,
    severity: "strong",
    reframes: ["I can choose a different approach", "I'm working on"],
    why: "You are not your habits. Self-awareness is where change starts.",
  },
  {
    id: "wont-let",
    pattern: /\b(?:they|he|she|you)\s+(?:won't|will\s+not|don't|do\s+not)\s+(?:let|allow)\b|\bnot\s+allowed\s+to\b/gi,
    severity: "strong",
    reframes: ["I can make a strong case for", "Within my influence, I can"],
    why: "Focus on what you can influence, like how well you prepare and present your case.",
  },
  {
    id: "no-time",
    pattern: /\b(?:i|we)\s+(?:don't|do\s+not)\s+have\s+(?:the\s+|enough\s+)?time\b|\bno\s+time\s+(?:to|for)\b|\btoo\s+busy\b/gi,
    severity: "strong",
    reframes: ["It isn't a priority right now", "I'm choosing to spend my time on", "I'll schedule it for"],
    why: "Everyone has the same week. Saying what you are prioritizing keeps the choice honest.",
  },
  {
    id: "forced",
    pattern: /\b(?:i'?m|i\s+am|we'?re|we\s+are)\s+forced\s+to\b|\bno\s+choice\b/gi,
    severity: "strong",
    reframes: ["I'm choosing to … because", "The option I prefer is"],
    why: "There is almost always a choice. It may just come with consequences you'd rather avoid.",
  },
  {
    id: "they-should",
    pattern: /\b(?:they|he|she|people|everyone)\s+(?:should|needs?\s+to|ought\s+to)\b/gi,
    severity: "gentle",
    reframes: ["What I can do is", "I can influence this by"],
    why: "What others should do sits in your Circle of Concern. Ask what you can do.",
  },
  {
    id: "should",
    pattern: /\b(?:i|we)\s+should\b/gi,
    severity: "gentle",
    reframes: ["I will", "I choose to", "I'd like to"],
    why: "“Should” adds guilt without commitment. Decide, then commit or let it go.",
  },
  {
    id: "try",
    pattern: /\b(?:i'?ll|i\s+will|i'?m\s+going\s+to)\s+try\s+to\b/gi,
    severity: "gentle",
    reframes: ["I will", "I commit to"],
    why: "Small commitments you keep build integrity. Commit clearly, or leave it out.",
  },
  {
    id: "someday",
    pattern: /\bsomeday\b|\bsome\s+day\b|\bwhen\s+i\s+(?:have|get)\s+(?:more\s+)?time\b|\bone\s+of\s+these\s+days\b/gi,
    severity: "gentle",
    reframes: ["On <day> I will", "Put it in this week's plan"],
    why: "“Someday” isn't on the calendar. Important, non-urgent work only happens when you schedule it.",
  },
  {
    id: "i-wish",
    pattern: /\bi\s+wish\b/gi,
    severity: "gentle",
    reframes: ["I will", "I intend to"],
    why: "A wish waits for things to change. An intention starts the change.",
  },
  {
    id: "not-my-fault",
    pattern: /\bnot\s+my\s+fault\b|\bit'?s\s+their\s+fault\b/gi,
    severity: "gentle",
    reframes: ["The part I can own is", "What I'll do differently is"],
    why: "Blame keeps the solution outside your control. Look for the part you can own.",
  },
];

const CURLY_APOSTROPHES = new RegExp(`[${String.fromCodePoint(0x2018, 0x2019, 0x02bc)}]`, "g");

/** Typographic apostrophes (can’t, I’m) read as plain ones. One character for one, so indices are unchanged. */
export const straightenApostrophes = (text: string): string => text.replace(CURLY_APOSTROPHES, "'");

export function analyzeLanguage(text: string): LanguageMatch[] {
  if (!text || text.length < 3) return [];
  const plain = straightenApostrophes(text);
  const matches: LanguageMatch[] = [];
  for (const p of LANGUAGE_PATTERNS) {
    for (const m of plain.matchAll(p.pattern)) {
      if (m.index === undefined) continue;
      matches.push({
        patternId: p.id,
        text: text.slice(m.index, m.index + m[0].length),
        index: m.index,
        length: m[0].length,
        severity: p.severity,
        reframes: p.reframes,
        why: p.why,
      });
    }
  }
  // Drop overlaps: keep the earliest, then the longest, then strong over gentle.
  matches.sort(
    (a, b) =>
      a.index - b.index ||
      b.length - a.length ||
      (a.severity === b.severity ? 0 : a.severity === "strong" ? -1 : 1),
  );
  const result: LanguageMatch[] = [];
  let end = -1;
  for (const m of matches) {
    if (m.index >= end) {
      result.push(m);
      end = m.index + m.length;
    }
  }
  return result;
}
