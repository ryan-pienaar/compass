import type { DatabaseSync } from "node:sqlite";
import type { DB } from "./db/client.ts";

export interface AppContext {
  db: DB;
  client: DatabaseSync;
  dbPath: string;
  dev: boolean;
}
