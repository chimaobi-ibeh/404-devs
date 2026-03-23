import { eq, and, gte, lte, desc, asc, inArray, like, isNull, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  InsertUser,
  users,
  advertiserProfiles,
  creatorProfiles,
  socialMediaAccounts,
  campaigns,
  campaignRosters,
  contentSubmissions,
  postMonitoring,
  monitoringChecks,
  payments,
  payouts,
  vyralMatchScores,
  creatorSubscriptions,
  disputes,
  backgroundJobs,
  adminLogs,
  campaignAnalytics,
  notifications,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client = postgres(process.env.DATABASE_URL, { max: 10 });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    await db
      .insert(users)
      .values({
        openId: user.openId,
        name: user.name ?? null,
        email: user.email ?? null,
        loginMethod: user.loginMethod ?? null,
        role: user.role ?? "creator",
        lastSignedIn: user.lastSignedIn ?? new Date(),
      })
      .onConflictDoUpdate({
        target: users.openId,
        set: {
          name: user.name ?? undefined,
          email: user.email ?? undefined,
          loginMethod: user.loginMethod ?? undefined,
          role: user.role ?? undefined,
          lastSignedIn: user.lastSignedIn ?? new Date(),
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// ADVERTISER PROFILES
// ============================================================================

export async function getAdvertiserProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(advertiserProfiles).where(eq(advertiserProfiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createAdvertiserProfile(data: typeof advertiserProfiles.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(advertiserProfiles).values(data).returning();
  return result[0];
}

// ============================================================================
// CREATOR PROFILES
// ============================================================================

export async function getCreatorProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(creatorProfiles).where(eq(creatorProfiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCreatorProfileById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(creatorProfiles).where(eq(creatorProfiles.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCreatorProfile(data: typeof creatorProfiles.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(creatorProfiles).values(data).returning();
  return result[0];
}

export async function searchCreators(filters: {
  niche?: string;
  minFollowers?: number;
  maxFollowers?: number;
  minEngagement?: number | string;
  tier?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(creatorProfiles.verificationStatus, "verified")];
  if (filters.niche) conditions.push(like(creatorProfiles.niche, `%${filters.niche}%`));
  if (filters.minFollowers) conditions.push(gte(creatorProfiles.totalFollowers, filters.minFollowers));
  if (filters.maxFollowers) conditions.push(lte(creatorProfiles.totalFollowers, filters.maxFollowers));
  if (filters.minEngagement) conditions.push(gte(creatorProfiles.engagementRate, String(filters.minEngagement)));
  if (filters.tier) conditions.push(eq(creatorProfiles.tier, filters.tier));

  return db
    .select()
    .from(creatorProfiles)
    .where(and(...conditions))
    .limit(filters.limit ?? 20)
    .offset(filters.offset ?? 0);
}

// ============================================================================
// CAMPAIGNS
// ============================================================================

export async function getCampaign(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAdvertiserCampaigns(advertiserId: number, limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(campaigns)
    .where(eq(campaigns.advertiserId, advertiserId))
    .orderBy(desc(campaigns.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function createCampaign(data: typeof campaigns.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(campaigns).values(data).returning();
  return result[0];
}

export async function updateCampaignStatus(campaignId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(campaigns).set({ status }).where(eq(campaigns.id, campaignId));
}

export async function getActiveCampaignsForCreators(limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(campaigns)
    .where(
      and(
        eq(campaigns.status, "active"),
        sql`${campaigns.castingMode} IN ('open_call', 'vyral_match')`
      )
    )
    .orderBy(desc(campaigns.createdAt))
    .limit(limit)
    .offset(offset);
}

// ============================================================================
// CAMPAIGN ROSTERS
// ============================================================================

export async function addCreatorToRoster(data: typeof campaignRosters.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(campaignRosters).values(data).returning();
  return result[0];
}

export async function getCampaignRoster(campaignId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(campaignRosters).where(eq(campaignRosters.campaignId, campaignId));
}

export async function getRosterEntry(rosterId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(campaignRosters).where(eq(campaignRosters.id, rosterId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateRosterStatus(rosterId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(campaignRosters).set({ status }).where(eq(campaignRosters.id, rosterId));
}

export async function getNoShowRosterEntries() {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({ roster: campaignRosters, campaign: campaigns })
    .from(campaignRosters)
    .innerJoin(campaigns, eq(campaignRosters.campaignId, campaigns.id))
    .where(and(eq(campaignRosters.status, "accepted"), lt(campaigns.deadline, new Date())));

  const rosterIds = result.map((r) => r.roster.id);
  if (rosterIds.length === 0) return [];

  const submissions = await (await getDb())!
    .select()
    .from(contentSubmissions)
    .where(inArray(contentSubmissions.rosterId, rosterIds));

  const submittedRosterIds = new Set(submissions.map((s) => s.rosterId));
  return result.filter((r) => !submittedRosterIds.has(r.roster.id));
}

// ============================================================================
// CONTENT SUBMISSIONS
// ============================================================================

export async function createContentSubmission(data: typeof contentSubmissions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(contentSubmissions).values(data).returning();
  return result[0];
}

export async function getContentSubmission(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(contentSubmissions).where(eq(contentSubmissions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getSubmissionByRoster(rosterId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(contentSubmissions).where(eq(contentSubmissions.rosterId, rosterId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateSubmissionStatus(
  submissionId: number,
  status: string,
  field: "draftStatus" | "livePostStatus"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(contentSubmissions).set({ [field]: status }).where(eq(contentSubmissions.id, submissionId));
}

export async function updateContentSubmissionLivePost(
  submissionId: number,
  livePostUrl: string,
  livePostScreenshot: string,
  status: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(contentSubmissions)
    .set({ livePostUrl, livePostScreenshot, livePostStatus: status, liveAt: new Date() })
    .where(eq(contentSubmissions.id, submissionId));
}

export async function updateContentSubmissionNotes(submissionId: number, notes: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(contentSubmissions)
    .set({
      advertiserNotes: notes,
      draftStatus: "revision_requested",
      revisionCount: sql`${contentSubmissions.revisionCount} + 1`,
    })
    .where(eq(contentSubmissions.id, submissionId));
}

export async function approveContentSubmission(submissionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(contentSubmissions)
    .set({ draftStatus: "approved", approvedAt: new Date() })
    .where(eq(contentSubmissions.id, submissionId));
}

export async function getPendingDraftsOlderThan(cutoffDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(contentSubmissions)
    .where(and(eq(contentSubmissions.draftStatus, "pending"), lt(contentSubmissions.submittedAt, cutoffDate)));
}

// ============================================================================
// POST MONITORING
// ============================================================================

export async function createPostMonitoring(data: typeof postMonitoring.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(postMonitoring).values(data).returning();
  return result[0];
}

export async function getPostMonitoring(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(postMonitoring).where(eq(postMonitoring.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPostMonitoringBySubmissionId(submissionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(postMonitoring).where(eq(postMonitoring.submissionId, submissionId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getActiveMonitoringJobs(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(postMonitoring).where(eq(postMonitoring.status, "active")).limit(limit);
}

export async function getMonitoringForCampaign(campaignId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(postMonitoring)
    .where(eq(postMonitoring.campaignId, campaignId))
    .orderBy(desc(postMonitoring.createdAt));
}

export async function updatePostMonitoringStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(postMonitoring).set({ status }).where(eq(postMonitoring.id, id));
}

export async function updatePostMonitoringNextCheck(id: number, nextCheckDate: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(postMonitoring)
    .set({ lastCheckDate: new Date(), nextCheckDate })
    .where(eq(postMonitoring.id, id));
}

// ============================================================================
// MONITORING CHECKS
// ============================================================================

export async function createMonitoringCheck(data: typeof monitoringChecks.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(monitoringChecks).values(data).returning();
  return result[0];
}

export async function getMonitoringChecks(monitoringId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(monitoringChecks).where(eq(monitoringChecks.monitoringId, monitoringId));
}

export async function getExpiredUnresolvedViolations() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(monitoringChecks)
    .where(
      and(
        eq(monitoringChecks.flagged, true),
        isNull(monitoringChecks.restoredAt),
        lt(monitoringChecks.gracePeriodEndsAt, new Date())
      )
    );
}

export async function markViolationResolved(checkId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(monitoringChecks).set({ restoredAt: new Date() }).where(eq(monitoringChecks.id, checkId));
}

// ============================================================================
// PAYMENTS & PAYOUTS
// ============================================================================

export async function createPayment(data: typeof payments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(payments).values(data).returning();
  return result[0];
}

export async function getPayment(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPaymentByCampaignId(campaignId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(payments).where(eq(payments.campaignId, campaignId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createPayout(data: typeof payouts.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(payouts).values(data).returning();
  return result[0];
}

export async function getPayout(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(payouts).where(eq(payouts.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPayoutByRosterId(rosterId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(payouts).where(eq(payouts.rosterId, rosterId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCreatorPayouts(creatorId: number, limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(payouts)
    .where(eq(payouts.creatorId, creatorId))
    .orderBy(desc(payouts.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function updatePayoutStatus(payoutId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(payouts).set({ status }).where(eq(payouts.id, payoutId));
}

// ============================================================================
// VYRAL MATCH SCORES
// ============================================================================

export async function createVyralMatchScore(data: typeof vyralMatchScores.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(vyralMatchScores).values(data).returning();
  return result[0];
}

export async function getVyralMatchScores(campaignId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(vyralMatchScores)
    .where(eq(vyralMatchScores.campaignId, campaignId))
    .orderBy(desc(vyralMatchScores.totalScore))
    .limit(limit);
}

// ============================================================================
// CREATOR SUBSCRIPTIONS
// ============================================================================

export async function getCreatorSubscription(creatorId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(creatorSubscriptions).where(eq(creatorSubscriptions.creatorId, creatorId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCreatorSubscription(data: typeof creatorSubscriptions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(creatorSubscriptions).values(data).returning();
  return result[0];
}

// ============================================================================
// BACKGROUND JOBS
// ============================================================================

export async function createBackgroundJob(data: typeof backgroundJobs.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(backgroundJobs).values(data).returning();
  return result[0];
}

export async function getPendingJobs(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(backgroundJobs)
    .where(eq(backgroundJobs.status, "pending"))
    .orderBy(asc(backgroundJobs.scheduledFor))
    .limit(limit);
}

export async function updateJobStatus(jobId: number, status: string, result?: any, error?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: any = { status };
  if (result !== undefined) updateData.result = result;
  if (error) updateData.error = error;
  if (status === "completed") updateData.completedAt = new Date();
  if (status === "processing") updateData.startedAt = new Date();
  await db.update(backgroundJobs).set(updateData).where(eq(backgroundJobs.id, jobId));
}

// ============================================================================
// ADMIN
// ============================================================================

export async function createAdminLog(data: typeof adminLogs.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(adminLogs).values(data).returning();
  return result[0];
}

export async function getAdminStats() {
  const db = await getDb();
  if (!db) return { totalUsers: 0, activeCampaigns: 0, platformRevenue: 0, openDisputes: 0 };

  const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const [activeCampaignCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(campaigns)
    .where(eq(campaigns.status, "active"));
  const [revenueResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${payments.platformFee}), 0)` })
    .from(payments)
    .where(eq(payments.status, "completed"));
  const [openDisputeCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(disputes)
    .where(eq(disputes.status, "open"));

  return {
    totalUsers: Number(userCount?.count ?? 0),
    activeCampaigns: Number(activeCampaignCount?.count ?? 0),
    platformRevenue: Number(revenueResult?.total ?? 0),
    openDisputes: Number(openDisputeCount?.count ?? 0),
  };
}

export async function getDisputesList(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(disputes).orderBy(desc(disputes.createdAt)).limit(limit).offset(offset);
}

export async function updateCreatorVerificationStatus(creatorId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(creatorProfiles).set({ verificationStatus: status }).where(eq(creatorProfiles.id, creatorId));
}

// ============================================================================
// CAMPAIGN ANALYTICS
// ============================================================================

export async function getCampaignAnalytics(campaignId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(campaignAnalytics).where(eq(campaignAnalytics.campaignId, campaignId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCampaignAnalytics(data: typeof campaignAnalytics.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(campaignAnalytics).values(data).returning();
  return result[0];
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export async function createNotification(data: typeof notifications.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notifications).values(data).returning();
  return result[0];
}

export async function getUserNotifications(userId: number, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markNotificationRead(notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, notificationId));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}
