import type { Config } from "drizzle-kit";

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.FENIX_DATABASE_URL ?? "postgresql://fenix@localhost:5432/fenix",
  },
} satisfies Config;
