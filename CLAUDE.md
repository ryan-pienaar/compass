# Notes for AI assistants working on Compass

Compass is a hosted, multi-user planner (Habits 1–3 of *The 7 Habits*): a Vite SPA and a Hono API on Vercel, Supabase Postgres, Auth0 sign-in. Read `docs/PLAN.md` for the product rules, `docs/PRINCIPLES.md` for the principle-to-feature map and `docs/DEPLOY.md` for hosting before changing behaviour. The deployment is production; don't add anything that weakens auth or data isolation in production builds.

## Commands

- `pnpm dev`: Vite (5173) + API (4318, `--dev`). Without `.env.local`: in-process Postgres (PGlite) in `./data/pglite` and a local user without sign-in.
- `pnpm test`: Vitest (`tests/`), each test on a fresh in-memory PGlite.
- `pnpm typecheck`: `tsc -b`, both client and server projects.
- `pnpm build`: client build. The Vercel build also compiles `api/index.ts`.
- `pnpm db:generate` after editing `server/db/schema.ts`; `pnpm db:migrate` applies migrations to Supabase (`DATABASE_MIGRATION_URL` / `DATABASE_URL`). Production never migrates on a request.

## Security rules (production)

- **Every query is scoped to the caller**: services take a `Scope` (`server/context.ts`: `db`, `userId`, `timeZone`, `today`) and every read, update and delete filters by `userId`; every insert sets it. Ids that arrive from the client and point at other rows (roleId, goalId, taskId, ...) go through `assertOwned` (`server/services/owned.ts`).
- Auth happens once, in the middleware in `server/app.ts`: an unauthenticated request never reaches a route. Auth0 tokens are verified with jose (RS256, issuer, audience, required `sub`/`exp`).
- The local-user shortcut exists only for `server/index.ts --dev`. `api/index.ts` passes `allowLocal: false` and must keep refusing to start without `DATABASE_URL` and Auth0 settings. Sample data is dev-only (403 otherwise).
- RLS is enabled on every table (`pgTable.withRLS`) with no policies, so Supabase's Data API exposes nothing. The server's connection bypasses RLS, so the `userId` filters are the real protection.
- 500 responses carry a generic message; details go to the function log only.

## Versions and APIs that differ from older examples

- **Server code runs directly on Node's TypeScript stripping** in development; imports use explicit `.ts` extensions, type-only imports need `import type`, and there are no enums, namespaces or parameter properties (`erasableSyntaxOnly`). Server code must not use the `@/` or `@shared/` aliases. `shared/` follows the same rules. On Vercel, the root `tsconfig.json` (`rewriteRelativeImportExtensions`) turns `.ts` imports into `.js`; Vercel reads only that file, so keep its options in step with `tsconfig.node.json`.
- **Drizzle ORM 1.0 RC** (pinned) on Postgres, fully async: `const [row] = await db.insert(…).values(…).returning()`, `await db.transaction(async (tx) => …)`; pass `{ ...s, db: tx }` to services inside a transaction. Production driver `postgres` (postgres-js, `prepare: false` for the transaction pooler) in `server/db/client.ts`; PGlite in `server/db/pglite.ts`, which the deployed function must never import. Timestamps are `timestamptz` exposed as ISO strings (custom `isoTimestamp` column); dates are `date` columns as `YYYY-MM-DD` strings.
- **Time zones**: the server runs in UTC. The browser sends `X-Timezone`; use `s.today` and the `*InZone` helpers in `shared/dates.ts` on the server, never `todayISO()` or local-time `Date` getters.
- **Auth in the SPA**: `src/lib/auth.tsx` gates the router behind Auth0 (`@auth0/auth0-react` 2); `src/lib/api-fetch.ts` adds the token and time zone to every API call. Use `apiFetch` for any raw `fetch` to `/api`.
- **@dnd-kit/react 0.5** (pinned), not `@dnd-kit/core`: `DragDropProvider`, `useDraggable`, `useDroppable`, `useSortable` from `@dnd-kit/react/sortable`, `move()` from `@dnd-kit/helpers`, `pointerIntersection` from `@dnd-kit/collision`. Card-like draggables use `cardSensors` (`src/lib/dnd.ts`) so clicks still work; droppable ids must match what `move()` expects.
- **shadcn/ui on Base UI** (not Radix): compose with the `render` prop (`<DialogTrigger render={<Button/>}>`), not `asChild`. `Select` needs `items` to render labels. `Button` sets `nativeButton={false}` automatically when rendered as a link.
- **Hono RPC client** (`src/lib/api.ts`): `call(api.x.$get(...))` unwraps JSON and throws `ApiError`. `OkJson` drops only responses typed `ok: false`.
- **TanStack Query**: every mutation goes through `useApiMutation`, which invalidates all queries on settle. Editors that copy query data into state mount only after `isFetchedAfterMount`, and `useAutosave` flushes pending edits on unmount.

## Product rules to preserve

- A **planned day is not a deadline**: urgency comes only from a due date within `urgentWithinDays` or an explicit flag (`shared/quadrant.ts`). Store urgency only when it overrides the deadline (`flagsForQuadrant`, `urgencyToStore`). Never show "overdue" for `scheduledDate`.
- Importance is explicit, or inferred from a role/goal link. When importance is unknown, the item is untriaged and sits in the inbox.
- "I chose a higher value" counts as integrity **kept**; "not done" without a reason is unjudged (`shared/integrity.ts`). Nothing auto-rolls forward; every open rock gets a decision in the weekly review.
- Quadrant colours are a validated colorblind-safe set; use them for fills and dots only. Text stays in ink (`text-foreground` / `text-muted-foreground`).
- All guidance text is original wording. Don't paste text from the book.
- Data safety: import runs in one transaction, gives every row a fresh id and rewrites references, and the UI downloads an export first.
