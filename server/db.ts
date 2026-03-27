import { eq, and, gte, lte, desc, asc, inArray, like, isNull, lt, sql, or, not } from "drizzle-orm";
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
  portfolioItems,
  conversations,
  messages,
  platformSettings,
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

export async function getAllUsers(opts: { limit?: number; offset?: number; role?: string; search?: string } = {}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts.role) conditions.push(eq(users.role, opts.role));
  if (opts.search) conditions.push(
    or(like(users.name, `%${opts.search}%`), like(users.email, `%${opts.search}%`))
  );
  return db.select().from(users)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(opts.limit ?? 50)
    .offset(opts.offset ?? 0);
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

export async function getPublicAdvertiserProfile(userId: number) {
  // userId here is users.id (same as campaigns.advertiserId)
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(advertiserProfiles).where(eq(advertiserProfiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getActiveCampaignsByAdvertiser(userId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(campaigns)
    .where(and(eq(campaigns.advertiserId, userId), eq(campaigns.status, "active")))
    .orderBy(desc(campaigns.createdAt))
    .limit(limit);
}

export async function createAdvertiserProfile(data: typeof advertiserProfiles.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(advertiserProfiles).values(data).returning();
  return result[0];
}

export async function updateAdvertiserProfile(userId: number, data: Partial<typeof advertiserProfiles.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(advertiserProfiles).set({ ...data, updatedAt: new Date() } as any).where(eq(advertiserProfiles.userId, userId)).returning();
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

export async function updateCreatorProfile(userId: number, data: Partial<typeof creatorProfiles.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(creatorProfiles).set({ ...data, updatedAt: new Date() } as any).where(eq(creatorProfiles.userId, userId)).returning();
  return result[0];
}

export async function searchCreators(filters: {
  niche?: string;
  minFollowers?: number;
  maxFollowers?: number;
  minEngagement?: number | string;
  tier?: string;
  platform?: string;
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

  if (filters.platform) {
    const platformCreatorIds = await db
      .select({ creatorId: socialMediaAccounts.creatorId })
      .from(socialMediaAccounts)
      .where(eq(socialMediaAccounts.platform, filters.platform));
    const ids = platformCreatorIds.map((r) => r.creatorId);
    if (ids.length === 0) return [];
    conditions.push(inArray(creatorProfiles.id, ids));
  }

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

export async function updateCampaign(campaignId: number, data: Partial<typeof campaigns.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(campaigns).set({ ...data, updatedAt: new Date() } as any).where(eq(campaigns.id, campaignId)).returning();
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

export async function acceptRosterEntry(rosterId: number, creatorFee: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(campaignRosters)
    .set({ status: "accepted", creatorFee, acceptedAt: new Date() })
    .where(eq(campaignRosters.id, rosterId));
}

export async function getCreatorSubmissionsForRoster(rosterId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contentSubmissions).where(eq(contentSubmissions.rosterId, rosterId));
}

export async function updateContentSubmissionDraft(submissionId: number, draftUrl: string, thumbnailUrl?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(contentSubmissions)
    .set({ draftUrl, draftThumbnailUrl: thumbnailUrl ?? null, draftStatus: "pending", submittedAt: new Date() })
    .where(eq(contentSubmissions.id, submissionId));
}

export async function getCreatorRosterEntries(creatorProfileId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ id: campaignRosters.id, status: campaignRosters.status, creatorFee: campaignRosters.creatorFee,
      campaignId: campaignRosters.campaignId,
      campaign: { id: campaigns.id, title: campaigns.title, deadline: campaigns.deadline, advertiserId: campaigns.advertiserId } })
    .from(campaignRosters)
    .innerJoin(campaigns, eq(campaignRosters.campaignId, campaigns.id))
    .where(eq(campaignRosters.creatorId, creatorProfileId))
    .orderBy(campaignRosters.createdAt);
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

export async function updatePayoutTransferRef(payoutId: number, ref: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(payouts).set({ stripeTransferId: ref }).where(eq(payouts.id, payoutId));
}

export async function getPaymentByRef(ref: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(payments).where(eq(payments.stripePaymentIntentId, ref)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updatePaymentStatus(paymentId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(payments).set({ status }).where(eq(payments.id, paymentId));
}

/** Store creator bank details as JSON in the stripeConnectId column */
export async function updateCreatorBankDetails(
  userId: number,
  bankDetails: { bankCode: string; accountNumber: string; accountName: string }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(creatorProfiles)
    .set({ stripeConnectId: JSON.stringify(bankDetails) })
    .where(eq(creatorProfiles.userId, userId));
}

export async function getCreatorBankDetails(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [profile] = await db
    .select({ stripeConnectId: creatorProfiles.stripeConnectId })
    .from(creatorProfiles)
    .where(eq(creatorProfiles.userId, userId))
    .limit(1);
  if (!profile?.stripeConnectId) return null;
  try { return JSON.parse(profile.stripeConnectId) as { bankCode: string; accountNumber: string; accountName: string }; }
  catch { return null; }
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
  // Prefer active subscription; if none, return the most recent one
  const active = await db.select().from(creatorSubscriptions)
    .where(and(eq(creatorSubscriptions.creatorId, creatorId), eq(creatorSubscriptions.status, "active")))
    .limit(1);
  if (active.length > 0) return active[0];
  const result = await db.select().from(creatorSubscriptions)
    .where(eq(creatorSubscriptions.creatorId, creatorId))
    .orderBy(desc(creatorSubscriptions.createdAt))
    .limit(1);
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

export async function updateCreatorVerificationStatus(creatorId: number, status: string, rejectionReason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(creatorProfiles)
    .set({ verificationStatus: status, ...(rejectionReason !== undefined ? { verificationRejectionReason: rejectionReason } : {}) })
    .where(eq(creatorProfiles.id, creatorId));
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

// ============================================================================
// SOCIAL ACCOUNTS
// ============================================================================

export async function getSocialAccountsByCreator(creatorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(socialMediaAccounts).where(eq(socialMediaAccounts.creatorId, creatorId));
}

export async function upsertSocialAccount(data: {
  creatorId: number;
  platform: string;
  username: string;
  followers: number;
  engagementRate: number;
  profileUrl?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db
    .select()
    .from(socialMediaAccounts)
    .where(and(eq(socialMediaAccounts.creatorId, data.creatorId), eq(socialMediaAccounts.platform, data.platform)))
    .limit(1);
  if (existing.length > 0) {
    return db
      .update(socialMediaAccounts)
      .set({ username: data.username, followers: data.followers, engagementRate: String(data.engagementRate), profileUrl: data.profileUrl })
      .where(eq(socialMediaAccounts.id, existing[0].id))
      .returning();
  } else {
    return db
      .insert(socialMediaAccounts)
      .values({ ...data, engagementRate: String(data.engagementRate) })
      .returning();
  }
}

export async function deleteSocialAccount(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(socialMediaAccounts).where(eq(socialMediaAccounts.id, id));
}

// ============================================================================
// PORTFOLIO ITEMS
// ============================================================================

export async function getPortfolioItems(creatorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(portfolioItems).where(eq(portfolioItems.creatorId, creatorId)).orderBy(desc(portfolioItems.createdAt));
}

export async function addPortfolioItem(data: typeof portfolioItems.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(portfolioItems).values(data).returning();
  return result[0];
}

export async function deletePortfolioItem(id: number, creatorId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(portfolioItems).where(and(eq(portfolioItems.id, id), eq(portfolioItems.creatorId, creatorId)));
}

// ============================================================================
// CONVERSATIONS & MESSAGES
// ============================================================================

export async function getOrCreateConversation(campaignId: number, advertiserId: number, creatorId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(conversations)
    .where(and(eq(conversations.campaignId, campaignId), eq(conversations.creatorId, creatorId)))
    .limit(1);
  if (existing.length > 0) return existing[0];
  const result = await db.insert(conversations).values({ campaignId, advertiserId, creatorId }).returning();
  return result[0];
}

export async function getConversationsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const convs = await db.select().from(conversations)
    .where(or(eq(conversations.advertiserId, userId), eq(conversations.creatorId, userId)))
    .orderBy(desc(conversations.lastMessageAt));

  if (convs.length === 0) return [];

  const campaignIds = Array.from(new Set(convs.map((c) => c.campaignId)));
  const advertiserUserIds = Array.from(new Set(convs.map((c) => c.advertiserId)));
  const creatorUserIds = Array.from(new Set(convs.map((c) => c.creatorId)));
  const convIds = convs.map((c) => c.id);

  const [camps, advProfiles, crProfiles, unreadRows] = await Promise.all([
    db.select({ id: campaigns.id, title: campaigns.title }).from(campaigns).where(inArray(campaigns.id, campaignIds)),
    db.select({ userId: advertiserProfiles.userId, companyName: advertiserProfiles.companyName }).from(advertiserProfiles).where(inArray(advertiserProfiles.userId, advertiserUserIds)),
    db.select({ userId: creatorProfiles.userId, displayName: creatorProfiles.displayName }).from(creatorProfiles).where(inArray(creatorProfiles.userId, creatorUserIds)),
    db.select({ conversationId: messages.conversationId, count: sql<number>`count(*)` })
      .from(messages)
      .where(and(inArray(messages.conversationId, convIds), eq(messages.isRead, false), not(eq(messages.senderId, userId))))
      .groupBy(messages.conversationId),
  ]);

  const campMap = Object.fromEntries(camps.map((c) => [c.id, c.title]));
  const advMap = Object.fromEntries(advProfiles.map((a) => [a.userId, a.companyName]));
  const crMap = Object.fromEntries(crProfiles.map((c) => [c.userId, c.displayName]));
  const unreadMap = Object.fromEntries(unreadRows.map((r) => [r.conversationId, Number(r.count)]));

  return convs.map((conv) => ({
    ...conv,
    campaignTitle: campMap[conv.campaignId] ?? `Campaign #${conv.campaignId}`,
    advertiserName: advMap[conv.advertiserId] ?? `Brand #${conv.advertiserId}`,
    creatorName: crMap[conv.creatorId] ?? `Creator #${conv.creatorId}`,
    unreadCount: unreadMap[conv.id] ?? 0,
  }));
}

export async function getConversation(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getMessages(conversationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
}

export async function sendMessage(conversationId: number, senderId: number, content: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [msg] = await db.insert(messages).values({ conversationId, senderId, content }).returning();
  await db.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.id, conversationId));
  return msg;
}

export async function markConversationRead(conversationId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(messages)
    .set({ isRead: true })
    .where(and(eq(messages.conversationId, conversationId), not(eq(messages.senderId, userId))));
}

export async function getUnreadMessageCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  // Get conversations for this user
  const convs = await db.select({ id: conversations.id })
    .from(conversations)
    .where(or(eq(conversations.advertiserId, userId), eq(conversations.creatorId, userId)));
  if (convs.length === 0) return 0;
  const [result] = await db.select({ count: sql<number>`count(*)` })
    .from(messages)
    .where(and(
      inArray(messages.conversationId, convs.map(c => c.id)),
      eq(messages.isRead, false),
      not(eq(messages.senderId, userId))
    ));
  return Number(result?.count ?? 0);
}

// ============================================================================
// ADMIN (ADDITIONAL)
// ============================================================================

export async function getPendingCreators(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const creators = await db.select().from(creatorProfiles)
    .where(eq(creatorProfiles.verificationStatus, "pending"))
    .orderBy(desc(creatorProfiles.createdAt))
    .limit(limit);
  if (creators.length === 0) return [];
  const ids = creators.map((c) => c.id);
  const socials = await db.select().from(socialMediaAccounts).where(inArray(socialMediaAccounts.creatorId, ids));
  return creators.map((c) => ({
    ...c,
    socialAccounts: socials.filter((s) => s.creatorId === c.id),
  }));
}

export async function getPublicCreatorProfile(creatorProfileId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [profile] = await db.select().from(creatorProfiles).where(eq(creatorProfiles.id, creatorProfileId)).limit(1);
  if (!profile) return undefined;
  const socials = await db.select().from(socialMediaAccounts).where(eq(socialMediaAccounts.creatorId, creatorProfileId));
  const portfolio = await db.select().from(portfolioItems).where(eq(portfolioItems.creatorId, creatorProfileId));
  const [userRow] = await db.select({ name: users.name }).from(users).where(eq(users.id, profile.userId)).limit(1);
  return { ...profile, socialAccounts: socials, portfolioItems: portfolio, userName: userRow?.name ?? null };
}

export async function getContentSubmissionsForCampaign(campaignId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contentSubmissions)
    .where(eq(contentSubmissions.campaignId, campaignId))
    .orderBy(desc(contentSubmissions.submittedAt));
}

export async function resolveDispute(disputeId: number, resolution: string, status: string, resolvedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(disputes)
    .set({ resolution, status, resolvedBy, updatedAt: new Date() } as any)
    .where(eq(disputes.id, disputeId))
    .returning();
  return result[0];
}

export async function updateSocialAccountVerification(accountId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(socialMediaAccounts).set({ verificationStatus: status }).where(eq(socialMediaAccounts.id, accountId));
}

// ============================================================================
// CAMPAIGN ANALYTICS (UPSERT)
// ============================================================================

// ============================================================================
// VYRAL MATCH (additional)
// ============================================================================

export async function getVyralMatchScoreById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(vyralMatchScores).where(eq(vyralMatchScores.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// PAYOUT RELEASE
// ============================================================================

export async function getReleasedPendingPayouts(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payouts)
    .where(and(eq(payouts.status, "pending"), lte(payouts.releaseDate, new Date())))
    .orderBy(asc(payouts.releaseDate))
    .limit(limit);
}

export async function getPayoutWithCreatorDetails(payoutId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [payout] = await db.select().from(payouts).where(eq(payouts.id, payoutId)).limit(1);
  if (!payout) return undefined;
  const [profile] = await db.select().from(creatorProfiles).where(eq(creatorProfiles.id, payout.creatorId)).limit(1);
  if (!profile?.stripeConnectId) return undefined;
  const [roster] = await db.select({ campaignId: campaignRosters.campaignId }).from(campaignRosters).where(eq(campaignRosters.id, payout.rosterId)).limit(1);
  try {
    const bank = JSON.parse(profile.stripeConnectId) as { bankCode: string; accountNumber: string; accountName: string };
    return { payout, bank, campaignId: roster?.campaignId ?? 0 };
  } catch { return undefined; }
}

// ============================================================================
// PRO GATING COUNTS
// ============================================================================

export async function getCreatorActiveApplicationCount(creatorProfileId: number) {
  const db = await getDb();
  if (!db) return 0;
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(campaignRosters)
    .where(and(
      eq(campaignRosters.creatorId, creatorProfileId),
      inArray(campaignRosters.status, ["applied", "invited", "accepted"]),
    ));
  return Number(result?.count ?? 0);
}

export async function getAdvertiserActiveCampaignCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(campaigns)
    .where(and(eq(campaigns.advertiserId, userId), inArray(campaigns.status, ["draft", "active"])));
  return Number(result?.count ?? 0);
}

export async function getCreatorPortfolioCount(creatorProfileId: number) {
  const db = await getDb();
  if (!db) return 0;
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(portfolioItems)
    .where(eq(portfolioItems.creatorId, creatorProfileId));
  return Number(result?.count ?? 0);
}

// ============================================================================
// DISPUTES
// ============================================================================

export async function createDispute(data: typeof disputes.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(disputes).values(data).returning();
  return result[0];
}

// ============================================================================
// ADMIN LOGS
// ============================================================================

export async function getRecentAdminLogs(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(adminLogs).orderBy(desc(adminLogs.createdAt)).limit(limit);
}

export async function getFlaggedContentForAdmin(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      checkId: monitoringChecks.id,
      monitoringId: monitoringChecks.monitoringId,
      flaggedReason: monitoringChecks.flaggedReason,
      violations: monitoringChecks.violations,
      checkDate: monitoringChecks.checkDate,
      gracePeriodEndsAt: monitoringChecks.gracePeriodEndsAt,
      restoredAt: monitoringChecks.restoredAt,
      campaignId: postMonitoring.campaignId,
      postUrl: postMonitoring.postUrl,
      creatorId: postMonitoring.creatorId,
      monitoringStatus: postMonitoring.status,
    })
    .from(monitoringChecks)
    .innerJoin(postMonitoring, eq(monitoringChecks.monitoringId, postMonitoring.id))
    .where(eq(monitoringChecks.flagged, true))
    .orderBy(desc(monitoringChecks.checkDate))
    .limit(limit);
}

export async function getPendingProSubscriptionByAdvertiserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  // Find the creator profile for this userId, then find their pending pro subscription
  const [profile] = await db.select().from(creatorProfiles).where(eq(creatorProfiles.userId, userId)).limit(1);
  if (!profile) return undefined;
  const result = await db.select().from(creatorSubscriptions)
    .where(and(eq(creatorSubscriptions.creatorId, profile.id), eq(creatorSubscriptions.status, "pending_payment")))
    .orderBy(desc(creatorSubscriptions.createdAt))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function activateProSubscription(subscriptionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(creatorSubscriptions).set({ status: "active" }).where(eq(creatorSubscriptions.id, subscriptionId));
}

export async function setCreatorPro(userId: number, isPro: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(creatorProfiles)
    .set({ isPro, proExpiresAt: isPro ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null } as any)
    .where(eq(creatorProfiles.userId, userId));
}

export async function setCreatorNinVerified(userId: number, nin: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(creatorProfiles)
    .set({ ninVerified: true, ninNumber: nin } as any)
    .where(eq(creatorProfiles.userId, userId));
}

export async function upsertCampaignAnalytics(campaignId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const campaign = await getCampaign(campaignId);
  if (!campaign) throw new Error("Campaign not found");

  const roster = await getCampaignRoster(campaignId);
  const totalCreators = roster.length;
  const acceptedCreators = roster.filter((r) => r.status === "accepted" || r.status === "completed").length;
  const completedCreators = roster.filter((r) => r.status === "completed").length;

  const payoutRows = await db
    .select()
    .from(payouts)
    .where(
      and(
        inArray(
          payouts.rosterId,
          roster.map((r) => r.id)
        ),
        eq(payouts.status, "completed")
      )
    );
  const totalSpent = payoutRows.reduce((sum, p) => sum + Number(p.amount), 0);

  const existing = await db
    .select()
    .from(campaignAnalytics)
    .where(eq(campaignAnalytics.campaignId, campaignId))
    .limit(1);

  if (existing.length > 0) {
    const result = await db
      .update(campaignAnalytics)
      .set({
        totalCreators,
        acceptedCreators,
        completedCreators,
        totalBudget: String(campaign.budget),
        totalSpent: String(totalSpent),
        updatedAt: new Date(),
      })
      .where(eq(campaignAnalytics.campaignId, campaignId))
      .returning();
    return result[0];
  } else {
    const result = await db
      .insert(campaignAnalytics)
      .values({
        campaignId,
        totalCreators,
        acceptedCreators,
        completedCreators,
        totalBudget: String(campaign.budget),
        totalSpent: String(totalSpent),
        totalEngagement: 0,
        averageEngagementRate: "0",
        totalReach: 0,
      })
      .returning();
    return result[0];
  }
}

// ============================================================================
// PLATFORM SETTINGS
// ============================================================================

const SETTING_DEFAULTS: Record<string, string> = {
  platform_fee_pct:      "5",      // percentage taken on each campaign payment
  pro_price:             "1200",   // ₦ per month for Pro subscription
  maintenance_mode:      "false",  // "true" | "false"
  auto_approval_days:    "7",      // days before content is auto-approved
};

export async function getPlatformSetting(key: string): Promise<string> {
  const db = await getDb();
  const fallback = SETTING_DEFAULTS[key] ?? "";
  if (!db) return fallback;
  try {
    const rows = await db.select().from(platformSettings).where(eq(platformSettings.key, key)).limit(1);
    return rows.length > 0 ? rows[0].value : fallback;
  } catch {
    return fallback;
  }
}

export async function getAllPlatformSettings(): Promise<Record<string, string>> {
  const db = await getDb();
  const result = { ...SETTING_DEFAULTS };
  if (!db) return result;
  try {
    const rows = await db.select().from(platformSettings);
    for (const row of rows) result[row.key] = row.value;
  } catch { /* table may not exist yet — return defaults */ }
  return result;
}

export async function setPlatformSetting(key: string, value: string, adminId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(platformSettings)
    .values({ key, value, updatedBy: adminId, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: { value, updatedBy: adminId, updatedAt: new Date() },
    });
}
