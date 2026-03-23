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
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
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
  }

  // Run once shortly after startup, then on the interval
  setTimeout(runJobs, 30_000);
  setInterval(runJobs, JOB_INTERVAL_MS);
  console.log(`[Jobs] Background job processor started (interval: ${JOB_INTERVAL_MS / 1000}s)`);
}

startServer().catch(console.error);
