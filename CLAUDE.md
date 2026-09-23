# Notes for AI assistants working on Compass

Compass is a local, single-user planner (Habits 1–3 of *The 7 Habits*). Read `docs/PLAN.md` for the product rules and `docs/PRINCIPLES.md` for the principle-to-feature map before changing behaviour.

## Commands

- `pnpm dev`: Vite (5173) + API (4318, `--dev`, uses `./data/dev.db`).
- `pnpm test`: Vitest (`tests/`), in-memory DB.
- `pnpm typecheck`: `tsc -b`, both client and server projects.
- `pnpm build` / `pnpm start` / `pnpm app`.
- `pnpm db:generate`: after editing `server/db/schema.ts`; migrations are applied automatically at server start.

## Versions and APIs that differ from older examples

- **Server code runs directly on Node's TypeScript stripping** (no build). Imports must use explicit `.ts` extensions, type-only imports need `import type`, and there are no enums, namespaces or parameter properties (`erasableSyntaxOnly`). Server code must not use the `@/` or `@shared/` aliases; use relative paths. Code in `shared/` follows the same rules because the server imports it.
- **Drizzle ORM 1.0 RC** (pinned) with `drizzle-orm/node-sqlite`: `drizzle({ client })` (no `schema` option), `migrate` from `drizzle-orm/node-sqlite/migrator`. The API is synchronous: `.all()`, `.get()`, `.run()`, `db.transaction((tx) => …)`. Migrations live in `drizzle/<timestamp>_<name>/migration.sql`.
- **@dnd-kit/react 0.5** (pinned), not `@dnd-kit/core`: `DragDropProvider`, `useDraggable`, `useDroppable`, `useSortable` from `@dnd-kit/react/sortable`, `move()` from `@dnd-kit/helpers`, `pointerIntersection` from `@dnd-kit/collision`. Drop maths reads `event.operation.position.current` (pointer) and live `getBoundingClientRect()`s.
- **shadcn/ui on Base UI** (not Radix): compose with the `render` prop (`<DialogTrigger render={<Button/>}>`), not `asChild`. `Select` needs `items` to render labels. `Button` sets `nativeButton={false}` automatically when rendered as a link.
- **Hono RPC client** (`src/lib/api.ts`): `call(api.x.$get(...))` unwraps JSON and throws `ApiError`. `OkJson` drops only responses typed `ok: false`.
- **TanStack Query**: every mutation goes through `useApiMutation`, which invalidates all queries on settle (local data is small; this avoids stale views). Drag-and-drop views patch the cache optimistically first.

## Product rules to preserve

- A **planned day is not a deadline**: urgency comes only from a due date within `urgentWithinDays` or an explicit flag (`shared/quadrant.ts`). Never show "overdue" for `scheduledDate`.
- Importance is explicit, or inferred from a role/goal link. When importance is unknown, the item is untriaged and sits in the inbox.
- "I chose a higher value" counts as integrity **kept** (`shared/integrity.ts`). Nothing auto-rolls forward; unfinished rocks are decided in the weekly review.
- Quadrant colours are a validated colorblind-safe set; use them for fills and dots only. Text stays in ink (`text-foreground` / `text-muted-foreground`).
- All guidance text is original wording. Don't paste text from the book.
- Data safety: backups via `VACUUM INTO`; import runs in one transaction with deferred foreign keys and backs up first.
