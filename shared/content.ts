/**
 * Guidance copy used throughout the app. All wording is our own summary of
 * the principles in Habits 1-3 (and the Sharpen the Saw box that Habit 3's
 * weekly worksheet borrows from Habit 7).
 */

export type SawDimension = "physical" | "mental" | "spiritual" | "social";

export const SAW_DIMENSIONS: { key: SawDimension; label: string; prompt: string; examples: string[] }[] = [
  {
    key: "physical",
    label: "Physical",
    prompt: "Body: exercise, nutrition, sleep and rest.",
    examples: ["Three 30-minute workouts", "Lights out by 22:30", "Cook at home 4 nights"],
  },
  {
    key: "mental",
    label: "Mental",
    prompt: "Mind: reading, learning, writing, planning.",
    examples: ["Read 50 pages", "One course lesson", "Journal twice"],
  },
  {
    key: "spiritual",
    label: "Spiritual",
    prompt: "Spirit: values, reflection, meditation, time in nature.",
    examples: ["Review my mission statement", "10 minutes of stillness daily", "A walk without my phone"],
  },
  {
    key: "social",
    label: "Social / Emotional",
    prompt: "Heart: relationships, empathy, service, building trust.",
    examples: ["Lunch with a friend", "Call my parents", "Write a thank-you note"],
  },
];

export const ROLE_SUGGESTIONS = [
  "Personal growth",
  "Partner",
  "Parent",
  "Son / Daughter",
  "Friend",
  "Manager",
  "Professional",
  "Team member",
  "Community",
  "Mentor",
];

export const ROLE_COLORS = [
  "#4f46e5", // indigo
  "#0891b2", // cyan
  "#16a34a", // green
  "#ca8a04", // yellow
  "#ea580c", // orange
  "#db2777", // pink
  "#9333ea", // purple
  "#2563eb", // blue
  "#059669", // emerald
  "#b45309", // amber-brown
];

/** The Sharpen the Saw role's colour. Mirrors the server default (`server/db/schema.ts`); data, not a theme token. */
export const SAW_ROLE_COLOR = "#0f766e";

/** Soft limit: seven or so roles keeps a week manageable. */
export const RECOMMENDED_MAX_ROLES = 7;

export const OPENING_QUESTIONS = {
  personal:
    "What one thing could you start doing regularly that would make a tremendous positive difference in your personal life?",
  professional: "And in your work: what one thing, done regularly, would bring similar results?",
};

export const FUNERAL_EXERCISE = {
  intro:
    "Find a quiet place. Picture a gathering, some years from now, held to honor your life. People who knew you well are there. Four of them will speak.",
  speakers: [
    { key: "family", label: "Someone from your family" },
    { key: "friend", label: "A close friend" },
    { key: "work", label: "Someone from your work" },
    { key: "community", label: "Someone from a community you served" },
  ],
  lenses: [
    { key: "character", label: "Character", prompt: "What kind of person would you want them to describe?" },
    { key: "contribution", label: "Contribution", prompt: "What difference would you want to have made in their lives?" },
    { key: "achievement", label: "Achievement", prompt: "What would you want them to remember you accomplished?" },
  ],
  outro:
    "What you wrote is your working definition of success. It is raw material for your mission statement, and a test for how you spend this week.",
};

export const MISSION_FREEWRITE_LENSES = [
  { key: "awareness", label: "Self-awareness", prompt: "When am I at my best? What do I do well?" },
  { key: "conscience", label: "Conscience", prompt: "What do I feel I ought to be doing with my life?" },
  { key: "imagination", label: "Imagination", prompt: "If nothing held me back, what would I create or contribute?" },
];

export const MISSION_QUESTIONS = [
  "Who has shaped you for the better? Which of their qualities do you want to grow in yourself?",
  "Recall a time you felt most alive or inspired. What was happening?",
  "What, or who, would you take a real risk for?",
  "If you had a year to learn anything, what would you study?",
  "List ten things you love doing.",
  "What would you regret never having done or become?",
  "Which principles will you not compromise, even when it's costly?",
  "What do you want the people closest to you to feel when they are with you?",
];

export const MISSION_GUIDANCE = [
  "Write what you want to be (character) and do (contributions), and the principles underneath both.",
  "Don't aim for perfect. Draft now, refine over weeks and months.",
  "Organizing it by role keeps it balanced.",
  "Review it regularly, at least when you plan each week.",
];

export const STEWARDSHIP_ELEMENTS = [
  {
    key: "desiredResults",
    label: "Desired results",
    prompt: "What does done look like, and by when? Describe the result, not the method.",
  },
  {
    key: "guidelines",
    label: "Guidelines",
    prompt: "The few boundaries that matter: constraints, values, known pitfalls. Point out the quicksand; don't prescribe the path.",
  },
  {
    key: "resources",
    label: "Resources",
    prompt: "People, budget, tools and information they can draw on.",
  },
  {
    key: "accountability",
    label: "Accountability",
    prompt: "How will results be judged, and when will you check in together?",
  },
  {
    key: "consequences",
    label: "Consequences",
    prompt: "What happens, good and bad, as a result? Recognition, growth, natural outcomes.",
  },
] as const;

export type ControlKind = "direct" | "indirect" | "none";

export const CONTROL_KINDS: Record<ControlKind, { label: string; short: string; approach: string; prompt: string }> = {
  direct: {
    label: "Direct control",
    short: "My own behavior",
    approach: "Solved by working on my habits.",
    prompt: "Which habit or behavior of mine will I change? What's the first step?",
  },
  indirect: {
    label: "Indirect control",
    short: "Other people's behavior",
    approach: "Solved by changing how I influence.",
    prompt: "How could I influence this? Choose a method and a first step.",
  },
  none: {
    label: "No control",
    short: "The past, or situations I can't change",
    approach: "Solved by changing my attitude: accept it peacefully.",
    prompt: "How will I choose to respond? What will I let go of?",
  },
};

export const INFLUENCE_METHODS = [
  "Set the example",
  "Listen first to understand",
  "Build the relationship",
  "Prepare a strong proposal",
  "Ask good questions",
  "Offer help",
  "Give honest feedback",
  "Look for a win-win",
  "Involve them in the solution",
  "Find an ally",
];

/** Original self-check items inspired by the idea of an "urgency mindset". Scored 0-3. */
export const URGENCY_ITEMS = [
  "When I get a free hour, I fill it with whatever is loudest (messages, requests) rather than what matters most.",
  "I respond to notifications within minutes.",
  "Most of my week goes to things someone asked for that same day.",
  "Planning, health and relationship time keeps slipping to “next week”.",
  "I'm busy all day but struggle to name what I moved forward.",
  "I often work late on problems earlier attention would have prevented.",
  "I say yes to requests before checking them against my priorities.",
  "A full day away from work makes me uneasy.",
  "I get a buzz from last-minute saves.",
  "I rarely block time on my calendar for my own priorities.",
  "My to-do list is mostly things that arrived today.",
  "I half-listen to people I care about while doing something else.",
];

export const URGENCY_SCALE = ["Never", "Sometimes", "Often", "Always"];

export function urgencyBand(score: number, max = URGENCY_ITEMS.length * 3) {
  const pct = score / max;
  if (pct < 1 / 3)
    return { label: "Importance-led", description: "You mostly act on what matters. Protect your weekly planning time." };
  if (pct < 2 / 3)
    return {
      label: "Feeling the pull of urgency",
      description: "Urgency is steering a good part of your week. Start by blocking your Quadrant II goals first.",
    };
  return {
    label: "Urgency-driven",
    description:
      "Urgency is running the show. The way out is a bigger “yes”: clarify your mission and roles, then say no to Quadrant III.",
  };
}

export const CENTERS = [
  { key: "spouse", label: "Partner / spouse", note: "My sense of worth rises and falls with how my partner treats me." },
  { key: "family", label: "Family", note: "Family approval and reputation decide what's right." },
  { key: "money", label: "Money", note: "Net worth and income feel like my security and my decision rule." },
  { key: "work", label: "Work", note: "I am my job; I'm uneasy when I'm not working." },
  { key: "possessions", label: "Possessions & status", note: "Things, reputation and status tell me who I am." },
  { key: "pleasure", label: "Pleasure", note: "I decide by what will feel best right now." },
  { key: "friends", label: "Friends / approval", note: "What will they think? drives my choices." },
  { key: "enemy", label: "An enemy or grievance", note: "Someone who wronged me takes up much of my thinking." },
  { key: "religion", label: "Religious community (as an institution)", note: "Standing and image in my community guide me." },
  { key: "self", label: "Self", note: "What's in it for me? is my first question." },
  { key: "principles", label: "Principles", note: "Timeless principles guide me, whatever others do." },
] as const;

export const LIFE_SUPPORT_FACTORS = [
  { key: "security", label: "Security", prompt: "Where does my sense of worth come from?" },
  { key: "guidance", label: "Guidance", prompt: "What really directs my decisions?" },
  { key: "wisdom", label: "Wisdom", prompt: "Through what lens do I see life?" },
  { key: "power", label: "Power", prompt: "What gives, or limits, my capacity to act?" },
];

export const PROACTIVE_CHALLENGE = {
  days: 30,
  rules: [
    "Work only on things inside your Circle of Influence.",
    "Make one small commitment each day, and keep it.",
    "Be a model, not a critic; part of the solution, not the problem.",
    "When you make a mistake, admit it, correct it, and learn from it right away.",
    "Notice reactive language and choose your words.",
  ],
};
