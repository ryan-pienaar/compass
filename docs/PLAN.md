# Compass: product and technical plan

## 1. Goal

A local web app that helps one person spend more time in **Quadrant II** (important, not urgent) by implementing Habits 1–3 of *The 7 Habits of Highly Effective People* as a working system:

- a **task manager** where every item carries its urgency × importance,
- a **weekly planner** built on Covey's Quadrant II organizing (roles → goals → scheduling → daily adapting),
- a **focus and prioritization aid** for the moment something comes up and for each day.

Constraints: local only (no backend infrastructure), SQLite for storage, a stack that is easy to extend later (desktop wrapper, sync, deployment).

## 2. Research summary

### 2.1 The book (Habits 1–3, plus the "new insights" sections and the "Quadrant II day at the office" appendix)

The "recipe" is a chain from inner leadership to outer management:

1. **Habit 1: be proactive.** Between stimulus and response is the freedom to choose. Responsibility means *response-ability*. Listen to your language. Focus on the Circle of Influence (direct / indirect / no-control problems all have a first step inside it). Make and keep commitments, since integrity is the core of proactivity. Admit, correct and learn from mistakes right away. Try it for 30 days.
2. **Habit 2: begin with the end in mind.** All things are created twice. Leadership (doing the right things) comes before management (doing things right). A personal mission statement is a personal constitution, drafted over weeks and reviewed regularly, with guidance from the tribute (funeral) visualization, from knowing your center, from affirmations (personal, positive, present, visual, emotional), and broken down into roles and long-term goals that describe results, not activities.
3. **Habit 3: put first things first.** The time management matrix. Importance is contribution to your mission, roles and goals; urgency is pressure to act now. Q1 shrinks only as Q2 grows; the first Q2 time comes from Q3 and Q4, which means saying no pleasantly with a bigger yes. A fourth-generation tool must meet six criteria: *coherence, balance, Q2 focus (weekly), a people dimension, flexibility, portability*. The Q2 process is to identify roles, select one or two goals per role, schedule them (a priority on a day or, better, an appointment), then adapt daily with A/B/C ordering, and to subordinate the schedule to people without guilt. Stewardship delegation rests on five agreed elements (desired results, guidelines, resources, accountability, consequences). The exercises: estimate your quadrant split and log three days in 15-minute intervals, list what you could delegate, and evaluate each week by how well the plan translated your values into your days.

### 2.2 Prior art (FranklinCovey PlanPlus, the 7 Habits app, Week Plan, Achieve Planner; Sunsama, Akiflow, Structured, Things, TickTick, Todoist)

What people valued: the explicit link from values to tasks through roles; the weekly compass; big rocks.
Why they quit:
- fragile software and lost data;
- a matrix that turns into a stale dumping ground;
- piles of overdue items breeding guilt and avoidance;
- over-planning and setup friction;
- skipped reviews;
- automation taking control away;
- streaks that punish a miss.

Adopted as design rules:
- The Q2 loop is primary; the matrix is for triage and reflection only.
- Rocks go on the calendar before small tasks.
- Show a whole-life capacity meter (target ≤ 60% of waking hours).
- A planned day is **not** a deadline: nothing turns red for missing a plan.
- Decide instead of auto-rolling tasks over, and show a carry count.
- Fold the review into weekly planning.
- Guardrails rather than quotas: 1–2 rocks per role, and "no rock this week" is allowed.
- If–then plans only for the top 1–3 rocks.
- No punishing streaks; offer a fresh start after a gap.
- Data stays durable and local: autosave, daily backups, JSON export.

### 2.3 Technology (verified September 2026)

| Option | Verdict |
|---|---|
| **Vite + React SPA + Hono API + Drizzle on `node:sqlite`** | **Chosen.** Highly interactive client (drag-and-drop calendar, matrix, sortable lists) with no SSR/hydration friction; one Node process in production; typed RPC client; zero native modules; easiest to wrap as a desktop app later. |
| TanStack Start | Excellent DX but still labelled Release Candidate; running on plain Node needs a beta server layer. Natural migration target later (same router). |
| React Router v8 (framework mode) | Stable; revalidate-after-every-action is clumsier for optimistic drag-and-drop. |
| Next.js 16 | Server-first model adds nothing for a local single-user app. |
| SvelteKit | Good DX, but kit 3 is in prerelease and drag-and-drop libraries are thin. |
| In-browser SQLite (OPFS) / PGlite | Rejected: data would live in browser storage instead of a file you can see, back up and move. |

Database driver: this machine has no C++ build tools, so `better-sqlite3` installs are fragile under npm/pnpm. **Node's built-in `node:sqlite`** (release candidate in Node 25, SQLite 3.51) with **Drizzle ORM 1.0 RC** (the only Drizzle line with a native `node:sqlite` driver) works with no compilation. Both RC dependencies are pinned exactly and isolated in `server/db`.

UI: shadcn/ui on Base UI (its current default) with Tailwind 4; @dnd-kit/react 0.5 (pinned) for all drag-and-drop; a custom CSS-grid week calendar (no second drag system); hand-built SVG charts following a validated, colorblind-safe palette.

## 3. Product principles: the six criteria as acceptance tests

| Criterion | What it means for Compass |
|---|---|
| **Coherence** | Mission → roles → long-term goals → weekly rocks → calendar blocks → today are linked; focus mode shows the "why" chain. |
| **Balance** | Roles are visible while planning; the week shows roles without a rock and Sharpen-the-Saw coverage; insights show role balance over weeks. |
| **Quadrant II focus** | The week is the planning unit; big rocks are placed first; daily planning is adapting. |
| **People dimension** | "I chose a higher value" is a first-class outcome that counts *toward* integrity; moving a plan asks why, without judgement; there is no overdue red for planned days. |
| **Flexibility** | Almost every field is optional; week start, planning day, hours, urgency window, capacity target and language coach are configurable. |
| **Portability** | Runs in any browser on the machine; responsive layout; one portable SQLite file plus JSON export. |

## 4. Information architecture

```
Put first things first (Habit 3)   Today · Week · Matrix · Tasks · Stewardships
Begin with the end in mind (2)     Compass (mission, affirmations, exercises, center) · Roles & goals
Be proactive (1)                   Influence (concerns, 30-day test, language) · Journal · Insights
                                   Settings · Plan your week (/plan/:week, shown when due) · Capture (N) · Search (Ctrl K)
```

## 5. Core flows

- **Onboarding (5 min):** why it works → your week (start day, planning day, hours) → roles (≤ 7, Sharpen the Saw added) → the two "one thing" questions become long-term goals → optional mission draft → plan your first week.
- **Weekly ritual (about 30 min, with an elapsed timer, autosaved and resumable):**
  1. **Review:** decide each unfinished rock (higher value / let it slide / planned too much / no longer relevant, and whether to carry it); rate the week, note three wins and a lesson; see four-week balance. After a gap, offer a fresh start.
  2. **Compass:** mission, affirmations, long-term goals; "most important thing in each role this week?"; intention.
  3. **Roles:** choose this week's roles.
  4. **Big rocks:** 1–2 per role, plus the four renewal dimensions; suggestions from long-term goals, last week and the Q2 backlog.
  5. **Schedule:** drag rocks onto a day or a time; capacity meter.
  6. **Commit:** summary, warnings, if–then plans for the top rocks, commit.
- **Daily adapting (Today):** T-layout with schedule (gaps shown as open time) on the left and A/B/C priorities (sortable) on the right; the week's rocks not yet on today; items waiting for a decision; deadlines; check-ins due; focus mode; evening reflection; 30-day test check-in.
- **Capture → pause & choose:** important? (a role or goal link answers yes) urgent? (deadline-driven) → the quadrant suggests a response:
  - **Q1:** do it today, plus a Q2 prevention step.
  - **Q2:** schedule it, or make it a big rock.
  - **Q3:** delegate as a stewardship, batch it, or decline with the bigger yes shown.
  - **Q4:** drop it.

## 6. Data model

`settings` · `roles` · `goals` (long-term) · `missions` + `mission_versions` · `weeks` + `week_roles` · `tasks` (tasks **and** weekly rocks, `kind = task | goal`) · `blocks` (calendar) · `affirmations` · `concerns` · `delegations` + `delegation_checkins` · `journal` (reflections, choices, exercises, notes) · `time_audits` + `time_entries` · `challenges` + `challenge_days` · `assessments`.

Rules:
- Dates are local `YYYY-MM-DD`; times are minutes from midnight.
- Importance comes from an explicit flag, or is inferred from a role/goal link. Urgency comes from an explicit flag, or from a deadline within N days. When neither is known, the item is untriaged and sits in the inbox.
- `created_quadrant` records the quadrant at capture, which makes "Q2 work that became urgent" visible.
- Weekly rocks are promises: `open | done | missed | dropped` + reason. Integrity = (done + chose a higher value) ÷ decided.

## 7. Build phases (all delivered)

1. Research (book, prior art, stack) and plan.
2. Data layer, API, domain rules; tests for domain rules and API flows.
3. App shell, design tokens, capture dialog, task sheet, focus mode, command palette.
4. Weekly compass calendar with drag-and-drop; weekly planning ritual.
5. Today; Matrix; Tasks.
6. Compass (mission, affirmations, exercises, center); Roles & goals.
7. Influence (concerns, 30-day test, language); Stewardships; Journal.
8. Insights (charts, time audit, urgency check); Settings (export/import/backup).
9. Verification in the browser, production build, docs.

## 8. Ideas for later

- `.ics` export of the week; read-only calendar import to evaluate existing appointments during planning.
- Recurring rock templates (suggest, never auto-add).
- Estimate calibration (planned vs actual minutes from focus sessions).
- Desktop wrapper (Tauri or Electron) running the same Node server as a sidecar; optional sync.
- Family or team mission statements.
