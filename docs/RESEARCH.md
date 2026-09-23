# Research notes

Condensed from the research done before building Compass (September 2026).

## Prior art and UX lessons

**Tools built on Covey's system**
- **FranklinCovey PlanPlus.** Wizards for mission, values, goals, role balance and a weekly compass, with drag-onto-calendar. People who liked the method still left over fragility: sync conflicts, lost data, and wizards that lost input. [review](https://learn.microsoft.com/en-us/archive/blogs/jonathanh/review-of-franklincoveys-planplus)
- **Living the 7 Habits app.** Mission builder, a "7×7" commitment programme and Big Rocks by role. Reviews mention crashes, forced sign-ins, and closed weeks that can't be reopened. [release](https://ir.franklincovey.com/news-releases/news-release-details/franklin-covey-cos-living-7-habits-app-new-updated-7-habits-work/)
- **Week Plan.** Roles, weekly goals and a quadrant view are praised; the learning curve and data-loss updates are criticised. [features](https://weekplan.net/weekly-planner/)
- **Achieve Planner (Effexis).** Capable but heavy. [GTD forum](https://forum.gettingthingsdone.com/threads/achieve-planner-software-from-effexis.3204/)

**Adjacent planners**
- **Sunsama.** A daily ritual with a workload limit, weekly objectives, and an auto-archive after repeated rollovers. [daily planning](https://help.sunsama.com/docs/daily-planning)
- **Akiflow.** Planning and shutdown rituals; aims for 3–5 weekly goals. [rituals](https://product.akiflow.com/help/articles/0805246-rituals)
- **Structured.** A "replan" flow that goes through unfinished items one at a time. [blog](https://structured.app/blog/replan)
- **Things.** Separates "when" from "deadline". [support](https://culturedcode.com/things/support/articles/2803579/)
- **TickTick and Todoist.** Matrix views driven by rules or priority flags. [TickTick](https://help.ticktick.com/articles/7055782040439881728)

**Failure modes**
- Q2 work gets sorted but never scheduled. [HN](https://news.ycombinator.com/item?id=39949866)
- Everything gets labelled urgent and important, and the labels go stale.
- Overdue piles breed guilt and avoidance. [XDA](https://www.xda-developers.com/no-to-do-list-experiment/)
- Over-planning.
- Setup effort and fragile software.
- Skipped reviews. [GTD](https://gettingthingsdone.com/2015/07/podcast-07-guided-gtd-weekly-review/)
- Automation that takes control away.
- Tasks cut off from values.
- Streaks that punish a single miss. [INSEAD](https://knowledge.insead.edu/marketing/consumer-streaks-are-motivating-key-keeping-them-alive)

**Evidence borrowed**
- Planning fallacy [(Buehler 1994)](https://web.mit.edu/curhan/www/docs/Articles/biases/67_J_Personality_and_Social_Psychology_366,_1994.pdf): hence coarse estimates and a capacity target.
- Slack and buffer ([Fowler](https://martinfowler.com/bliki/Slack.html)): plan about 60% of the time.
- Implementation intentions ([Gollwitzer & Sheeran](https://www.researchgate.net/publication/37367696_Implementation_Intentions_and_Goal_Achievement_A_Meta-Analysis_of_Effects_and_Processes)) help most when used sparingly ([Dalton & Spiller](https://academic.oup.com/jcr/article-abstract/39/3/600/1822636)): hence if–then plans only for the top 1–3 rocks.
- Making a plan for an unfinished goal relieves the intrusive thoughts about it ([Masicampo & Baumeister](https://users.wfu.edu/masicaej/MasicampoBaumeister2011JPSP.pdf)): hence decide, don't drift.
- The start of a week works as a "fresh start" point ([Dai et al.](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2204126)).

## Hosted stack verification (September 2026)

Checked against current docs, in scratch projects, and with an offline `vercel build` of this repository:

- **Drizzle 1.0.0-rc.4 on Postgres**: `drizzle-orm/postgres-js`, `/node-postgres` and `/pglite`. Each has its own migrator; a transaction extends `PgAsyncDatabase`, so one `DB` type fits all of them.
  - `pgTable.withRLS()` enables row-level security; `.enableRLS()` is deprecated.
  - drizzle-kit keeps the folder-per-migration layout. The migrator takes no lock, so migrations run from the command line, not at function start.
  - In the drivers' codecs, `timestamp({ mode: "string" })` returns Postgres text (`2026-09-23 22:00:00+00`), not ISO. Compass therefore uses a `timestamptz` custom type that returns ISO strings. `date` columns return `YYYY-MM-DD`.
- **PGlite**: 0.4.6 runs Postgres 17.5, matching hosted Supabase; 0.5.x runs Postgres 18. Only one connection is allowed, and unclosed instances keep Node alive. Compass pins 0.4.6 for development and tests. A separate scratch check drove the real API through the production driver over the wire protocol (PGlite socket server); timestamps, dates, `jsonb`, upserts, transactions and import all behaved as with PGlite.
- **Supabase from Vercel**: the direct connection is IPv6-only, so use the shared pooler.
  - Transaction mode on port 6543 serves the app (postgres-js with `prepare: false`).
  - Session mode on port 5432 is for migrations.
  - The pooler user is the `postgres` role, which bypasses RLS. With RLS on and no policies, the Data API sees nothing.
  - Projects created after 30 May 2026 no longer expose new `public` tables by default.
  - [Connecting](https://supabase.com/docs/guides/database/connecting-to-postgres) · [IPv4/IPv6](https://supabase.com/docs/guides/troubleshooting/supabase--your-network-ipv4-and-ipv6-compatibility-cHe3BP) · [Hardening the Data API](https://supabase.com/docs/guides/database/hardening-data-api)
- **Hono on Vercel**: use `api/index.ts` with a rewrite of `/api/(.*)` to it.
  - Catch-all file names such as `[...route].ts` match only one path segment outside Next.js.
  - A default export with `.fetch` is a web handler for every method, whereas a default-exported function is treated as Node's `(req, res)`.
  - Vercel compiles each file but leaves `.ts` import specifiers alone and reads only the root `tsconfig.json`. The root `tsconfig.json` sets `rewriteRelativeImportExtensions`; without it the function fails with `ERR_MODULE_NOT_FOUND`.
  - Node 24.x is the default runtime (Node 25 isn't offered). Functions run in `iad1` unless `regions` is set.
  - [Functions API](https://vercel.com/docs/functions/functions-api-reference) · [Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions) · [Regions](https://vercel.com/docs/functions/configuring-functions/region)
- **Auth0**: `@auth0/auth0-react` 2.27 (supports React 19.2+).
  - `useRefreshTokens` adds `offline_access`; the in-memory cache loses the session on reload, hence `cacheLocation="localstorage"`.
  - Hono's built-in `jwk` middleware re-fetches the key set on every request and accepts tokens without `sub`. jose's `createRemoteJWKSet` caches keys, and `requiredClaims` enforces `sub` and `exp`.
  - [React SDK examples](https://github.com/auth0/auth0-react/blob/main/EXAMPLES.md) · [Refresh token rotation](https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation)

## Original stack verification (local version, practical tests on this machine)

- Windows 11 x64, Node 25.9.0 (ABI 141), pnpm 9.15.9, and no Visual Studio Build Tools or Python, so node-gyp builds fail.
- `better-sqlite3` 13.x ships a prebuilt binary, but npm/pnpm may still run node-gyp and fail. That made it a fallback, not the default.
- `node:sqlite` works with no flag in Node 25.9 (SQLite 3.51). **Drizzle ORM / drizzle-kit 1.0.0-rc.4** support it natively (`drizzle-orm/node-sqlite`). `generate`, `migrate`, sync and async queries, transactions and WAL were all verified. Drizzle 0.45 (npm "latest") has no `node:sqlite` driver.
- Hono 4.13 on @hono/node-server 2.1 served the SPA fallback and API from a single `node server.ts` bound to 127.0.0.1.
- UI libraries:
  - @dnd-kit/react 0.5 is the maintained line.
  - Schedule-X v4 moved drag-and-drop behind a paid plugin.
  - FullCalendar 7 would bring a second drag system, so the week grid is custom.
  - shadcn/ui defaults to Base UI since July 2026.
- Temporal ships in Chrome/Firefox but not in Node 25 or Safari, so date-fns 4 is used.

## Chart palette

Quadrant colors were validated with the data-viz palette checker in stack order (Q1→Q4), in both modes, against the actual card surfaces:

| | Q1 | Q2 | Q3 | Q4 | Worst adjacent CVD ΔE | Normal-vision floor |
|---|---|---|---|---|---|---|
| Light | `#eb6834` | `#1baf7a` | `#eda100` | `#4a3aa7` | 9.1 | 22.9 |
| Dark | `#d95926` | `#199e70` | `#c98500` | `#9085e9` | 8.4 | 19.8 |

Two light-mode fills sit below 3:1 contrast, so every chart ships direct endpoint labels and a table view. Quadrant colors are used for marks and dots only; text stays in ink.
