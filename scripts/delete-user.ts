/**
 * One-time script: delete a user from Supabase Auth + our DB.
 * Usage: npx tsx scripts/delete-user.ts
 */
import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";

const EMAIL = "ibehchimaobi98@gmail.com";
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function run() {
  // 1. Look up user by email via REST API (SDK listUsers has no email filter)
  const searchRes = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(EMAIL)}&per_page=1`,
    { headers }
  );
  const searchData = await searchRes.json();
  console.log("Search result:", JSON.stringify(searchData, null, 2));

  const user = searchData?.users?.[0];
  if (!user) {
    console.log(`No Supabase auth user found for ${EMAIL}`);
  } else {
    const delRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      method: "DELETE",
      headers,
    });
    if (!delRes.ok) {
      const err = await delRes.json();
      throw new Error(`Delete failed: ${JSON.stringify(err)}`);
    }
    console.log(`✓ Deleted Supabase auth user: ${user.id}`);
  }

  // 2. Delete from our DB
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);
  const deleted = await db.delete(users).where(eq(users.email, EMAIL)).returning();
  await client.end();

  if (deleted.length > 0) {
    console.log(`✓ Deleted DB user: ${deleted[0].openId}`);
  } else {
    console.log(`No DB user found for ${EMAIL}`);
  }

  console.log("\nDone. Clear localhost cookies in your browser, then sign up fresh.");
}

run().catch((err) => {
  console.error("Error:", err.message ?? err);
  process.exit(1);
});
