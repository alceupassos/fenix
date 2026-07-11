import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Null-safe DB client. Portal-specific FENIX_DATABASE_URL points at a dedicated
 * `fenix` database (kept separate from the co-located LobeChat DB). When it is
 * absent, `db` is null and the repository layer falls back to the mock data so
 * the app still runs locally.
 */
const url = process.env.FENIX_DATABASE_URL;

const globalForDb = globalThis as unknown as {
  _fenixDb?: PostgresJsDatabase<typeof schema>;
  _fenixClient?: ReturnType<typeof postgres>;
};

let db: PostgresJsDatabase<typeof schema> | null = null;

if (url) {
  const client = globalForDb._fenixClient ?? postgres(url, { prepare: false });
  if (process.env.NODE_ENV !== "production") globalForDb._fenixClient = client;
  db = globalForDb._fenixDb ?? drizzle(client, { schema });
  if (process.env.NODE_ENV !== "production") globalForDb._fenixDb = db;
}

export { db, schema };
export const hasDb = Boolean(url);
