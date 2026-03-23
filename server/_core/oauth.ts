/**
 * Auth routes — fully server-side.
 *
 * Flow:
 *  1. Frontend POSTs { email, password } to /api/auth/login or /api/auth/register
 *  2. Server uses Supabase Admin SDK (bypasses email confirmation entirely)
 *  3. Server upserts the user in our DB and issues our own session cookie
 *  4. All subsequent requests use the session cookie (verified by sdk.ts)
 */

import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import * as db from "../db";
import { getCreatorProfile, getAdvertiserProfile } from "../db";
import { ENV } from "./env";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function makeAdminClient() {
  return createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function makeAnonClient() {
  return createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function issueSession(
  res: Response,
  req: Request,
  openId: string,
  email: string | undefined,
  name: string | null,
  role?: string
) {
  const isAdmin = ENV.adminEmail && email === ENV.adminEmail;

  await db.upsertUser({
    openId,
    name,
    email: email ?? null,
    loginMethod: "email",
    role: isAdmin ? "admin" : (role ?? "creator"),
    lastSignedIn: new Date(),
  });

  const sessionToken = await sdk.createSessionToken(openId, {
    name: name ?? "",
    expiresInMs: ONE_YEAR_MS,
  });

  res.cookie(COOKIE_NAME, sessionToken, {
    ...getSessionCookieOptions(req),
    maxAge: ONE_YEAR_MS,
  });
}

export function registerOAuthRoutes(app: Express) {
  /**
   * POST /api/auth/register
   * Body: { email, password }
   * Creates the Supabase user with email pre-confirmed (no email verification needed).
   */
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    try {
      const admin = makeAdminClient();

      // Create user with email confirmed so they can sign in immediately
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (error) {
        // If user already exists, fall through to login
        if (error.message?.toLowerCase().includes("already")) {
          res.status(409).json({ error: "An account with that email already exists. Please sign in." });
        } else {
          res.status(400).json({ error: error.message });
        }
        return;
      }

      const user = data.user;
      const name = user.user_metadata?.full_name ?? user.user_metadata?.name ?? email;

      await issueSession(res, req, user.id, email, name);
      // New registration — always needs onboarding
      res.json({ ok: true, redirect: "/onboarding" });
    } catch (err: any) {
      console.error("[Auth] Register failed:", err?.message ?? err);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  /**
   * POST /api/auth/login
   * Body: { email, password }
   * Signs in. If email is unconfirmed, confirms it first (dev-friendly).
   */
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    try {
      const admin = makeAdminClient();
      const anon = makeAnonClient();

      // Attempt sign-in
      let { data, error } = await anon.auth.signInWithPassword({ email, password });

      // If blocked by unconfirmed email, confirm via admin and retry
      if (error?.message?.toLowerCase().includes("email not confirmed")) {
        // generateLink returns the user object so we can get their id
        const { data: linkData } = await admin.auth.admin.generateLink({
          type: "magiclink",
          email,
        });
        if (linkData?.user?.id) {
          await admin.auth.admin.updateUserById(linkData.user.id, {
            email_confirm: true,
          });
          const retry = await anon.auth.signInWithPassword({ email, password });
          data = retry.data;
          error = retry.error;
        }
      }

      if (error || !data?.session) {
        res.status(401).json({ error: error?.message ?? "Invalid email or password" });
        return;
      }

      const user = data.user;
      const name = user.user_metadata?.full_name ?? user.user_metadata?.name ?? email;

      await issueSession(res, req, user.id, email, name);

      // Check if user already has a profile to skip onboarding
      const dbUser = await db.getUserByOpenId(user.id).catch(() => null);
      let redirect = "/onboarding";
      if (dbUser) {
        if (dbUser.role === "admin") redirect = "/admin";
        else if (dbUser.role === "advertiser") {
          const profile = await getAdvertiserProfile(dbUser.id).catch(() => null);
          redirect = profile ? "/brand/dashboard" : "/onboarding";
        } else {
          const profile = await getCreatorProfile(dbUser.id).catch(() => null);
          redirect = profile ? "/creator/dashboard" : "/onboarding";
        }
      }

      res.json({ ok: true, redirect });
    } catch (err: any) {
      console.error("[Auth] Login failed:", err?.message ?? err);
      res.status(500).json({ error: "Login failed" });
    }
  });

  /**
   * POST /api/auth/logout
   * Clears the session cookie.
   */
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME);
    res.json({ ok: true });
  });

  /**
   * POST /api/auth/forgot-password
   * Body: { email }
   * Sends a Supabase password reset email.
   */
  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    const { email } = req.body ?? {};
    if (!email) { res.status(400).json({ error: "email is required" }); return; }
    try {
      const anon = makeAnonClient();
      // resetPasswordForEmail sends the magic link — redirect to our reset page
      const redirectTo = `${req.protocol}://${req.get("host")}/auth/reset-password`;
      const { error } = await anon.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) { res.status(400).json({ error: error.message }); return; }
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to send reset email" });
    }
  });

  /**
   * POST /api/auth/reset-password
   * Body: { accessToken, newPassword }
   * Uses Supabase admin to set the new password directly.
   */
  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    const { accessToken, newPassword } = req.body ?? {};
    if (!accessToken || !newPassword) {
      res.status(400).json({ error: "accessToken and newPassword are required" }); return;
    }
    try {
      const admin = makeAdminClient();
      // Verify the access token to get the user
      const { data: { user }, error: verifyError } = await admin.auth.getUser(accessToken);
      if (verifyError || !user) {
        res.status(401).json({ error: "Invalid or expired reset token" }); return;
      }
      const { error } = await admin.auth.admin.updateUserById(user.id, { password: newPassword });
      if (error) { res.status(400).json({ error: error.message }); return; }
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to reset password" });
    }
  });
}
