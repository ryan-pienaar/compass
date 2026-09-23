# Compass

**A principle-centered planner for the work that matters but never shouts.**

Compass turns the first three habits of Stephen R. Covey's *The 7 Habits of Highly Effective People* into a daily and weekly practice:

| Habit | In Compass |
|---|---|
| **1 · Be proactive** | Pause-and-choose capture triage · proactive-language coach · Circle of Concern / Influence board · commitments & integrity · "acknowledge · correct · learn" reflection · 30-day proactivity test |
| **2 · Begin with the end in mind** | Personal mission statement with version history · tribute (funeral) exercise, free-write and reflection questions · roles with role statements · long-term goals written as results · affirmations checked for the five ingredients · "What's at my center?" |
| **3 · Put first things first** | Time-management matrix on every task · weekly planning ritual (review → compass → roles → big rocks → schedule → commit) · drag-and-drop weekly compass calendar · Today (daily adapting with A/B/C priorities) · Q1 → Q2 prevention · saying no with a bigger yes · stewardship delegation · time audit · urgency self-check · insights |

Compass is a hosted web app: sign in with Auth0, and your plans are stored in Supabase
Postgres and served from Vercel. Every record belongs to the account that created it and
every query is filtered by it; nobody else can read your data. There is no telemetry.

> Compass is an independent personal tool inspired by the book. It is not affiliated with or endorsed by FranklinCovey. All guidance text in the app is written in our own words.

---

## Running it in production

The app deploys as one Vercel project:
- the React UI as static files;
- the API as a single Vercel Function under `/api`;
- data in Supabase Postgres;
- sign-in through Auth0.

**[docs/DEPLOY.md](docs/DEPLOY.md)** walks through setting up each service, the
environment variables, database migrations and the first deployment.

The deployed build refuses to run half-configured:
- The Vercel build fails without the Auth0 settings.
- The API function won't start without its database URL and Auth0 settings.
- Development shortcuts (local database, no-login local user, sample data) are unavailable.

## Development

**Requirements:** Node.js 24 and pnpm 9 (`corepack enable` picks up the pinned version).

```bash
pnpm install
pnpm dev        # Vite on :5173 (hot reload) + API on :4318
pnpm test       # domain rules + API flows on an in-memory Postgres (PGlite)
pnpm typecheck  # TypeScript, client and server
pnpm build      # production UI build into ./dist
```

With no `.env.local`, `pnpm dev` uses an in-process Postgres in `./data/pglite` and a
single local user with no sign-in. **Settings → Your data → Load sample data** fills it
with a realistic week. To work against the real services, copy `.env.example` to
`.env.local` and fill it in.

Schema changes: edit `server/db/schema.ts`, run `pnpm db:generate`, commit the new folder
in `drizzle/`, and apply it to Supabase with `pnpm db:migrate` before deploying code that
needs it. Local development applies migrations on startup.

---

## Your data

**Settings → Your data** exports everything to a JSON file, and imports one. Importing
replaces your data, so a copy of the current data is downloaded first. Exports from the
earlier local-only version of Compass import too.

Supabase's free plan has no automatic backups (and pauses inactive projects), so export
regularly or use a paid plan for daily backups.

---

## How to use it (the weekly rhythm)

1. **Once a week (about 30 minutes): plan.** Use *Plan your week* in the sidebar.
   - Close out last week honestly and reread your mission.
   - Choose your roles and pick one or two **big rocks** per role, plus one per Sharpen-the-Saw dimension.
   - **Put them on the calendar first**, then commit.
2. **Each morning (5 to 10 minutes): adapt.** On **Today**, look at your schedule and rank your priorities A/B/C. When something comes up, press **N**. Compass asks whether it's important and whether it's urgent, then suggests a response: do it and prevent it, schedule it, delegate or decline it, or drop it.
3. **Each evening (optional, 3 minutes): reflect.** What went well, where you were reactive, what you'll own.
4. **Along the way:** work concerns into your Circle of Influence, hand off results (not tasks) as stewardships, and keep refining your mission.

Keyboard: **N** capture · **Ctrl K** search & navigate · **Esc** leaves focus mode.

---

## Project layout

```
api/index.ts       The Vercel Function: the whole API, backed by Supabase and Auth0
server/            Hono API (TypeScript run natively by Node in development)
  app.ts           authentication + per-request scope (user, time zone, "today"), routes
  auth.ts          Auth0 access-token verification (jose, RS256, JWKS)
  db/              Drizzle schema (Postgres), Supabase client, PGlite for dev/tests
  routes/          core (settings, onboarding, data), compass, plan, grow
  services/        week board & review, today, insights, tasks, import/export, sample data
  index.ts         local Node server for development
shared/            Domain logic shared by server and UI: quadrants, dates and time zones,
                   language coach, affirmation checker, integrity, guidance text
src/               React UI
  routes/          TanStack Router file routes (one per page)
  components/      app shell, capture dialog, task sheet, focus mode, week planner (drag & drop),
                   planning steps, today, compass, insights charts, ui/ (shadcn on Base UI)
  lib/             typed API client, Auth0 sign-in gate, queries, mutations, formatting, hooks
drizzle/           SQL migrations (generated by drizzle-kit)
tests/             Vitest: domain rules, database and API flows (including isolation between users)
docs/              Deployment guide, plan, principles → features map, research notes
```

## Tech stack

Vite 8 · React 19 · TypeScript · TanStack Router + Query · Hono · Drizzle ORM (1.0 RC) on Postgres (Supabase; PGlite in development) · Auth0 (`@auth0/auth0-react`, jose) · Vercel Functions · Tailwind CSS 4 · shadcn/ui (Base UI) · dnd-kit · date-fns · Vitest. See [docs/PLAN.md](docs/PLAN.md) for why.

## Troubleshooting

- **"Sign in required" (401) from the API**: the Auth0 audience or domain differs between the browser (`VITE_AUTH0_*`) and the server (`AUTH0_*`) settings.
- **Callback URL mismatch at sign-in**: add the exact site URL to the Auth0 application's Allowed Callback, Logout and Web Origin URLs.
- **The function fails at startup**: `DATABASE_URL`, `AUTH0_DOMAIN` or `AUTH0_AUDIENCE` isn't set for that Vercel environment.
- **Changed a `VITE_*` value on Vercel**: redeploy, since these are compiled into the bundle.
- **Slow API responses**: set the Vercel Function region to the one closest to your Supabase project.
