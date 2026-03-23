/**
 * Wipe ALL users from Supabase Auth + our DB.
 * Usage: npx tsx scripts/wipe-users.ts
 */
import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { users } from "../drizzle/schema";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function run() {
  // 1. List all Supabase auth users and delete them
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, { headers });
  const data = await res.json();
  const supabaseUsers: { id: string; email: string }[] = data?.users ?? [];

  console.log(`Found ${supabaseUsers.length} Supabase auth user(s)`);
  for (const u of supabaseUsers) {
    const del = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${u.id}`, {
      method: "DELETE",
      headers,
    });
    if (del.ok) {
      console.log(`  ✓ Deleted Supabase user: ${u.email ?? u.id}`);
    } else {
      const err = await del.json();
      console.error(`  ✗ Failed to delete ${u.id}:`, err);
    }
  }

  // 2. Wipe our DB users table
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);
  await db.delete(users);
  await client.end();
  console.log("✓ Wiped users table in DB");

  console.log("\nDone. Clear localhost cookies in browser, then sign up fresh at /auth");
}

run().catch((err) => {
  console.error("Error:", err.message ?? err);
  process.exit(1);
});
