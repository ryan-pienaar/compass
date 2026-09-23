# Compass

**A local, principle-centered planner for the work that matters but never shouts.**

Compass turns the first three habits of Stephen R. Covey's *The 7 Habits of Highly Effective People* into a daily and weekly practice:

| Habit | In Compass |
|---|---|
| **1 · Be proactive** | Pause-and-choose capture triage · proactive-language coach · Circle of Concern / Influence board · commitments & integrity · "acknowledge · correct · learn" reflection · 30-day proactivity test |
| **2 · Begin with the end in mind** | Personal mission statement with version history · tribute (funeral) exercise, free-write and reflection questions · roles with role statements · long-term goals written as results · affirmations checked for the five ingredients · "What's at my center?" |
| **3 · Put first things first** | Time-management matrix on every task · weekly planning ritual (review → compass → roles → big rocks → schedule → commit) · drag-and-drop weekly compass calendar · Today (daily adapting with A/B/C priorities) · Q1 → Q2 prevention · saying no with a bigger yes · stewardship delegation · time audit · urgency self-check · insights |

Everything runs on your machine. There is no account, no cloud and no telemetry; your data is one SQLite file.

> Compass is an independent personal tool inspired by the book. It is not affiliated with or endorsed by FranklinCovey. All guidance text in the app is written in our own words.

---

## Quick start

**Requirements:** Node.js **24 or newer** (with built-in `node:sqlite`) and pnpm.

```bash
pnpm install
```

Then either **double-click `Compass.cmd`** (Windows) or run:

```bash
pnpm app
```

This builds the UI if needed, starts Compass on <http://127.0.0.1:4317> and opens your browser. Keep the window open while you use it; close it (or press <kbd>Ctrl</kbd>+<kbd>C</kbd>) to stop.

The first run walks you through a five-minute setup: your week, your roles, two questions worth answering, and an optional first mission draft. Then it takes you straight into planning your first week.

### Development

```bash
pnpm dev        # Vite on :5173 (hot reload) + API on :4318, using ./data/dev.db
pnpm test       # unit + API tests (in-memory database)
pnpm typecheck  # TypeScript, client and server
pnpm build      # production UI build into ./dist
pnpm start      # production server (UI + API) on :4317
```

In development, **Settings → Your data → Load sample data** fills an empty dev database with a realistic example week.

---

## Your data

| | Location |
|---|---|
| Real data (`pnpm app` / `pnpm start`) | `%LOCALAPPDATA%\Compass\compass.db` on Windows · `~/Library/Application Support/Compass` on macOS · `~/.local/share/compass` on Linux |
| Development data (`pnpm dev`) | `./data/dev.db` (git-ignored) |
| Automatic backups | a `backups` folder next to the database: one consistent snapshot per day you use Compass (the newest 14 are kept) |

Override the location with the `COMPASS_DB` environment variable or `--db <path>`.

**Settings → Your data** shows the database path and lets you **export** everything to JSON, **import** an export (a safety backup is taken first), and **back up now**. Backups use SQLite's `VACUUM INTO`, which is safe while the app is running. Keep the database on a local disk rather than a network share.

The server only listens on `127.0.0.1`, so nothing else on your network can reach it.

---

## How to use it (the weekly rhythm)

1. **Once a week (about 30 minutes): plan.** Use *Plan your week* in the sidebar. Close out last week honestly, reread your mission, choose your roles, pick one or two **big rocks** per role (plus one per Sharpen-the-Saw dimension), and **put them on the calendar first**. Then commit.
2. **Each morning (5 to 10 minutes): adapt.** On **Today**, look at your schedule and rank your priorities A/B/C. When something comes up, press **N**: Compass asks whether it's important and whether it's urgent, then suggests a response (do it and prevent it, schedule it, delegate or decline it, or drop it).
3. **Each evening (optional, 3 minutes): reflect.** What went well, where you were reactive, what you'll own.
4. **Along the way:** work concerns into your Circle of Influence, hand off results (not tasks) as stewardships, and keep refining your mission.

Keyboard: **N** capture · **Ctrl K** search & navigate · **Esc** leaves focus mode.

---

## Project layout

```
server/            Hono API on Node (runs TypeScript natively; no build step)
  db/              Drizzle schema + SQLite client (node:sqlite), migrations applied at startup
  routes/          core (settings, onboarding, data), compass, plan, grow
  services/        week board & review, today, insights, tasks, import/export, sample data
shared/            Domain logic shared by server and UI: quadrants, dates, language coach,
                   affirmation checker, integrity, guidance text
src/               React UI
  routes/          TanStack Router file routes (one per page)
  components/      app shell, capture dialog, task sheet, focus mode, week planner (drag & drop),
                   planning steps, today, compass, insights charts, ui/ (shadcn on Base UI)
  lib/             typed API client, queries, mutations, formatting, hooks
drizzle/           SQL migrations (generated by drizzle-kit)
tests/             Vitest: domain rules + API flows against an in-memory database
docs/              Plan, principles → features map, research notes
```

Changing the schema: edit `server/db/schema.ts`, run `pnpm db:generate`, and the server applies the migration on next start.

## Tech stack

Vite 8 · React 19 · TypeScript · TanStack Router + Query · Hono · Drizzle ORM (1.0 RC) on Node's built-in `node:sqlite` · Tailwind CSS 4 · shadcn/ui (Base UI) · dnd-kit · date-fns · Vitest. See [docs/PLAN.md](docs/PLAN.md) for why.

## Troubleshooting

- **"The UI hasn't been built yet"**: run `pnpm build`, or use `pnpm app`, which builds automatically.
- **Port already in use**: `pnpm app -- --port 4400` or set `PORT`.
- **Node version**: Compass needs Node 24+. Node 25 works, but it has reached end of life; Node 24 LTS or 26 (LTS from late October 2026) is recommended.
- **pnpm 10+** may ask you to approve build scripts; approve `esbuild` (used by drizzle-kit). No native modules are compiled.
