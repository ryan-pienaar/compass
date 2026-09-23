import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./server/db/schema.ts",
  out: "./drizzle",
  // Only used by `drizzle-kit studio`; migrations are applied by the server at startup.
  dbCredentials: { url: "./data/dev.db" },
});
