import { defineConfig } from "drizzle-kit";

// Use DIRECT_URL for migrations (bypasses the transaction pooler which drops
// long-running DDL connections). Falls back to DATABASE_URL if not set.
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
