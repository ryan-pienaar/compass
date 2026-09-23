import type { DB } from "./db/client.ts";

/** Who is calling: the Auth0 subject of a verified access token (or the local user in development). */
export interface Identity {
  userId: string;
}

/** Resolves the caller from a request; null when there is no valid credential. */
export type Authenticate = (request: Request) => Promise<Identity | null>;

/** Process-wide dependencies of the API. */
export interface AppContext {
  db: DB;
  authenticate: Authenticate;
  /** Development conveniences (sample data) are available. */
  dev: boolean;
}

/**
 * Everything a service needs for one request: the database, whose data it is, and what
 * "today" means for them. The server runs in UTC, so dates come from the user's own zone.
 */
export interface Scope {
  db: DB;
  userId: string;
  timeZone: string;
  today: string;
}

/** Hono environment for route groups: the scope is set by middleware before any route runs. */
export interface ApiEnv {
  Variables: { scope: Scope };
}
