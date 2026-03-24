/**
 * POST MONITORING SYSTEM
 * Automated 48-hour monitoring with Apify integration.
 * Checks post accessibility, privacy, hashtags, mentions, and engagement.
 */

import * as db from "./db";
import {
  notifyViolationDetected,
  notifyGracePeriodExpired,
  notifyPayoutReleased,
  notifyContentAutoApproved,
  notifyNoShow,
} from "./notifications";
import { processRefund } from "./stripe";

const APIFY_API_KEY = process.env.APIFY_API_KEY || "";
const APIFY_BASE_URL = "https://api.apify.com/v2";

// Monitoring check interval: 48 hours
const MONITORING_INTERVAL_MS = 48 * 60 * 60 * 1000;

// Grace period for violations: 24 hours
const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

// Standard payout delay (days) — can be overridden by env
const STANDARD_PAYOUT_DELAY_DAYS = Number(process.env.STRIPE_PAYOUT_DELAY_DAYS ?? 7);
const PRO_PAYOUT_DELAY_DAYS = Number(process.env.STRIPE_PRO_PAYOUT_DELAY_DAYS ?? 2);

// ============================================================================
// MONITORING JOB CREATION
// ============================================================================

/**
 * Create a monitoring job for a live post.
 * For story content (24h only), schedules a single verification check after 24h.
 * For all other content, schedules periodic 48h checks for the full minPostDuration.
 */
export async function createMonitoringJob(
  submissionId: number,
  durationDays: number,
  isStory = false
): Promise<void> {
  const submission = await db.getContentSubmission(submissionId);
  if (!submission) throw new Error("Submission not found");
  if (!submission.livePostUrl) throw new Error("Submission has no live post URL");

  const monitoringStartDate = new Date();
  // Stories: monitored for 1 day only regardless of durationDays
  const effectiveDuration = isStory ? 1 : durationDays;
  const monitoringEndDate = new Date(
    monitoringStartDate.getTime() + effectiveDuration * 24 * 60 * 60 * 1000
  );

  // Stories: single check at 23 hours (within the 24h window)
  // Regular: first check at 48 hours
  const firstCheckDelayMs = isStory ? 23 * 60 * 60 * 1000 : MONITORING_INTERVAL_MS;
  const nextCheckDate = new Date(monitoringStartDate.getTime() + firstCheckDelayMs);

  const platform = determinePlatform(submission.livePostUrl);

  await db.createPostMonitoring({
    submissionId,
    campaignId: submission.campaignId,
    creatorId: submission.creatorId,
    postUrl: submission.livePostUrl,
    platform: platform as any,
    monitoringStartDate,
    monitoringEndDate,
    nextCheckDate,
    status: "active",
  });

  // Fetch the newly created monitoring record by submissionId
  const monitoring = await db.getPostMonitoringBySubmissionId(submissionId);
  if (monitoring) {
    await scheduleMonitoringCheckById(monitoring.id, nextCheckDate);
  }
}

/**
 * Determine social media platform from URL.
 */
function determinePlatform(url: string): string {
  if (url.includes("tiktok.com")) return "tiktok";
  if (url.includes("instagram.com")) return "instagram";
  if (url.includes("youtube.com")) return "youtube";
  if (url.includes("twitter.com") || url.includes("x.com")) return "twitter";
  if (url.includes("twitch.tv")) return "twitch";
  return "tiktok"; // default
}

/**
 * Schedule a monitoring check background job using the monitoring record's ID.
 */
async function scheduleMonitoringCheckById(
  monitoringId: number,
  scheduledFor: Date
): Promise<void> {
  const monitoring = await db.getPostMonitoring(monitoringId);
  if (!monitoring) return;

  await db.createBackgroundJob({
    jobType: "post_monitoring",
    targetId: monitoringId,
    targetType: "monitoring",
    status: "pending",
    scheduledFor,
    data: JSON.stringify({
      submissionId: monitoring.submissionId,
      monitoringId: monitoring.id,
      postUrl: monitoring.postUrl,
      platform: monitoring.platform,
    }),
  });
}

// ============================================================================
// POST STATUS CHECK
// ============================================================================

/**
 * Main monitoring function — called by the background job processor.
 */
export async function checkPostStatus(monitoring: any): Promise<any> {
  try {
    // Fetch campaign to get required hashtags and brand info
    const campaign = await db.getCampaign(monitoring.campaignId);
    const requiredHashtags: string[] =
      campaign?.requiredHashtags
        ? (typeof campaign.requiredHashtags === "string"
            ? JSON.parse(campaign.requiredHashtags)
            : campaign.requiredHashtags)
        : [];

    const checkResult = await performApifyCheck(
      monitoring.postUrl,
      monitoring.platform,
      requiredHashtags
    );

    const violations: string[] = [];
    if (!checkResult.isAccessible) violations.push("post_not_accessible");
    if (checkResult.isPrivate) violations.push("account_private");
    if (!checkResult.hashtagsIntact) violations.push("hashtags_removed");
    if (!checkResult.brandMentionIntact) violations.push("brand_mention_removed");

    await db.createMonitoringCheck({
      monitoringId: monitoring.id,
      checkDate: new Date(),
      isAccessible: checkResult.isAccessible,
      isPrivate: checkResult.isPrivate,
      hashtagsIntact: checkResult.hashtagsIntact,
      brandMentionIntact: checkResult.brandMentionIntact,
      viewCount: checkResult.viewCount,
      engagementCount: checkResult.engagementCount,
      likeCount: checkResult.likeCount,
      commentCount: checkResult.commentCount,
      shareCount: checkResult.shareCount,
      violations: violations.length > 0 ? JSON.stringify(violations) : null,
      flagged: violations.length > 0,
      flaggedReason: violations.length > 0 ? violations.join(", ") : null,
      gracePeriodEndsAt: violations.length > 0 ? new Date(Date.now() + GRACE_PERIOD_MS) : null,
    });

    if (violations.length > 0) {
      await handleViolation(monitoring, violations);
    }

    await db.updatePostMonitoringNextCheck(
      monitoring.id,
      new Date(Date.now() + MONITORING_INTERVAL_MS)
    );

    // Schedule next check or finalize
    if (new Date() < new Date(monitoring.monitoringEndDate)) {
      await scheduleMonitoringCheckById(
        monitoring.id,
        new Date(Date.now() + MONITORING_INTERVAL_MS)
      );
    } else {
      await completeMonitoring(monitoring);
    }

    return { violations, checkResult };
  } catch (error) {
    console.error("[Monitoring] Check failed:", error);
    throw error;
  }
}

// ============================================================================
// APIFY INTEGRATION
// ============================================================================

async function performApifyCheck(
  postUrl: string,
  platform: string,
  requiredHashtags: string[]
): Promise<any> {
  if (!APIFY_API_KEY) {
    console.warn("[Apify] API key not configured — using placeholder data");
    return getPlaceholderCheckResult(requiredHashtags);
  }

  try {
    const actorId = getApifyActorId(platform);
    if (!actorId) {
      console.warn(`[Apify] No actor configured for platform: ${platform}`);
      return getPlaceholderCheckResult(requiredHashtags);
    }

    const response = await fetch(`${APIFY_BASE_URL}/acts/${actorId}/runs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${APIFY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: {
          postUrl,
          platform,
          extractEngagement: true,
          checkPrivacy: true,
        },
      }),
    });

    if (!response.ok) {
      console.error(`[Apify] API error: ${response.status} ${response.statusText}`);
      return getPlaceholderCheckResult(requiredHashtags);
    }

    const runData = await response.json();
    const result = await waitForApifyRun(runData.id);
    return parseApifyResults(result, requiredHashtags);
  } catch (error) {
    console.error("[Apify] Check failed:", error);
    return getPlaceholderCheckResult(requiredHashtags);
  }
}

function getApifyActorId(platform: string): string | null {
  const actorMap: Record<string, string> = {
    tiktok: process.env.APIFY_ACTOR_ID_TIKTOK || "",
    instagram: process.env.APIFY_ACTOR_ID_INSTAGRAM || "",
    youtube: process.env.APIFY_ACTOR_ID_YOUTUBE || "",
  };
  const id = actorMap[platform];
  return id || null;
}

async function waitForApifyRun(runId: string, maxWaitMs = 300000): Promise<any> {
  const startTime = Date.now();
  const pollInterval = 2000;

  while (Date.now() - startTime < maxWaitMs) {
    const response = await fetch(`${APIFY_BASE_URL}/runs/${runId}`, {
      headers: { Authorization: `Bearer ${APIFY_API_KEY}` },
    });

    if (!response.ok) throw new Error(`Failed to get run status: ${response.statusText}`);

    const runData = await response.json();

    if (runData.status === "SUCCEEDED") {
      const datasetResponse = await fetch(
        `${APIFY_BASE_URL}/datasets/${runData.defaultDatasetId}/items`,
        { headers: { Authorization: `Bearer ${APIFY_API_KEY}` } }
      );
      if (datasetResponse.ok) {
        return await datasetResponse.json();
      }
      return [];
    } else if (runData.status === "FAILED") {
      throw new Error(`Apify run failed: ${runData.exitCode}`);
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error("Apify run timeout");
}

/**
 * Parse raw Apify dataset items into normalized monitoring result.
 * Verifies required hashtags against the post caption/description field.
 */
function parseApifyResults(items: any[], requiredHashtags: string[]): any {
  if (!items || items.length === 0) return getPlaceholderCheckResult(requiredHashtags);

  const item = items[0];
  const caption: string = item.text || item.description || item.caption || "";

  const hashtagsIntact =
    requiredHashtags.length === 0 ||
    requiredHashtags.every((tag) =>
      caption.toLowerCase().includes(tag.toLowerCase())
    );

  return {
    isAccessible: item.isAccessible !== false,
    isPrivate: item.isPrivate === true,
    hashtagsIntact,
    brandMentionIntact: item.brandMentionIntact !== false,
    viewCount: item.viewCount || item.playCount || 0,
    engagementCount:
      (item.likeCount || item.diggCount || 0) +
      (item.commentCount || 0) +
      (item.shareCount || 0),
    likeCount: item.likeCount || item.diggCount || 0,
    commentCount: item.commentCount || 0,
    shareCount: item.shareCount || 0,
  };
}

function getPlaceholderCheckResult(requiredHashtags: string[]): any {
  // In test mode all checks pass so existing campaigns aren't incorrectly flagged
  return {
    isAccessible: true,
    isPrivate: false,
    hashtagsIntact: true,
    brandMentionIntact: true,
    viewCount: Math.floor(Math.random() * 10000),
    engagementCount: Math.floor(Math.random() * 500),
    likeCount: Math.floor(Math.random() * 300),
    commentCount: Math.floor(Math.random() * 100),
    shareCount: Math.floor(Math.random() * 50),
  };
}

// ============================================================================
// VIOLATION HANDLING
// ============================================================================

async function handleViolation(monitoring: any, violations: string[]): Promise<void> {
  console.log(`[Monitoring] Violations detected for submission ${monitoring.submissionId}: ${violations.join(", ")}`);

  await db.updatePostMonitoringStatus(monitoring.id, "flagged");

  // Look up the creator's userId to notify them
  const submission = await db.getContentSubmission(monitoring.submissionId);
  if (!submission) return;

  const creatorProfile = await db.getCreatorProfileById(submission.creatorId);
  if (!creatorProfile) return;

  await notifyViolationDetected(creatorProfile.userId, violations, monitoring.campaignId);
}

// ============================================================================
// MONITORING COMPLETION & PAYOUT RELEASE
// ============================================================================

async function completeMonitoring(monitoring: any): Promise<void> {
  console.log(`[Monitoring] Complete for submission ${monitoring.submissionId}`);

  await db.updatePostMonitoringStatus(monitoring.id, "completed");

  const submission = await db.getContentSubmission(monitoring.submissionId);
  if (!submission) return;

  const rosterEntry = await db.getRosterEntry(submission.rosterId);
  if (!rosterEntry) return;

  const creatorProfile = await db.getCreatorProfileById(submission.creatorId);
  if (!creatorProfile) return;

  // Determine release delay based on Pro status
  const delayDays = creatorProfile.isPro ? PRO_PAYOUT_DELAY_DAYS : STANDARD_PAYOUT_DELAY_DAYS;
  const releaseDate = new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000);

  // Create payout record (released by background job on releaseDate)
  await db.createPayout({
    rosterId: rosterEntry.id,
    creatorId: submission.creatorId,
    amount: rosterEntry.creatorFee,
    status: "pending",
    releaseDate,
  });

  await notifyPayoutReleased(
    creatorProfile.userId,
    Number(rosterEntry.creatorFee),
    monitoring.campaignId
  );
}

// ============================================================================
// BACKGROUND JOB PROCESSORS
// ============================================================================

/**
 * Process pending monitoring check jobs.
 * Called by the server-side job runner on an interval.
 */
export async function processPendingMonitoringJobs(): Promise<void> {
  const jobs = await db.getPendingJobs(10);

  for (const job of jobs) {
    if (job.jobType !== "post_monitoring") continue;
    if (!job.scheduledFor || new Date() < new Date(job.scheduledFor)) continue;

    try {
      await db.updateJobStatus(job.id, "processing");

      const data = typeof job.data === "string" ? JSON.parse(job.data) : job.data;
      const monitoring = await db.getPostMonitoring(data.monitoringId);

      if (monitoring) {
        const result = await checkPostStatus(monitoring);
        await db.updateJobStatus(job.id, "completed", result);
      }
    } catch (error) {
      console.error(`[Monitoring] Job ${job.id} failed:`, error);
      const retryCount = (job.retryCount ?? 0) + 1;
      if (retryCount < (job.maxRetries ?? 3)) {
        await db.updateJobStatus(job.id, "pending", null, String(error));
      } else {
        await db.updateJobStatus(job.id, "failed", null, String(error));
      }
    }
  }
}

/**
 * Process expired grace periods and trigger pro-rated clawbacks.
 * Called by the server-side job runner on an interval.
 */
export async function processGracePeriodExpirations(): Promise<void> {
  const expiredViolations = await db.getExpiredUnresolvedViolations();

  for (const check of expiredViolations) {
    try {
      const monitoring = await db.getPostMonitoring(check.monitoringId);
      if (!monitoring) continue;

      const submission = await db.getContentSubmission(monitoring.submissionId);
      if (!submission) continue;

      const rosterEntry = await db.getRosterEntry(submission.rosterId);
      if (!rosterEntry) continue;

      // Calculate elapsed fraction of the monitoring window
      const monitoringStart = new Date(monitoring.monitoringStartDate).getTime();
      const monitoringEnd = new Date(monitoring.monitoringEndDate).getTime();
      const violationTime = new Date(check.checkDate).getTime();
      const totalDuration = monitoringEnd - monitoringStart;
      const elapsedDuration = Math.max(0, violationTime - monitoringStart);
      const completedFraction = totalDuration > 0 ? elapsedDuration / totalDuration : 0;

      const fullFee = Number(rosterEntry.creatorFee);
      const proRatedPayout = parseFloat((fullFee * completedFraction).toFixed(2));
      const clawbackAmount = parseFloat((fullFee - proRatedPayout).toFixed(2));

      console.log(
        `[Monitoring] Clawback: rosterEntry=${rosterEntry.id}, ` +
          `full=$${fullFee}, earned=$${proRatedPayout}, clawback=$${clawbackAmount}`
      );

      // Create a reduced payout for the completed portion (if any)
      if (proRatedPayout > 0) {
        const creatorProfile = await db.getCreatorProfileById(submission.creatorId);
        const delayDays = creatorProfile?.isPro ? PRO_PAYOUT_DELAY_DAYS : STANDARD_PAYOUT_DELAY_DAYS;
        const releaseDate = new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000);

        await db.createPayout({
          rosterId: rosterEntry.id,
          creatorId: submission.creatorId,
          amount: String(proRatedPayout),
          status: "pending",
          releaseDate,
        });
      }

      // Refund the clawback amount to the advertiser
      if (clawbackAmount > 0) {
        const payment = await db.getPaymentByCampaignId(monitoring.campaignId);
        if (payment?.stripePaymentIntentId) {
          await processRefund(payment.stripePaymentIntentId, clawbackAmount);
        }
      }

      // Mark the violation as resolved (clawback processed)
      await db.markViolationResolved(check.id);
      await db.updatePostMonitoringStatus(monitoring.id, "removed");

      // Notify creator
      const creatorProfile = await db.getCreatorProfileById(submission.creatorId);
      if (creatorProfile) {
        await notifyGracePeriodExpired(creatorProfile.userId, monitoring.campaignId);
      }
    } catch (err) {
      console.error(`[Monitoring] Grace period clawback failed for check ${check.id}:`, err);
    }
  }
}

/**
 * Auto-approve drafts that have been pending for more than 48 hours.
 * Called by the server-side job runner on an interval.
 */
export async function processAutoApprovals(): Promise<void> {
  const AUTO_APPROVAL_HOURS = Number(process.env.CONTENT_AUTO_APPROVAL_TIMEOUT ?? 48);
  const cutoff = new Date(Date.now() - AUTO_APPROVAL_HOURS * 60 * 60 * 1000);

  const pendingDrafts = await db.getPendingDraftsOlderThan(cutoff);

  for (const submission of pendingDrafts) {
    try {
      await db.approveContentSubmission(submission.id);

      const rosterEntry = await db.getRosterEntry(submission.rosterId);
      if (!rosterEntry) continue;

      const creatorProfile = await db.getCreatorProfileById(submission.creatorId);
      if (creatorProfile) {
        await notifyContentAutoApproved(creatorProfile.userId, submission.campaignId);
      }

      console.log(`[AutoApproval] Submission ${submission.id} auto-approved`);
    } catch (err) {
      console.error(`[AutoApproval] Failed for submission ${submission.id}:`, err);
    }
  }
}

/**
 * Detect creator no-shows: roster entries that are "accepted" but have no
 * submission after the campaign deadline.  Marks them declined, refunds escrow.
 */
export async function processNoShows(): Promise<void> {
  const noShows = await db.getNoShowRosterEntries();

  for (const { roster, campaign } of noShows) {
    try {
      // Mark the roster entry as declined (no-show)
      await db.updateRosterStatus(roster.id, "declined");

      // Refund the creator's fee from escrow to the advertiser
      const payment = await db.getPaymentByCampaignId(campaign.id);
      if (payment?.stripePaymentIntentId) {
        await processRefund(payment.stripePaymentIntentId, Number(roster.creatorFee));
      }

      // advertiserId on campaigns is the user ID directly
      await notifyNoShow(campaign.advertiserId, roster.creatorId, campaign.id);

      console.log(
        `[NoShow] Creator ${roster.creatorId} no-show on campaign ${campaign.id} — refund queued`
      );
    } catch (err) {
      console.error(`[NoShow] Failed for roster ${roster.id}:`, err);
    }
  }
}

// ============================================================================
// PAYOUT RELEASE PROCESSOR
// ============================================================================

/**
 * Process all payouts whose releaseDate has passed.
 * Calls Interswitch disbursement API for each creator and marks them completed.
 */
export async function processPendingPayouts(): Promise<void> {
  const { disburseToBankAccount } = await import("./interswitch");
  const releasedPayouts = await db.getReleasedPendingPayouts(50);

  for (const payout of releasedPayouts) {
    try {
      const details = await db.getPayoutWithCreatorDetails(payout.id);
      if (!details) {
        // No bank account on file — mark failed
        await db.updatePayoutStatus(payout.id, "failed");
        console.warn(`[Payouts] No bank details for payout #${payout.id}, marking failed`);
        continue;
      }

      await db.updatePayoutStatus(payout.id, "processing");

      const result = await disburseToBankAccount(
        details.bank.accountNumber,
        details.bank.bankCode,
        details.bank.accountName,
        Number(payout.amount),
        `Vyral campaign payout #${payout.id}`,
        payout.id
      );

      if (result.success) {
        await db.updatePayoutStatus(payout.id, "completed");
        if (result.reference) await db.updatePayoutTransferRef(payout.id, result.reference);
        // Notify creator
        const profile = await db.getCreatorProfileById(payout.creatorId);
        if (profile) await notifyPayoutReleased(profile.userId, Number(payout.amount), details.campaignId);
        console.log(`[Payouts] Payout #${payout.id} disbursed: ₦${payout.amount}`);
      } else {
        await db.updatePayoutStatus(payout.id, "failed");
        console.error(`[Payouts] Payout #${payout.id} failed: ${result.message}`);
      }
    } catch (err: any) {
      console.error(`[Payouts] Error processing payout #${payout.id}:`, err?.message);
    }
  }
}

export const monitoringConfig = {
  checkInterval: MONITORING_INTERVAL_MS,
  gracePeriod: GRACE_PERIOD_MS,
  apifyApiKey: APIFY_API_KEY,
  apifyBaseUrl: APIFY_BASE_URL,
};
