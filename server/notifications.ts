/**
 * NOTIFICATION SYSTEM
 * Persists in-app notifications and stubs outbound email.
 * To wire a real email provider (e.g. Resend / SendGrid), replace the
 * sendEmail() stub below with your SDK call.
 */

import * as db from "./db";

export type NotificationType =
  | "violation_detected"
  | "violation_grace_expired"
  | "content_approved"
  | "content_auto_approved"
  | "revision_requested"
  | "payout_released"
  | "campaign_invitation"
  | "no_show_warning"
  | "draft_submitted"
  | "verification_approved"
  | "verification_rejected";

interface SendNotificationOptions {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
}

/**
 * Create an in-app notification record and fire the email stub.
 */
export async function sendNotification(opts: SendNotificationOptions): Promise<void> {
  try {
    await db.createNotification({
      userId: opts.userId,
      type: opts.type,
      title: opts.title,
      message: opts.message,
      relatedEntityType: opts.relatedEntityType ?? null,
      relatedEntityId: opts.relatedEntityId ?? null,
      isRead: false,
    });

    // Email stub — replace body with real email SDK call
    sendEmail(opts).catch((err) =>
      console.error("[Notifications] Email send failed:", err)
    );
  } catch (err) {
    // Never let notification failure block the main flow
    console.error("[Notifications] Failed to create notification:", err);
  }
}

/**
 * Email stub.
 * Wire a real provider here — example using Resend:
 *
 *   import { Resend } from "resend";
 *   const resend = new Resend(process.env.RESEND_API_KEY);
 *   await resend.emails.send({ from: "noreply@vyral.app", to: email, subject, html });
 */
async function sendEmail(opts: SendNotificationOptions): Promise<void> {
  // TODO: look up user email from DB and send via email provider
  console.log(`[Email stub] To userId=${opts.userId} | ${opts.title}: ${opts.message}`);
}

// ============================================================================
// Convenience helpers for the most common notification events
// ============================================================================

export async function notifyViolationDetected(
  creatorUserId: number,
  violations: string[],
  campaignId: number
): Promise<void> {
  await sendNotification({
    userId: creatorUserId,
    type: "violation_detected",
    title: "Action required — post compliance issue",
    message: `Your post was flagged for: ${violations.join(", ")}. You have 24 hours to restore it before a pro-rated clawback is triggered.`,
    relatedEntityType: "campaign",
    relatedEntityId: campaignId,
  });
}

export async function notifyGracePeriodExpired(
  creatorUserId: number,
  campaignId: number
): Promise<void> {
  await sendNotification({
    userId: creatorUserId,
    type: "violation_grace_expired",
    title: "Clawback triggered — grace period expired",
    message:
      "Your grace period expired without the post being restored. A pro-rated clawback has been applied to your pending payout.",
    relatedEntityType: "campaign",
    relatedEntityId: campaignId,
  });
}

export async function notifyContentApproved(
  creatorUserId: number,
  campaignId: number
): Promise<void> {
  await sendNotification({
    userId: creatorUserId,
    type: "content_approved",
    title: "Your draft was approved",
    message: "The advertiser approved your draft. Go ahead and post it, then submit the live link.",
    relatedEntityType: "campaign",
    relatedEntityId: campaignId,
  });
}

export async function notifyContentAutoApproved(
  creatorUserId: number,
  campaignId: number
): Promise<void> {
  await sendNotification({
    userId: creatorUserId,
    type: "content_auto_approved",
    title: "Draft auto-approved",
    message:
      "48 hours passed without a response from the advertiser — your draft has been auto-approved. You may now post and submit the live link.",
    relatedEntityType: "campaign",
    relatedEntityId: campaignId,
  });
}

export async function notifyRevisionRequested(
  creatorUserId: number,
  campaignId: number,
  notes: string
): Promise<void> {
  await sendNotification({
    userId: creatorUserId,
    type: "revision_requested",
    title: "Revision requested",
    message: `The advertiser has requested a revision: "${notes}"`,
    relatedEntityType: "campaign",
    relatedEntityId: campaignId,
  });
}

export async function notifyPayoutReleased(
  creatorUserId: number,
  amount: number,
  campaignId: number
): Promise<void> {
  await sendNotification({
    userId: creatorUserId,
    type: "payout_released",
    title: "Payout released",
    message: `$${amount.toFixed(2)} has been released to your account for campaign #${campaignId}.`,
    relatedEntityType: "campaign",
    relatedEntityId: campaignId,
  });
}

export async function notifyDraftSubmitted(
  advertiserUserId: number,
  campaignId: number
): Promise<void> {
  await sendNotification({
    userId: advertiserUserId,
    type: "draft_submitted",
    title: "New draft awaiting review",
    message:
      "A creator has submitted a draft for your campaign. You have 48 hours to review — after that it will be auto-approved.",
    relatedEntityType: "campaign",
    relatedEntityId: campaignId,
  });
}

export async function notifyNoShow(
  advertiserUserId: number,
  creatorId: number,
  campaignId: number
): Promise<void> {
  await sendNotification({
    userId: advertiserUserId,
    type: "no_show_warning",
    title: "Creator no-show detected",
    message: `Creator #${creatorId} missed their campaign deadline. Their slot will be refunded from escrow within 48 hours.`,
    relatedEntityType: "campaign",
    relatedEntityId: campaignId,
  });
}

export async function notifyVerificationApproved(creatorUserId: number): Promise<void> {
  await sendNotification({
    userId: creatorUserId,
    type: "verification_approved",
    title: "You're verified! ✓",
    message: "Congratulations! Your Vyral account has been verified. You can now apply to campaigns.",
  });
}

export async function notifyVerificationRejected(creatorUserId: number, reason?: string): Promise<void> {
  await sendNotification({
    userId: creatorUserId,
    type: "verification_rejected",
    title: "Verification not approved",
    message: reason
      ? `Your verification request was not approved. Reason: ${reason}. You may reapply after addressing the feedback.`
      : "Your verification request was not approved. You may reapply after reviewing our creator guidelines.",
  });
}
