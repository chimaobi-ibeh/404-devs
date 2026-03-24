import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import * as db from "./db";
import { calculateVyralMatchScore, calculateCreatorTier } from "./vyralMatch";
import { initializePayment as interswitchInitPayment, interswitchConfig } from "./interswitch";
import { createMonitoringJob } from "./monitoring";
import {
  notifyContentApproved,
  notifyRevisionRequested,
  notifyDraftSubmitted,
  notifyVerificationApproved,
  notifyVerificationRejected,
} from "./notifications";

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Verify a live post URL is publicly accessible via a lightweight HEAD request.
 * Returns "verified" on success or "pending_verification" if unreachable.
 */
async function verifyLiveUrl(url: string): Promise<"verified" | "pending_verification"> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: { "User-Agent": "Vyral-Verification-Bot/1.0" },
    });
    clearTimeout(timeout);
    return res.ok ? "verified" : "pending_verification";
  } catch {
    return "pending_verification";
  }
}

// ============================================================================
// ADVERTISER ROUTER
// ============================================================================

const advertiserRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    return db.getAdvertiserProfile(ctx.user.id);
  }),

  getPublicProfile: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return db.getPublicAdvertiserProfile(input.userId);
    }),

  getPublicCampaigns: protectedProcedure
    .input(z.object({ userId: z.number(), limit: z.number().default(10) }))
    .query(async ({ input }) => {
      return db.getActiveCampaignsByAdvertiser(input.userId, input.limit);
    }),

  createProfile: protectedProcedure
    .input(
      z.object({
        companyName: z.string().min(1),
        industry: z.string().optional(),
        description: z.string().optional(),
        website: z.string().optional(),
        logoUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await db.createAdvertiserProfile({
        userId: ctx.user.id,
        companyName: input.companyName,
        industry: input.industry || null,
        description: input.description || null,
        website: input.website || null,
        logoUrl: input.logoUrl || null,
        verificationStatus: "pending",
      });
      // Update user role to advertiser (unless they're admin)
      if (ctx.user.role !== "admin") {
        await db.upsertUser({ openId: ctx.user.openId, role: "advertiser", lastSignedIn: ctx.user.lastSignedIn });
      }
      return profile;
    }),

  updateProfile: protectedProcedure
    .input(z.object({
      companyName: z.string().min(1).optional(),
      industry: z.string().optional(),
      website: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.updateAdvertiserProfile(ctx.user.id, {
        companyName: input.companyName,
        industry: input.industry ?? null,
        website: input.website ?? null,
        description: input.description ?? null,
      });
    }),

  getCampaigns: protectedProcedure
    .input(z.object({ limit: z.number().default(20), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      return db.getAdvertiserCampaigns(ctx.user.id, input.limit, input.offset);
    }),

  createCampaign: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        category: z.enum(["music", "app", "brand", "event", "challenge"]),
        contentType: z.enum(["video", "story", "reel", "hashtag", "dance_challenge", "trend", "review"]),
        targetAudience: z.string().optional(),
        budget: z.number().positive(),
        deadline: z.date(),
        castingMode: z.enum(["hand_pick", "open_call", "vyral_match", "hybrid"]),
        minPostDuration: z.number().optional(),
        requiredHashtags: z.array(z.string()).optional(),
        moodBoardUrl: z.string().optional(),
        referenceVideoUrl: z.string().optional(),
        deliverables: z.string().optional(),
        contentDos: z.string().optional(),
        contentDonts: z.string().optional(),
        postingWindowStart: z.string().optional(),
        postingWindowEnd: z.string().optional(),
        targetPlatforms: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Pro gating: free advertisers limited to 3 active/draft campaigns
      const activeCampaignCount = await db.getAdvertiserActiveCampaignCount(ctx.user.id);
      if (activeCampaignCount >= 3) {
        // Check if they have a pro subscription (via advertiser profile — use isPro flag indirectly)
        // For advertisers we gate at 3; Pro advertisers get unlimited
        // (advertiser pro subscription is separate — for now check count only at 3, no advertiser pro yet)
        throw new TRPCError({ code: "FORBIDDEN", message: "Free accounts are limited to 3 active campaigns. Contact support to upgrade." });
      }
      const platformFee = input.budget * 0.05;
      return db.createCampaign({
        advertiserId: ctx.user.id,
        title: input.title,
        description: input.description || null,
        category: input.category,
        contentType: input.contentType,
        targetAudience: input.targetAudience || null,
        budget: String(input.budget),
        platformFee: String(platformFee),
        deadline: input.deadline,
        castingMode: input.castingMode,
        minPostDuration: input.minPostDuration || null,
        requiredHashtags: input.requiredHashtags ? JSON.stringify(input.requiredHashtags) : null,
        moodBoardUrl: input.moodBoardUrl || null,
        referenceVideoUrl: input.referenceVideoUrl || null,
        deliverables: input.deliverables || null,
        contentDos: input.contentDos || null,
        contentDonts: input.contentDonts || null,
        postingWindowStart: input.postingWindowStart ? new Date(input.postingWindowStart) : null,
        postingWindowEnd: input.postingWindowEnd ? new Date(input.postingWindowEnd) : null,
        targetPlatforms: input.targetPlatforms ? JSON.stringify(input.targetPlatforms) : null,
        status: "draft",
      });
    }),

  getCampaignAnalytics: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getCampaignAnalytics(input.campaignId);
    }),

  getCampaign: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const campaign = await db.getCampaign(input.id);
      // Creators can view active campaigns; advertisers can only view their own
      if (campaign && ctx.user.role === "advertiser" && campaign.advertiserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return campaign;
    }),

  addCreatorToRoster: protectedProcedure
    .input(
      z.object({
        campaignId: z.number(),
        creatorId: z.number(),
        castingMode: z.enum(["hand_pick", "open_call", "vyral_match"]),
        creatorFee: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const campaign = await db.getCampaign(input.campaignId);
      if (!campaign || campaign.advertiserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.addCreatorToRoster({
        campaignId: input.campaignId,
        creatorId: input.creatorId,
        castingMode: input.castingMode,
        creatorFee: String(input.creatorFee),
        status: input.castingMode === "open_call" ? "applied" : "invited",
      });
    }),

  getCampaignRoster: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ ctx, input }) => {
      const campaign = await db.getCampaign(input.campaignId);
      if (!campaign || campaign.advertiserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.getCampaignRoster(input.campaignId);
    }),

  // FIX #6: save advertiserNotes when requesting a revision
  approveContent: protectedProcedure
    .input(z.object({ submissionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const submission = await db.getContentSubmission(input.submissionId);
      if (!submission) throw new TRPCError({ code: "NOT_FOUND" });

      const campaign = await db.getCampaign(submission.campaignId);
      if (!campaign || campaign.advertiserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await db.approveContentSubmission(input.submissionId);

      // Notify creator their draft was approved
      const creatorProfile = await db.getCreatorProfileById(submission.creatorId);
      if (creatorProfile) {
        await notifyContentApproved(creatorProfile.userId, submission.campaignId);
      }

      return { success: true };
    }),

  requestRevision: protectedProcedure
    .input(z.object({ submissionId: z.number(), notes: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const submission = await db.getContentSubmission(input.submissionId);
      if (!submission) throw new TRPCError({ code: "NOT_FOUND" });

      const campaign = await db.getCampaign(submission.campaignId);
      if (!campaign || campaign.advertiserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (submission.revisionCount >= 1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only 1 free revision allowed" });
      }

      // FIX #6: persist notes and increment revisionCount atomically
      await db.updateContentSubmissionNotes(input.submissionId, input.notes);

      // Notify creator with the revision notes
      const creatorProfile = await db.getCreatorProfileById(submission.creatorId);
      if (creatorProfile) {
        await notifyRevisionRequested(creatorProfile.userId, submission.campaignId, input.notes);
      }

      return { success: true };
    }),

  fundCampaign: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      callbackUrl: z.string(), // full URL the browser returns to after payment
    }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await db.getCampaign(input.campaignId);
      if (!campaign || campaign.advertiserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (campaign.status !== "draft") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Campaign is already funded or active" });
      }

      const advertiser = await db.getAdvertiserProfile(ctx.user.id);
      const totalAmount = Number(campaign.budget) + Number(campaign.platformFee);

      const { transactionRef, redirectUrl } = await interswitchInitPayment(
        campaign.id,
        totalAmount,
        ctx.user.email ?? "",
        advertiser?.companyName ?? ctx.user.name ?? ctx.user.email ?? "",
        input.callbackUrl
      );

      // Record the pending payment
      await db.createPayment({
        campaignId: campaign.id,
        advertiserId: ctx.user.id,
        amount: String(totalAmount),
        platformFee: String(campaign.platformFee),
        status: "pending",
        stripePaymentIntentId: transactionRef, // reusing column for Interswitch ref
        paymentMethod: "interswitch",
      });

      return { transactionRef, redirectUrl };
    }),

  launchCampaign: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await db.getCampaign(input.campaignId);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
      if (campaign.advertiserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      if (campaign.status !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "Campaign is not a draft" });
      await db.updateCampaignStatus(input.campaignId, "active");
      return { success: true };
    }),

  updateCampaign: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      budget: z.number().optional(),
      deadline: z.string().optional(),
      castingMode: z.enum(["hand_pick", "open_call", "vyral_match", "hybrid"]).optional(),
      category: z.enum(["music", "app", "brand", "event", "challenge"]).optional(),
      contentType: z.enum(["video", "story", "reel", "hashtag", "dance_challenge", "trend", "review"]).optional(),
      deliverables: z.string().optional(),
      contentDos: z.string().optional(),
      contentDonts: z.string().optional(),
      postingWindowStart: z.string().optional(),
      postingWindowEnd: z.string().optional(),
      targetPlatforms: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await db.getCampaign(input.campaignId);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
      if (campaign.advertiserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const { campaignId, deadline, budget, postingWindowStart, postingWindowEnd, targetPlatforms, ...rest } = input;
      return db.updateCampaign(campaignId, {
        ...rest,
        ...(budget !== undefined ? { budget: String(budget) } : {}),
        ...(deadline !== undefined ? { deadline: new Date(deadline) } : {}),
        ...(postingWindowStart !== undefined ? { postingWindowStart: new Date(postingWindowStart) } : {}),
        ...(postingWindowEnd !== undefined ? { postingWindowEnd: new Date(postingWindowEnd) } : {}),
        ...(targetPlatforms !== undefined ? { targetPlatforms: JSON.stringify(targetPlatforms) } : {}),
      });
    }),

  getContentSubmissions: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ ctx, input }) => {
      const campaign = await db.getCampaign(input.campaignId);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
      if (campaign.advertiserId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.getContentSubmissionsForCampaign(input.campaignId);
    }),

  createDispute: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      rosterId: z.number().optional(),
      reason: z.string().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await db.getCampaign(input.campaignId);
      if (!campaign || campaign.advertiserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.createDispute({
        campaignId: input.campaignId,
        rosterId: input.rosterId ?? null,
        advertiserId: ctx.user.id,
        reason: input.reason,
        description: input.description ?? null,
        status: "open",
      });
    }),

  acceptRosterEntry: protectedProcedure
    .input(z.object({ rosterId: z.number(), creatorFee: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const roster = await db.getRosterEntry(input.rosterId);
      if (!roster) throw new TRPCError({ code: "NOT_FOUND" });
      const campaign = await db.getCampaign(roster.campaignId);
      if (!campaign || campaign.advertiserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await db.updateRosterStatus(input.rosterId, "accepted");
      await db.updateCampaign(roster.campaignId, { budget: String(Number(campaign.budget)) });
      return { success: true };
    }),
});

// ============================================================================
// CREATOR ROUTER
// ============================================================================

const creatorRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    return db.getCreatorProfile(ctx.user.id);
  }),

  createProfile: protectedProcedure
    .input(
      z.object({
        displayName: z.string().min(1),
        bio: z.string().optional(),
        profileImageUrl: z.string().optional(),
        niche: z.string().optional(),
        totalFollowers: z.number().default(0),
        engagementRate: z.number().default(0),
        fullName: z.string().optional(),
        country: z.string().optional(),
        dateOfBirth: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tier = calculateCreatorTier(input.totalFollowers);
      const profile = await db.createCreatorProfile({
        userId: ctx.user.id,
        displayName: input.displayName,
        bio: input.bio || null,
        profileImageUrl: input.profileImageUrl || null,
        niche: input.niche || "general",
        totalFollowers: input.totalFollowers,
        engagementRate: String(input.engagementRate),
        tier,
        vyralScore: "0",
        verificationStatus: "pending",
        fullName: input.fullName || null,
        country: input.country || null,
        dateOfBirth: input.dateOfBirth || null,
      });
      // Update user role to creator (unless they're admin)
      if (ctx.user.role !== "admin") {
        await db.upsertUser({ openId: ctx.user.openId, role: "creator", lastSignedIn: ctx.user.lastSignedIn });
      }
      return profile;
    }),

  updateProfile: protectedProcedure
    .input(z.object({
      displayName: z.string().min(1).optional(),
      bio: z.string().optional(),
      niche: z.string().optional(),
      totalFollowers: z.number().optional(),
      fullName: z.string().optional(),
      dateOfBirth: z.string().optional(),
      country: z.string().optional(),
      phoneNumber: z.string().optional(),
      contentCategories: z.array(z.string()).optional(),
      contentLanguages: z.array(z.string()).optional(),
      profileImageUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.updateCreatorProfile(ctx.user.id, {
        displayName: input.displayName,
        bio: input.bio ?? null,
        niche: input.niche,
        totalFollowers: input.totalFollowers,
        fullName: input.fullName ?? null,
        dateOfBirth: input.dateOfBirth ?? null,
        country: input.country ?? null,
        phoneNumber: input.phoneNumber ?? null,
        contentCategories: input.contentCategories ? JSON.stringify(input.contentCategories) : null,
        contentLanguages: input.contentLanguages ? JSON.stringify(input.contentLanguages) : null,
        profileImageUrl: input.profileImageUrl ?? null,
      });
    }),

  searchCreators: publicProcedure
    .input(
      z.object({
        niche: z.string().optional(),
        minFollowers: z.number().optional(),
        maxFollowers: z.number().optional(),
        minEngagement: z.number().optional(),
        tier: z.string().optional(),
        platform: z.string().optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      return db.searchCreators(input);
    }),

  // FIX #4: real query — only open_call/active campaigns visible to creators
  getAvailableCampaigns: protectedProcedure
    .input(z.object({ limit: z.number().default(20), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      return db.getActiveCampaignsForCreators(input.limit, input.offset);
    }),

  applyCampaign: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const creatorProfile = await db.getCreatorProfile(ctx.user.id);
      if (!creatorProfile) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Creator profile not found" });
      }
      // Pro gating: free creators limited to 3 active applications
      if (!creatorProfile.isPro) {
        const activeCount = await db.getCreatorActiveApplicationCount(creatorProfile.id);
        if (activeCount >= 3) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Free accounts are limited to 3 active campaign applications. Upgrade to Pro for unlimited applications." });
        }
      }
      const campaign = await db.getCampaign(input.campaignId);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
      if (campaign.castingMode !== "open_call") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Campaign is not open for applications" });
      }

      return db.addCreatorToRoster({
        campaignId: input.campaignId,
        creatorId: creatorProfile.id,
        castingMode: "open_call",
        creatorFee: "0", // set by advertiser when accepting the application
        status: "applied",
      });
    }),

  declineCampaign: protectedProcedure
    .input(z.object({ rosterId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const roster = await db.getRosterEntry(input.rosterId);
      if (!roster) throw new TRPCError({ code: "NOT_FOUND" });

      const creatorProfile = await db.getCreatorProfile(ctx.user.id);
      if (!creatorProfile || roster.creatorId !== creatorProfile.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await db.updateRosterStatus(input.rosterId, "declined");
      return { success: true };
    }),

  // FIX #8: schedule auto-approval background job when draft is submitted
  submitDraft: protectedProcedure
    .input(
      z.object({
        rosterId: z.number(),
        draftUrl: z.string(),
        draftThumbnailUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const roster = await db.getRosterEntry(input.rosterId);
      if (!roster) throw new TRPCError({ code: "NOT_FOUND" });

      const creatorProfile = await db.getCreatorProfile(ctx.user.id);
      if (!creatorProfile || roster.creatorId !== creatorProfile.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const submittedAt = new Date();
      const submission = await db.createContentSubmission({
        rosterId: input.rosterId,
        campaignId: roster.campaignId,
        creatorId: creatorProfile.id,
        draftUrl: input.draftUrl,
        draftThumbnailUrl: input.draftThumbnailUrl,
        draftStatus: "pending",
        livePostStatus: "pending",
        submittedAt,
        revisionCount: 0,
      });

      // FIX #8: Schedule auto-approval job for 48 hours from now
      const AUTO_APPROVAL_HOURS = Number(process.env.CONTENT_AUTO_APPROVAL_TIMEOUT ?? 48);
      await db.createBackgroundJob({
        jobType: "content_auto_approval",
        targetId: roster.campaignId,
        targetType: "submission",
        status: "pending",
        scheduledFor: new Date(submittedAt.getTime() + AUTO_APPROVAL_HOURS * 60 * 60 * 1000),
        data: JSON.stringify({ rosterId: input.rosterId }),
      });

      // Notify the advertiser that a draft is waiting for review
      const campaign = await db.getCampaign(roster.campaignId);
      if (campaign) {
        await notifyDraftSubmitted(campaign.advertiserId, roster.campaignId);
      }

      return submission;
    }),

  // FIX #1: save livePostUrl + screenshot; FIX #5: real HTTP check; FIX #9: stories path
  submitLivePost: protectedProcedure
    .input(
      z.object({
        submissionId: z.number(),
        livePostUrl: z.string().url(),
        livePostScreenshot: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const submission = await db.getContentSubmission(input.submissionId);
      if (!submission) throw new TRPCError({ code: "NOT_FOUND" });

      const creatorProfile = await db.getCreatorProfile(ctx.user.id);
      if (!creatorProfile || submission.creatorId !== creatorProfile.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (submission.draftStatus !== "approved") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Draft must be approved before submitting a live post",
        });
      }

      // FIX #5: immediate URL accessibility check
      const verificationStatus = await verifyLiveUrl(input.livePostUrl);

      // FIX #1: persist the live post URL and screenshot
      await db.updateContentSubmissionLivePost(
        input.submissionId,
        input.livePostUrl,
        input.livePostScreenshot,
        verificationStatus
      );

      const campaign = await db.getCampaign(submission.campaignId);
      const isStory = campaign?.contentType === "story";

      if (verificationStatus === "verified") {
        if (isStory) {
          // FIX #9: Stories — single verification window, payout after 24 hours
          const creatorIsPro = creatorProfile.isPro;
          const delayHours = isStory ? 24 : (creatorIsPro ? 48 : 7 * 24);
          const releaseDate = new Date(Date.now() + delayHours * 60 * 60 * 1000);

          const rosterEntry = await db.getRosterEntry(submission.rosterId);
          if (rosterEntry) {
            await db.createPayout({
              rosterId: rosterEntry.id,
              creatorId: creatorProfile.id,
              amount: rosterEntry.creatorFee,
              status: "pending",
              releaseDate,
            });
          }
          // No extended monitoring for stories
        } else if (campaign?.minPostDuration) {
          // Regular post with monitoring window
          await createMonitoringJob(submission.id, campaign.minPostDuration, false);
        } else {
          // Regular post, no monitoring duration — release payout with standard delay
          const delayDays = creatorProfile.isPro
            ? Number(process.env.STRIPE_PRO_PAYOUT_DELAY_DAYS ?? 2)
            : Number(process.env.STRIPE_PAYOUT_DELAY_DAYS ?? 7);
          const releaseDate = new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000);
          const rosterEntry = await db.getRosterEntry(submission.rosterId);
          if (rosterEntry) {
            await db.createPayout({
              rosterId: rosterEntry.id,
              creatorId: creatorProfile.id,
              amount: rosterEntry.creatorFee,
              status: "pending",
              releaseDate,
            });
          }
        }
      }
      // If pending_verification, a subsequent monitoring job will handle payout once verified

      return { success: true, verificationStatus };
    }),

  getEarnings: protectedProcedure.query(async ({ ctx }) => {
    const creatorProfile = await db.getCreatorProfile(ctx.user.id);
    if (!creatorProfile) return { totalEarnings: 0, pendingEarnings: 0, payouts: [] };

    const payoutList = await db.getCreatorPayouts(creatorProfile.id, 50);
    const totalEarnings = payoutList
      .filter((p) => p.status === "completed")
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const pendingEarnings = payoutList
      .filter((p) => p.status === "pending" || p.status === "processing")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return { totalEarnings, pendingEarnings, payouts: payoutList };
  }),

  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const creatorProfile = await db.getCreatorProfile(ctx.user.id);
    if (!creatorProfile) return null;
    return db.getCreatorSubscription(creatorProfile.id);
  }),

  upgradeToPro: protectedProcedure
    .input(z.object({ callbackUrl: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const creatorProfile = await db.getCreatorProfile(ctx.user.id);
      if (!creatorProfile) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Creator profile not found" });
      }
      if (creatorProfile.isPro) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Already a Pro member" });
      }
      // Create a pending subscription record
      await db.createCreatorSubscription({
        creatorId: creatorProfile.id,
        planType: "pro",
        startDate: new Date(),
        autoRenew: true,
        status: "pending_payment",
      });
      // Initiate Interswitch payment for ₦1,200/month
      const { transactionRef, redirectUrl } = await interswitchInitPayment(
        creatorProfile.id,
        interswitchConfig.proSubscriptionPrice,
        ctx.user.email ?? "",
        ctx.user.name ?? ctx.user.email ?? "",
        input.callbackUrl
      );
      // Store payment record (reuse payments table, advertiserId = userId)
      await db.createPayment({
        campaignId: 0, // 0 = pro subscription, not a campaign
        advertiserId: ctx.user.id,
        amount: String(interswitchConfig.proSubscriptionPrice),
        platformFee: "0",
        status: "pending",
        stripePaymentIntentId: transactionRef,
        paymentMethod: "interswitch",
      });
      return { transactionRef, redirectUrl };
    }),

  // Notifications for the logged-in user
  getNotifications: protectedProcedure
    .input(z.object({ limit: z.number().default(30) }))
    .query(async ({ ctx, input }) => {
      return db.getUserNotifications(ctx.user.id, input.limit);
    }),

  markNotificationRead: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.markNotificationRead(input.notificationId);
      return { success: true };
    }),

  markAllNotificationsRead: protectedProcedure.mutation(async ({ ctx }) => {
    await db.markAllNotificationsRead(ctx.user.id);
    return { success: true };
  }),

  getMyRosterEntries: protectedProcedure.query(async ({ ctx }) => {
    const creatorProfile = await db.getCreatorProfile(ctx.user.id);
    if (!creatorProfile) return [];
    return db.getCreatorRosterEntries(creatorProfile.id);
  }),

  getSocialAccounts: protectedProcedure.query(async ({ ctx }) => {
    const profile = await db.getCreatorProfile(ctx.user.id);
    if (!profile) return [];
    return db.getSocialAccountsByCreator(profile.id);
  }),

  upsertSocialAccount: protectedProcedure
    .input(z.object({
      platform: z.enum(["instagram", "tiktok", "youtube", "x", "twitch"]),
      username: z.string().min(1),
      followers: z.number().min(0),
      engagementRate: z.number().min(0).max(100),
      profileUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const profile = await db.getCreatorProfile(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "BAD_REQUEST", message: "Creator profile not found" });
      return db.upsertSocialAccount({ creatorId: profile.id, ...input });
    }),

  deleteSocialAccount: protectedProcedure
    .input(z.object({ accountId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const profile = await db.getCreatorProfile(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "FORBIDDEN" });
      await db.deleteSocialAccount(input.accountId);
      return { success: true };
    }),

  getPortfolio: protectedProcedure.query(async ({ ctx }) => {
    const profile = await db.getCreatorProfile(ctx.user.id);
    if (!profile) return [];
    return db.getPortfolioItems(profile.id);
  }),

  addPortfolioItem: protectedProcedure
    .input(z.object({
      brand: z.string().optional(),
      campaignTitle: z.string().min(1),
      platform: z.enum(["instagram", "tiktok", "youtube", "x", "twitch"]),
      contentUrl: z.string().optional(),
      thumbnailUrl: z.string().optional(),
      metrics: z.object({
        impressions: z.number().optional(),
        reach: z.number().optional(),
        engagement: z.number().optional(),
        views: z.number().optional(),
      }).optional(),
      completedAt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const profile = await db.getCreatorProfile(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "BAD_REQUEST" });
      // Pro gating: free creators limited to 5 portfolio items
      if (!profile.isPro) {
        const count = await db.getCreatorPortfolioCount(profile.id);
        if (count >= 5) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Free accounts are limited to 5 portfolio items. Upgrade to Pro for unlimited." });
        }
      }
      return db.addPortfolioItem({
        creatorId: profile.id,
        brand: input.brand,
        campaignTitle: input.campaignTitle,
        platform: input.platform,
        contentUrl: input.contentUrl,
        thumbnailUrl: input.thumbnailUrl,
        metrics: input.metrics ? JSON.stringify(input.metrics) : null,
        completedAt: input.completedAt ? new Date(input.completedAt) : null,
      });
    }),

  deletePortfolioItem: protectedProcedure
    .input(z.object({ itemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const profile = await db.getCreatorProfile(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "FORBIDDEN" });
      await db.deletePortfolioItem(input.itemId, profile.id);
      return { success: true };
    }),

  submitForVerification: protectedProcedure.mutation(async ({ ctx }) => {
    const profile = await db.getCreatorProfile(ctx.user.id);
    if (!profile) throw new TRPCError({ code: "BAD_REQUEST", message: "Creator profile not found" });
    // Reset to pending so admin sees it in the queue
    await db.updateCreatorProfile(ctx.user.id, { verificationStatus: "pending" });
    return { success: true };
  }),

  getPublicProfile: protectedProcedure
    .input(z.object({ creatorProfileId: z.number() }))
    .query(async ({ input }) => {
      return db.getPublicCreatorProfile(input.creatorProfileId);
    }),

  updateBankAccount: protectedProcedure
    .input(z.object({
      bankCode: z.string().min(1),
      accountNumber: z.string().min(10).max(10),
      accountName: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.updateCreatorBankDetails(ctx.user.id, {
        bankCode: input.bankCode,
        accountNumber: input.accountNumber,
        accountName: input.accountName,
      });
      return { success: true };
    }),

  getBankAccount: protectedProcedure.query(async ({ ctx }) => {
    return db.getCreatorBankDetails(ctx.user.id);
  }),

  requestPayout: protectedProcedure.mutation(async ({ ctx }) => {
    const creatorProfile = await db.getCreatorProfile(ctx.user.id);
    if (!creatorProfile) throw new TRPCError({ code: "BAD_REQUEST", message: "Creator profile not found" });

    const bank = await db.getCreatorBankDetails(ctx.user.id);
    if (!bank) throw new TRPCError({ code: "BAD_REQUEST", message: "No bank account on file. Add your bank details first." });

    // Find all pending payouts whose release date has passed
    const releasedPayouts = await db.getReleasedPendingPayouts(50);
    const myPayouts = releasedPayouts.filter((p) => p.creatorId === creatorProfile.id);

    if (myPayouts.length === 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No payouts are ready for release yet." });
    }

    const { disburseToBankAccount } = await import("./interswitch");
    const totalAmount = myPayouts.reduce((sum, p) => sum + Number(p.amount), 0);

    // Mark all as processing
    for (const p of myPayouts) await db.updatePayoutStatus(p.id, "processing");

    const result = await disburseToBankAccount(
      bank.accountNumber,
      bank.bankCode,
      bank.accountName,
      totalAmount,
      `Vyral payout — ₦${totalAmount.toLocaleString()}`,
      myPayouts[0].id
    );

    if (result.success) {
      for (const p of myPayouts) {
        await db.updatePayoutStatus(p.id, "completed");
        if (result.reference) await db.updatePayoutTransferRef(p.id, result.reference);
      }
    } else {
      for (const p of myPayouts) await db.updatePayoutStatus(p.id, "failed");
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.message ?? "Disbursement failed" });
    }

    return { success: true, amount: totalAmount, reference: result.reference };
  }),

  createDispute: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      rosterId: z.number().optional(),
      reason: z.string().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorProfile = await db.getCreatorProfile(ctx.user.id);
      if (!creatorProfile) throw new TRPCError({ code: "BAD_REQUEST", message: "Creator profile not found" });
      // Verify creator is on this campaign's roster
      const roster = await db.getCampaignRoster(input.campaignId);
      const onRoster = roster.some((r) => r.creatorId === creatorProfile.id);
      if (!onRoster) throw new TRPCError({ code: "FORBIDDEN" });
      const campaign = await db.getCampaign(input.campaignId);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
      return db.createDispute({
        campaignId: input.campaignId,
        rosterId: input.rosterId ?? null,
        advertiserId: campaign.advertiserId,
        creatorId: creatorProfile.id,
        reason: input.reason,
        description: input.description ?? null,
        status: "open",
      });
    }),
});

// ============================================================================
// VYRAL MATCH ROUTER
// ============================================================================

const vyralMatchRouter = router({
  generateMatches: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await db.getCampaign(input.campaignId);
      if (!campaign || campaign.advertiserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Use campaign category/description for niche matching, not targetAudience
      const creators = await db.searchCreators({
        niche: campaign.category || undefined,
        limit: 100,
      });

      const scores = [];
      for (const creator of creators) {
        const score = await calculateVyralMatchScore(campaign, creator);
        scores.push(score);
      }

      scores.sort((a: any, b: any) => b.totalScore - a.totalScore);

      for (const score of scores.slice(0, 20)) {
        await db.createVyralMatchScore(score);
      }

      return scores.slice(0, 20);
    }),

  getMatches: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ ctx, input }) => {
      const campaign = await db.getCampaign(input.campaignId);
      if (!campaign || campaign.advertiserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.getVyralMatchScores(input.campaignId);
    }),

  acceptMatch: protectedProcedure
    .input(z.object({ scoreId: z.number(), creatorFee: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      const score = await db.getVyralMatchScoreById(input.scoreId);
      if (!score) throw new TRPCError({ code: "NOT_FOUND" });
      const campaign = await db.getCampaign(score.campaignId);
      if (!campaign || campaign.advertiserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      // Add the matched creator to the roster as an invitation
      return db.addCreatorToRoster({
        campaignId: score.campaignId,
        creatorId: score.creatorId,
        castingMode: "vyral_match",
        creatorFee: String(input.creatorFee),
        status: "invited",
      });
    }),
});

// ============================================================================
// MESSAGING ROUTER
// ============================================================================

const messagingRouter = router({
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    return db.getConversationsByUser(ctx.user.id);
  }),

  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const convo = await db.getConversation(input.conversationId);
      if (!convo) throw new TRPCError({ code: "NOT_FOUND" });
      if (convo.advertiserId !== ctx.user.id && convo.creatorId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await db.markConversationRead(input.conversationId, ctx.user.id);
      return db.getMessages(input.conversationId);
    }),

  sendMessage: protectedProcedure
    .input(z.object({ conversationId: z.number(), content: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const convo = await db.getConversation(input.conversationId);
      if (!convo) throw new TRPCError({ code: "NOT_FOUND" });
      if (convo.advertiserId !== ctx.user.id && convo.creatorId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.sendMessage(input.conversationId, ctx.user.id, input.content);
    }),

  startConversation: protectedProcedure
    .input(z.object({ campaignId: z.number(), creatorProfileId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await db.getCampaign(input.campaignId);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
      let advertiserId: number;
      let creatorUserId: number;
      if (ctx.user.id === campaign.advertiserId) {
        // Advertiser initiating — resolve creator's users.id from their profile
        if (!input.creatorProfileId) throw new TRPCError({ code: "BAD_REQUEST", message: "creatorProfileId required" });
        const creatorProfile = await db.getCreatorProfileById(input.creatorProfileId);
        if (!creatorProfile) throw new TRPCError({ code: "NOT_FOUND" });
        advertiserId = ctx.user.id;
        creatorUserId = creatorProfile.userId;
      } else {
        // Creator initiating — advertiser comes from the campaign
        creatorUserId = ctx.user.id;
        advertiserId = campaign.advertiserId;
      }
      return db.getOrCreateConversation(input.campaignId, advertiserId, creatorUserId);
    }),

  markConversationRead: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.markConversationRead(input.conversationId, ctx.user.id);
      return { success: true };
    }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    return db.getUnreadMessageCount(ctx.user.id);
  }),
});

// ============================================================================
// MONITORING ROUTER
// ============================================================================

const monitoringRouter = router({
  // FIX #4: real query
  getMonitoringStatus: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ ctx, input }) => {
      const campaign = await db.getCampaign(input.campaignId);
      if (!campaign || campaign.advertiserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.getMonitoringForCampaign(input.campaignId);
    }),

  triggerCheck: protectedProcedure
    .input(z.object({ monitoringId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const monitoring = await db.getPostMonitoring(input.monitoringId);
      if (!monitoring) throw new TRPCError({ code: "NOT_FOUND" });

      const { checkPostStatus } = await import("./monitoring");
      return checkPostStatus(monitoring);
    }),
});

// ============================================================================
// ADMIN ROUTER
// ============================================================================

const adminRouter = router({
  // FIX #4: real stats
  getDashboard: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const stats = await db.getAdminStats();
    return { stats };
  }),

  // FIX #4: real DB update
  verifyCreator: protectedProcedure
    .input(z.object({ creatorId: z.number(), verified: z.boolean(), rejectionReason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const status = input.verified ? "verified" : "rejected";
      await db.updateCreatorVerificationStatus(input.creatorId, status, input.rejectionReason);
      // Notify the creator
      const creator = await db.getCreatorProfileById(input.creatorId);
      if (creator?.userId) {
        if (input.verified) {
          await notifyVerificationApproved(creator.userId);
        } else {
          await notifyVerificationRejected(creator.userId, input.rejectionReason);
        }
      }
      // Audit log
      await db.createAdminLog({
        adminId: ctx.user.id,
        action: input.verified ? "creator_verified" : "creator_rejected",
        entityType: "creator",
        entityId: input.creatorId,
        details: input.rejectionReason ? JSON.stringify({ reason: input.rejectionReason }) : null,
      });
      return { success: true };
    }),

  // FIX #4: real disputes list
  getDisputes: protectedProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return db.getDisputesList(input.limit, input.offset);
    }),

  getPendingCreators: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return db.getPendingCreators(50);
  }),

  resolveDispute: protectedProcedure
    .input(z.object({
      disputeId: z.number(),
      resolution: z.string().min(1),
      status: z.enum(["resolved", "closed"]),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const result = await db.resolveDispute(input.disputeId, input.resolution, input.status, ctx.user.id);
      await db.createAdminLog({
        adminId: ctx.user.id,
        action: `dispute_${input.status}`,
        entityType: "dispute",
        entityId: input.disputeId,
        details: JSON.stringify({ resolution: input.resolution }),
      });
      return result;
    }),

  verifySocialAccount: protectedProcedure
    .input(z.object({ accountId: z.number(), verified: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const status = input.verified ? "verified" : "rejected";
      await db.updateSocialAccountVerification(input.accountId, status);
      await db.createAdminLog({
        adminId: ctx.user.id,
        action: `social_account_${status}`,
        entityType: "social_account",
        entityId: input.accountId,
        details: null,
      });
      return { success: true };
    }),

  getLogs: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return db.getRecentAdminLogs(input.limit);
    }),

  getSystemHealth: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const stats = await db.getAdminStats();
    const pendingCreators = await db.getPendingCreators(100);
    const disputes = await db.getDisputesList(100, 0);
    return {
      ...stats,
      pendingVerifications: pendingCreators.length,
      openDisputes: disputes.filter((d: any) => d.status === "open").length,
    };
  }),
});

// ============================================================================
// APP ROUTER
// ============================================================================

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  advertiser: advertiserRouter,
  creator: creatorRouter,
  vyralMatch: vyralMatchRouter,
  messaging: messagingRouter,
  monitoring: monitoringRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
