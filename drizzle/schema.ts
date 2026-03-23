import {
  pgTable,
  serial,
  integer,
  text,
  varchar,
  boolean,
  timestamp,
  numeric,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * VYRAL PLATFORM SCHEMA — PostgreSQL (Supabase)
 */

// ============================================================================
// USERS & AUTHENTICATION
// ============================================================================

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 255 }).notNull().unique(), // Supabase Auth user UUID
  email: varchar("email", { length: 320 }),
  name: text("name"),
  role: varchar("role", { length: 20 }).notNull().default("creator"), // advertiser | creator | admin
  loginMethod: varchar("loginMethod", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdateFn(() => new Date()),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================================
// ADVERTISER PROFILES
// ============================================================================

export const advertiserProfiles = pgTable("advertiser_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 100 }),
  description: text("description"),
  website: varchar("website", { length: 255 }),
  logoUrl: varchar("logoUrl", { length: 512 }),
  verificationStatus: varchar("verificationStatus", { length: 20 }).notNull().default("pending"),
  stripeAccountId: varchar("stripeAccountId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export type AdvertiserProfile = typeof advertiserProfiles.$inferSelect;
export type InsertAdvertiserProfile = typeof advertiserProfiles.$inferInsert;

// ============================================================================
// CREATOR PROFILES
// ============================================================================

export const creatorProfiles = pgTable("creator_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  displayName: varchar("displayName", { length: 255 }).notNull(),
  bio: text("bio"),
  profileImageUrl: varchar("profileImageUrl", { length: 512 }),
  niche: varchar("niche", { length: 100 }).notNull(),
  tier: varchar("tier", { length: 20 }).notNull(), // nano | micro | mid | macro | mega
  totalFollowers: integer("totalFollowers").notNull().default(0),
  engagementRate: numeric("engagementRate", { precision: 5, scale: 2 }).notNull().default("0"),
  fullName: varchar("fullName", { length: 255 }),
  dateOfBirth: varchar("dateOfBirth", { length: 20 }),
  country: varchar("country", { length: 100 }),
  phoneNumber: varchar("phoneNumber", { length: 50 }),
  contentCategories: jsonb("contentCategories"),
  contentLanguages: jsonb("contentLanguages"),
  vyralScore: numeric("vyralScore", { precision: 5, scale: 2 }).notNull().default("0"),
  verificationStatus: varchar("verificationStatus", { length: 20 }).notNull().default("pending"),
  stripeConnectId: varchar("stripeConnectId", { length: 255 }),
  isPro: boolean("isPro").notNull().default(false),
  proExpiresAt: timestamp("proExpiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export type CreatorProfile = typeof creatorProfiles.$inferSelect;
export type InsertCreatorProfile = typeof creatorProfiles.$inferInsert;

// ============================================================================
// SOCIAL MEDIA ACCOUNTS
// ============================================================================

export const socialMediaAccounts = pgTable("social_media_accounts", {
  id: serial("id").primaryKey(),
  creatorId: integer("creatorId").notNull(),
  platform: varchar("platform", { length: 30 }).notNull(), // tiktok | instagram | youtube | twitter | twitch
  username: varchar("username", { length: 255 }).notNull(),
  followers: integer("followers").notNull().default(0),
  engagementRate: numeric("engagementRate", { precision: 5, scale: 2 }).notNull().default("0"),
  profileUrl: varchar("profileUrl", { length: 512 }),
  verificationStatus: varchar("verificationStatus", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export type SocialMediaAccount = typeof socialMediaAccounts.$inferSelect;
export type InsertSocialMediaAccount = typeof socialMediaAccounts.$inferInsert;

// ============================================================================
// CAMPAIGNS
// ============================================================================

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  advertiserId: integer("advertiserId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 30 }).notNull(), // music | app | brand | event | challenge
  contentType: varchar("contentType", { length: 30 }).notNull(), // video | story | reel | hashtag | dance_challenge | trend | review
  targetAudience: varchar("targetAudience", { length: 255 }),
  budget: numeric("budget", { precision: 12, scale: 2 }).notNull(),
  platformFee: numeric("platformFee", { precision: 12, scale: 2 }).notNull(),
  deadline: timestamp("deadline").notNull(),
  castingMode: varchar("castingMode", { length: 20 }).notNull(), // hand_pick | open_call | vyral_match | hybrid
  minPostDuration: integer("minPostDuration"),
  requiredHashtags: jsonb("requiredHashtags"),
  moodBoardUrl: varchar("moodBoardUrl", { length: 512 }),
  referenceVideoUrl: varchar("referenceVideoUrl", { length: 512 }),
  deliverables: text("deliverables"),
  contentDos: text("contentDos"),
  contentDonts: text("contentDonts"),
  postingWindowStart: timestamp("postingWindowStart"),
  postingWindowEnd: timestamp("postingWindowEnd"),
  targetPlatforms: jsonb("targetPlatforms"),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft | active | completed | cancelled
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

// ============================================================================
// CAMPAIGN ROSTERS
// ============================================================================

export const campaignRosters = pgTable("campaign_rosters", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaignId").notNull(),
  creatorId: integer("creatorId").notNull(),
  castingMode: varchar("castingMode", { length: 20 }).notNull(),
  creatorFee: numeric("creatorFee", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("invited"), // invited | applied | accepted | declined | completed
  appliedAt: timestamp("appliedAt"),
  acceptedAt: timestamp("acceptedAt"),
  declinedAt: timestamp("declinedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export type CampaignRoster = typeof campaignRosters.$inferSelect;
export type InsertCampaignRoster = typeof campaignRosters.$inferInsert;

// ============================================================================
// CONTENT SUBMISSIONS
// ============================================================================

export const contentSubmissions = pgTable("content_submissions", {
  id: serial("id").primaryKey(),
  rosterId: integer("rosterId").notNull(),
  campaignId: integer("campaignId").notNull(),
  creatorId: integer("creatorId").notNull(),
  draftUrl: varchar("draftUrl", { length: 512 }),
  draftThumbnailUrl: varchar("draftThumbnailUrl", { length: 512 }),
  draftStatus: varchar("draftStatus", { length: 30 }).notNull().default("pending"), // pending | approved | revision_requested | rejected
  revisionCount: integer("revisionCount").notNull().default(0),
  advertiserNotes: text("advertiserNotes"),
  livePostUrl: varchar("livePostUrl", { length: 512 }),
  livePostScreenshot: varchar("livePostScreenshot", { length: 512 }),
  livePostStatus: varchar("livePostStatus", { length: 30 }).notNull().default("pending"), // pending | verified | failed | removed
  submittedAt: timestamp("submittedAt"),
  approvedAt: timestamp("approvedAt"),
  liveAt: timestamp("liveAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export type ContentSubmission = typeof contentSubmissions.$inferSelect;
export type InsertContentSubmission = typeof contentSubmissions.$inferInsert;

// ============================================================================
// POST MONITORING
// ============================================================================

export const postMonitoring = pgTable("post_monitoring", {
  id: serial("id").primaryKey(),
  submissionId: integer("submissionId").notNull(),
  campaignId: integer("campaignId").notNull(),
  creatorId: integer("creatorId").notNull(),
  postUrl: varchar("postUrl", { length: 512 }).notNull(),
  platform: varchar("platform", { length: 30 }).notNull(),
  monitoringStartDate: timestamp("monitoringStartDate").notNull(),
  monitoringEndDate: timestamp("monitoringEndDate").notNull(),
  lastCheckDate: timestamp("lastCheckDate"),
  nextCheckDate: timestamp("nextCheckDate"),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active | completed | flagged | removed
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export type PostMonitoring = typeof postMonitoring.$inferSelect;
export type InsertPostMonitoring = typeof postMonitoring.$inferInsert;

// ============================================================================
// MONITORING CHECKS
// ============================================================================

export const monitoringChecks = pgTable("monitoring_checks", {
  id: serial("id").primaryKey(),
  monitoringId: integer("monitoringId").notNull(),
  checkDate: timestamp("checkDate").notNull(),
  isAccessible: boolean("isAccessible").notNull(),
  isPrivate: boolean("isPrivate").notNull(),
  hashtagsIntact: boolean("hashtagsIntact").notNull(),
  brandMentionIntact: boolean("brandMentionIntact").notNull(),
  viewCount: integer("viewCount"),
  engagementCount: integer("engagementCount"),
  likeCount: integer("likeCount"),
  commentCount: integer("commentCount"),
  shareCount: integer("shareCount"),
  violations: jsonb("violations"),
  flagged: boolean("flagged").notNull().default(false),
  flaggedReason: varchar("flaggedReason", { length: 512 }),
  gracePeriodEndsAt: timestamp("gracePeriodEndsAt"),
  restoredAt: timestamp("restoredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MonitoringCheck = typeof monitoringChecks.$inferSelect;
export type InsertMonitoringCheck = typeof monitoringChecks.$inferInsert;

// ============================================================================
// PAYMENTS & ESCROW
// ============================================================================

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaignId").notNull(),
  advertiserId: integer("advertiserId").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  platformFee: numeric("platformFee", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | completed | failed | refunded
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }).unique(),
  paymentMethod: varchar("paymentMethod", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

// ============================================================================
// PAYOUTS
// ============================================================================

export const payouts = pgTable("payouts", {
  id: serial("id").primaryKey(),
  rosterId: integer("rosterId").notNull(),
  creatorId: integer("creatorId").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | processing | completed | failed | cancelled
  stripeTransferId: varchar("stripeTransferId", { length: 255 }),
  releaseDate: timestamp("releaseDate"),
  completedAt: timestamp("completedAt"),
  failureReason: varchar("failureReason", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export type Payout = typeof payouts.$inferSelect;
export type InsertPayout = typeof payouts.$inferInsert;

// ============================================================================
// VYRAL MATCH SCORES
// ============================================================================

export const vyralMatchScores = pgTable("vyral_match_scores", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaignId").notNull(),
  creatorId: integer("creatorId").notNull(),
  nicheScore: numeric("nicheScore", { precision: 5, scale: 2 }).notNull(),
  engagementScore: numeric("engagementScore", { precision: 5, scale: 2 }).notNull(),
  tierScore: numeric("tierScore", { precision: 5, scale: 2 }).notNull(),
  totalScore: numeric("totalScore", { precision: 5, scale: 2 }).notNull(),
  aiEnhancedScore: numeric("aiEnhancedScore", { precision: 5, scale: 2 }),
  matchReason: text("matchReason").notNull().default(""),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export type VyralMatchScore = typeof vyralMatchScores.$inferSelect;
export type InsertVyralMatchScore = typeof vyralMatchScores.$inferInsert;

// ============================================================================
// CREATOR SUBSCRIPTIONS
// ============================================================================

export const creatorSubscriptions = pgTable("creator_subscriptions", {
  id: serial("id").primaryKey(),
  creatorId: integer("creatorId").notNull(),
  planType: varchar("planType", { length: 20 }).notNull().default("free"), // free | pro
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  autoRenew: boolean("autoRenew").notNull().default(true),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active | cancelled | expired
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export type CreatorSubscription = typeof creatorSubscriptions.$inferSelect;
export type InsertCreatorSubscription = typeof creatorSubscriptions.$inferInsert;

// ============================================================================
// DISPUTES
// ============================================================================

export const disputes = pgTable("disputes", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaignId").notNull(),
  rosterId: integer("rosterId"),
  advertiserId: integer("advertiserId").notNull(),
  creatorId: integer("creatorId"),
  reason: varchar("reason", { length: 255 }).notNull(),
  description: text("description"),
  evidence: jsonb("evidence"),
  status: varchar("status", { length: 20 }).notNull().default("open"), // open | in_review | resolved | closed
  resolution: text("resolution"),
  resolvedBy: integer("resolvedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export type Dispute = typeof disputes.$inferSelect;
export type InsertDispute = typeof disputes.$inferInsert;

// ============================================================================
// BACKGROUND JOBS
// ============================================================================

export const backgroundJobs = pgTable("background_jobs", {
  id: serial("id").primaryKey(),
  jobType: varchar("jobType", { length: 100 }).notNull(),
  targetId: integer("targetId"),
  targetType: varchar("targetType", { length: 100 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | processing | completed | failed
  data: jsonb("data"),
  result: jsonb("result"),
  error: text("error"),
  retryCount: integer("retryCount").notNull().default(0),
  maxRetries: integer("maxRetries").notNull().default(3),
  nextRetryAt: timestamp("nextRetryAt"),
  scheduledFor: timestamp("scheduledFor"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export type BackgroundJob = typeof backgroundJobs.$inferSelect;
export type InsertBackgroundJob = typeof backgroundJobs.$inferInsert;

// ============================================================================
// ADMIN LOGS
// ============================================================================

export const adminLogs = pgTable("admin_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("adminId").notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entityType", { length: 100 }),
  entityId: integer("entityId"),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdminLog = typeof adminLogs.$inferSelect;
export type InsertAdminLog = typeof adminLogs.$inferInsert;

// ============================================================================
// CAMPAIGN ANALYTICS
// ============================================================================

export const campaignAnalytics = pgTable("campaign_analytics", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaignId").notNull(),
  totalCreators: integer("totalCreators").notNull().default(0),
  acceptedCreators: integer("acceptedCreators").notNull().default(0),
  completedCreators: integer("completedCreators").notNull().default(0),
  totalBudget: numeric("totalBudget", { precision: 12, scale: 2 }).notNull(),
  totalSpent: numeric("totalSpent", { precision: 12, scale: 2 }).notNull().default("0"),
  totalEngagement: integer("totalEngagement").notNull().default(0),
  averageEngagementRate: numeric("averageEngagementRate", { precision: 5, scale: 2 }).notNull().default("0"),
  totalReach: integer("totalReach").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export type CampaignAnalytics = typeof campaignAnalytics.$inferSelect;
export type InsertCampaignAnalytics = typeof campaignAnalytics.$inferInsert;

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  relatedEntityType: varchar("relatedEntityType", { length: 100 }),
  relatedEntityId: integer("relatedEntityId"),
  isRead: boolean("isRead").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ============================================================================
// PORTFOLIO ITEMS
// ============================================================================

export const portfolioItems = pgTable("portfolio_items", {
  id: serial("id").primaryKey(),
  creatorId: integer("creatorId").notNull(),
  brand: varchar("brand", { length: 255 }),
  campaignTitle: varchar("campaignTitle", { length: 255 }).notNull(),
  platform: varchar("platform", { length: 30 }).notNull(),
  contentUrl: varchar("contentUrl", { length: 512 }),
  thumbnailUrl: varchar("thumbnailUrl", { length: 512 }),
  metrics: jsonb("metrics"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PortfolioItem = typeof portfolioItems.$inferSelect;
export type InsertPortfolioItem = typeof portfolioItems.$inferInsert;

// ============================================================================
// CONVERSATIONS & MESSAGES
// ============================================================================

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaignId").notNull(),
  advertiserId: integer("advertiserId").notNull(),   // users.id
  creatorId: integer("creatorId").notNull(),         // users.id
  lastMessageAt: timestamp("lastMessageAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversationId").notNull(),
  senderId: integer("senderId").notNull(),           // users.id
  content: text("content").notNull(),
  isRead: boolean("isRead").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
