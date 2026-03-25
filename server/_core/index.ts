import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import {
  processPendingMonitoringJobs,
  processGracePeriodExpirations,
  processAutoApprovals,
  processNoShows,
  processPendingPayouts,
} from "../monitoring";
import { storagePut } from "../storage";
import { sdk } from "./sdk";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Request logger — helps diagnose routing issues
  app.use((req, _res, next) => {
    if (req.path.startsWith("/api/")) {
      console.log(`[REQ] ${req.method} ${req.path}`);
    }
    next();
  });
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Profile image upload
  app.post("/api/upload/profile-image", async (req, res) => {
    // Expect base64 body: { dataUrl: "data:image/jpeg;base64,..." }
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).json({ error: "Unauthorized" }); return;
    }
    const { dataUrl } = req.body ?? {};
    if (!dataUrl || !dataUrl.startsWith("data:")) {
      res.status(400).json({ error: "dataUrl is required (base64 data URL)" }); return;
    }
    try {
      const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) { res.status(400).json({ error: "Invalid data URL format" }); return; }
      const contentType = matches[1];
      const buffer = Buffer.from(matches[2], "base64");
      const ext = contentType.split("/")[1]?.split("+")[0] ?? "jpg";
      const key = `profile-images/${user.id}-${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, contentType);
      res.json({ url });
    } catch (err: any) {
      console.error("[Upload] Profile image failed:", err?.message);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // Health check — used by uptime monitors to keep the service alive
  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  // Dev-only login bypass — lets you log in as any role without Manus OAuth
  if (process.env.NODE_ENV !== "production") {
    app.get("/api/dev/login", async (req, res) => {
      const role = (req.query.role as string) || "advertiser";
      const openId = `local-${role}`;

      await import("../db").then(async (db) => {
        await db.upsertUser({
          openId,
          name: `Dev ${role.charAt(0).toUpperCase() + role.slice(1)}`,
          email: `dev-${role}@vyral.local`,
          role: role as any,
          lastSignedIn: new Date(),
        });
      });

      const { sdk } = await import("./sdk");
      const token = await sdk.createSessionToken(openId, {
        name: `Dev ${role}`,
        expiresInMs: 365 * 24 * 60 * 60 * 1000,
      });

      const { getSessionCookieOptions } = await import("./cookies");
      const { COOKIE_NAME } = await import("../../shared/const");
      res.cookie(COOKIE_NAME, token, {
        ...getSessionCookieOptions(req),
        maxAge: 365 * 24 * 60 * 60 * 1000,
      });

      res.redirect("/?dev_login=" + role);
    });

    console.log(
      "[Dev] Login bypass enabled:\n" +
        "  Advertiser → http://localhost:3000/api/dev/login?role=advertiser\n" +
        "  Creator    → http://localhost:3000/api/dev/login?role=creator\n" +
        "  Admin      → http://localhost:3000/api/dev/login?role=admin"
    );
  }
  // ── Interswitch payment callback ─────────────────────────────────────────
  // Interswitch redirects here after the user completes (or cancels) payment.
  // Query params: txnref, responseCode, responseDescription
  app.get("/api/payment/callback", async (req, res) => {
    const txnRef = req.query.txnref as string | undefined;
    const responseCode = req.query.responseCode as string | undefined;

    if (!txnRef) {
      res.redirect("/brand/dashboard?payment=error&reason=missing_ref");
      return;
    }

    try {
      const { getPaymentByRef, updatePaymentStatus, updateCampaignStatus } = await import("../db");
      const { verifyPayment } = await import("../interswitch");

      const payment = await getPaymentByRef(txnRef);
      if (!payment) {
        res.redirect("/brand/dashboard?payment=error&reason=not_found");
        return;
      }

      // Verify with Interswitch (responseCode "00" = success, but always re-verify server-side)
      const verified = responseCode === "00"
        ? await verifyPayment(txnRef, Number(payment.amount))
        : { success: false };

      if (verified.success) {
        await updatePaymentStatus(payment.id, "completed");
        await updateCampaignStatus(payment.campaignId, "active");
        res.redirect(`/brand/campaigns/${payment.campaignId}?payment=success`);
      } else {
        await updatePaymentStatus(payment.id, "failed");
        res.redirect(`/brand/campaigns/${payment.campaignId}?payment=failed`);
      }
    } catch (err: any) {
      console.error("[Payment callback]", err?.message);
      res.redirect("/brand/dashboard?payment=error&reason=server_error");
    }
  });

  // ── Pro subscription payment callback ─────────────────────────────────────
  app.get("/api/payment/pro-callback", async (req, res) => {
    const txnRef = req.query.txnref as string | undefined;
    const responseCode = req.query.responseCode as string | undefined;

    if (!txnRef) {
      res.redirect("/creator/earnings?pro=error&reason=missing_ref");
      return;
    }

    try {
      const { getPaymentByRef, updatePaymentStatus } = await import("../db");
      const { verifyPayment } = await import("../interswitch");
      const dbModule = await import("../db");

      const payment = await getPaymentByRef(txnRef);
      if (!payment) {
        res.redirect("/creator/earnings?pro=error&reason=not_found");
        return;
      }

      const verified = responseCode === "00"
        ? await verifyPayment(txnRef, Number(payment.amount))
        : { success: false };

      if (verified.success) {
        await updatePaymentStatus(payment.id, "completed");
        // Activate the pending subscription for this creator
        const pending = await dbModule.getPendingProSubscriptionByAdvertiserId(payment.advertiserId);
        if (pending) {
          await dbModule.activateProSubscription(pending.id);
          // Mark creator isPro
          await dbModule.setCreatorPro(payment.advertiserId, true);
        }
        res.redirect("/creator/earnings?pro=success");
      } else {
        await updatePaymentStatus(payment.id, "failed");
        res.redirect("/creator/earnings?pro=failed");
      }
    } catch (err: any) {
      console.error("[Pro callback]", err?.message);
      res.redirect("/creator/earnings?pro=error&reason=server_error");
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: ({ error, path }) => {
        console.error(`[tRPC] ${path ?? "unknown"}: ${error.message}`);
      },
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Global error handler — must come after all routes/middleware.
  // Prevents Express from returning its default HTML error page (which breaks tRPC clients).
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error("[Express error]", err?.message ?? err);
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  });

  const port = parseInt(process.env.PORT || "3000");
  // In production always bind to the exact PORT assigned by the host (e.g. Render).
  // Port-scanning is only useful in local dev where ports may be occupied.
  const listenPort = process.env.NODE_ENV === "production"
    ? port
    : await findAvailablePort(port);

  server.listen(listenPort, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${listenPort}/`);
  });

  startBackgroundJobProcessor();
}

/**
 * Lightweight in-process job runner.
 * Runs every 5 minutes and processes all pending background work:
 *   - Post monitoring checks (Apify)
 *   - Grace period clawbacks
 *   - Draft auto-approvals (48h silence)
 *   - Creator no-show detection
 *
 * For production, replace this interval with a dedicated worker
 * or a cron trigger (e.g. Upstash QStash, Railway cron, or a Cloud Scheduler job).
 */
function startBackgroundJobProcessor() {
  const JOB_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  async function runJobs() {
    try {
      await processPendingMonitoringJobs();
    } catch (err) {
      console.error("[Jobs] processPendingMonitoringJobs failed:", err);
    }
    try {
      await processGracePeriodExpirations();
    } catch (err) {
      console.error("[Jobs] processGracePeriodExpirations failed:", err);
    }
    try {
      await processAutoApprovals();
    } catch (err) {
      console.error("[Jobs] processAutoApprovals failed:", err);
    }
    try {
      await processNoShows();
    } catch (err) {
      console.error("[Jobs] processNoShows failed:", err);
    }
    try {
      await processPendingPayouts();
    } catch (err) {
      console.error("[Jobs] processPendingPayouts failed:", err);
    }
  }

  // Run once shortly after startup, then on the interval
  setTimeout(runJobs, 30_000);
  setInterval(runJobs, JOB_INTERVAL_MS);
  console.log(`[Jobs] Background job processor started (interval: ${JOB_INTERVAL_MS / 1000}s)`);
}

startServer().catch(console.error);
