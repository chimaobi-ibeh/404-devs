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
import crypto from "crypto";

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

// ─── PKCE helpers ─────────────────────────────────────────────────────────────
function generateVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}
function generateChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

async function resolveRedirect(openId: string): Promise<string> {
  const dbUser = await db.getUserByOpenId(openId).catch(() => null);
  if (!dbUser) return "/onboarding";
  if (dbUser.role === "admin") return "/admin";
  if (dbUser.role === "advertiser") {
    const p = await getAdvertiserProfile(dbUser.id).catch(() => null);
    return p ? "/brand/dashboard" : "/onboarding";
  }
  const p = await getCreatorProfile(dbUser.id).catch(() => null);
  return p ? "/creator/dashboard" : "/onboarding";
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

  /**
   * GET /api/auth/google
   * Generates a Supabase Google OAuth URL (PKCE) and redirects the browser.
   * Stores the PKCE code_verifier in an HTTP-only cookie for the callback.
   */
  app.get("/api/auth/google", async (req: Request, res: Response) => {
    if (!ENV.supabaseUrl || !ENV.supabaseAnonKey) {
      res.redirect("/auth?error=Google+OAuth+not+configured");
      return;
    }
    const verifier = generateVerifier();
    const challenge = generateChallenge(verifier);
    const callbackUrl = `${req.protocol}://${req.get("host")}/api/auth/google/callback`;
    const params = new URLSearchParams({
      provider: "google",
      redirect_to: callbackUrl,
      code_challenge: challenge,
      code_challenge_method: "S256",
    });
    res.cookie("_pkce_v", verifier, {
      httpOnly: true,
      secure: ENV.isProduction,
      maxAge: 5 * 60 * 1000,
      sameSite: "lax",
    });
    res.redirect(`${ENV.supabaseUrl}/auth/v1/authorize?${params.toString()}`);
  });

  /**
   * GET /api/auth/google/callback
   * Exchanges the OAuth code for a Supabase session (PKCE), then issues our
   * own session cookie and redirects to the correct dashboard.
   */
  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string | undefined;
    const verifier = (req as any).cookies?._pkce_v as string | undefined;
    res.clearCookie("_pkce_v");

    if (!code || !verifier) {
      res.redirect("/auth?error=Google+sign-in+failed");
      return;
    }

    try {
      // Exchange code + verifier for tokens via Supabase REST API
      const tokenRes = await fetch(`${ENV.supabaseUrl}/auth/v1/token?grant_type=pkce`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ENV.supabaseAnonKey },
        body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
      });
      const tokenData = await tokenRes.json() as any;
      if (!tokenRes.ok || !tokenData.access_token) {
        console.error("[Google OAuth] Token exchange failed:", tokenData);
        res.redirect("/auth?error=Google+sign-in+failed");
        return;
      }

      // Verify token and get user info
      const admin = makeAdminClient();
      const { data: { user }, error } = await admin.auth.getUser(tokenData.access_token);
      if (error || !user) {
        res.redirect("/auth?error=Google+sign-in+failed");
        return;
      }

      const email = user.email ?? "";
      const name = user.user_metadata?.full_name ?? user.user_metadata?.name ?? email;
      await issueSession(res, req, user.id, email, name);

      const redirect = await resolveRedirect(user.id);
      res.redirect(redirect);
    } catch (err: any) {
      console.error("[Google OAuth] Callback error:", err?.message ?? err);
      res.redirect("/auth?error=Google+sign-in+failed");
    }
  });
}
