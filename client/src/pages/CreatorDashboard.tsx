import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { toast } from "sonner";
import { useState } from "react";
import { ArrowRight, Lock, MessageSquare, AlertCircle, Check, X, Upload, ExternalLink } from "lucide-react";

const statusColors: Record<string, string> = {
  active:  "text-signal",
  draft:   "text-gold",
  pending: "text-muted-foreground",
  ended:   "text-muted-foreground",
};

const statusDots: Record<string, string> = {
  active:  "bg-signal",
  draft:   "bg-gold",
  pending: "bg-muted-foreground",
  ended:   "bg-muted-foreground",
};

// ── Modals ────────────────────────────────────────────────────────────────────
type DraftModal = { rosterId: number; mode: "submit" | "resubmit"; submissionId?: number };
type LiveModal  = { submissionId: number };

export default function CreatorDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: profile } = trpc.creator.getProfile.useQuery();
  const { data: earnings } = trpc.creator.getEarnings.useQuery();
  const { data: openCampaigns } = trpc.creator.getAvailableCampaigns.useQuery({ limit: 6 });
  const { data: myRoster, refetch: refetchRoster } = trpc.creator.getMyRosterEntries.useQuery();
  const { data: mySubmissions, refetch: refetchSubmissions } = trpc.creator.getMySubmissions.useQuery();

  const [draftModal, setDraftModal] = useState<DraftModal | null>(null);
  const [draftUrl, setDraftUrl] = useState("");
  const [draftThumb, setDraftThumb] = useState("");
  const [liveModal, setLiveModal] = useState<LiveModal | null>(null);
  const [liveUrl, setLiveUrl] = useState("");
  const [liveScreenshot, setLiveScreenshot] = useState("");

  const totalEarnings = earnings?.totalEarnings ?? 0;
  const pendingEarnings = earnings?.pendingEarnings ?? 0;
  const availableEarnings = Math.max(0, totalEarnings - pendingEarnings);
  const vyralScore = Number(profile?.vyralScore ?? 0);
  const displayName = profile?.displayName ?? user?.name ?? "Creator";

  const startConversation = trpc.messaging.startConversation.useMutation({
    onSuccess: () => setLocation("/messages"),
  });

  const applyToCampaign = trpc.creator.applyCampaign.useMutation({
    onSuccess: () => toast.success("Application submitted!"),
    onError: (err) => toast.error(err.message),
  });

  const acceptCampaign = trpc.creator.acceptCampaign.useMutation({
    onSuccess: () => { toast.success("Campaign accepted!"); refetchRoster(); },
    onError: (err) => toast.error(err.message),
  });

  const declineCampaign = trpc.creator.declineCampaign.useMutation({
    onSuccess: () => { toast.success("Invitation declined."); refetchRoster(); },
    onError: (err) => toast.error(err.message),
  });

  const submitDraft = trpc.creator.submitDraft.useMutation({
    onSuccess: () => {
      toast.success("Draft submitted! The brand will review it.");
      setDraftModal(null); setDraftUrl(""); setDraftThumb("");
      refetchSubmissions();
    },
    onError: (err) => toast.error(err.message),
  });

  const resubmitDraft = trpc.creator.resubmitDraft.useMutation({
    onSuccess: () => {
      toast.success("Revised draft submitted!");
      setDraftModal(null); setDraftUrl(""); setDraftThumb("");
      refetchSubmissions();
    },
    onError: (err) => toast.error(err.message),
  });

  const submitLivePost = trpc.creator.submitLivePost.useMutation({
    onSuccess: ({ verificationStatus }) => {
      toast.success(verificationStatus === "verified" ? "Live post verified! Payout queued." : "Live post submitted — verification pending.");
      setLiveModal(null); setLiveUrl(""); setLiveScreenshot("");
      refetchSubmissions();
    },
    onError: (err) => toast.error(err.message),
  });

  const submitForVerification = trpc.creator.submitForVerification.useMutation({
    onSuccess: () => toast.success("Submitted for verification. We'll review your profile shortly."),
    onError: (err) => toast.error(err.message),
  });

  // Build a quick lookup: rosterId → latest submission
  const submissionByRoster = (mySubmissions ?? []).reduce<Record<number, any>>((acc, s: any) => {
    if (!acc[s.rosterId] || new Date(s.createdAt) > new Date(acc[s.rosterId].createdAt)) {
      acc[s.rosterId] = s;
    }
    return acc;
  }, {});

  function handleApply(campaignId: number) {
    if (profile?.verificationStatus !== "verified") {
      toast.error("You must be verified to apply to campaigns.");
      return;
    }
    applyToCampaign.mutate({ campaignId });
  }

  function handleDraftSubmit() {
    if (!draftUrl.trim()) { toast.error("Enter a draft URL"); return; }
    if (!draftModal) return;
    if (draftModal.mode === "resubmit" && draftModal.submissionId) {
      resubmitDraft.mutate({ submissionId: draftModal.submissionId, draftUrl, draftThumbnailUrl: draftThumb || undefined });
    } else {
      submitDraft.mutate({ rosterId: draftModal.rosterId, draftUrl, draftThumbnailUrl: draftThumb || undefined });
    }
  }

  function handleLiveSubmit() {
    if (!liveUrl.trim()) { toast.error("Enter the live post URL"); return; }
    if (!liveModal) return;
    submitLivePost.mutate({ submissionId: liveModal.submissionId, livePostUrl: liveUrl, livePostScreenshot: liveScreenshot });
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="mb-4 md:mb-8">
          <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase mb-1">Welcome</p>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-4xl md:text-5xl tracking-wider text-foreground">{displayName}</h1>
            {profile?.verificationStatus === "verified" && (
              <span className="font-mono text-[8px] rounded px-2 py-1 tracking-widest bg-signal/20 text-signal border border-signal/40">
                VERIFIED ✓
              </span>
            )}
            {profile?.verificationStatus === "pending" && (
              <span className="font-mono text-[8px] rounded px-2 py-1 tracking-widest bg-gold/20 text-gold border border-gold/40">
                PENDING REVIEW
              </span>
            )}
            {profile?.verificationStatus === "rejected" && (
              <span className="font-mono text-[8px] rounded px-2 py-1 tracking-widest bg-primary/10 text-primary border border-primary/40">
                NOT VERIFIED — REAPPLY
              </span>
            )}
          </div>
        </div>

        {/* Top Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          {/* Earnings Card — wide */}
          <div className="md:col-span-2 bg-card border border-border rounded-lg p-4 md:p-6">
            <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-2">CUMULATIVE EARNINGS</p>
            <div className="flex items-baseline gap-3 mb-4">
              <p className="font-mono text-5xl text-signal font-bold">₦{totalEarnings.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
              <div>
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-1">AVAILABLE FOR PAYOUT</p>
                <p className="font-mono text-xl text-foreground font-bold">₦{availableEarnings.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-1">PENDING CLEARANCE</p>
                <p className="font-mono text-xl text-muted-foreground font-bold">₦{pendingEarnings.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          {/* Vyral Score Card */}
          <div className="bg-card border border-border rounded-lg p-6 flex flex-col items-center justify-center">
            <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-4">VYRAL SCORE</p>
            {/* Circular progress ring */}
            <div className="relative w-24 h-24 mb-4">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="40" fill="none" stroke="#222" strokeWidth="6" />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  fill="none"
                  stroke="#FF3C5F"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${(vyralScore / 100) * 251.2} 251.2`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="font-mono text-2xl text-foreground font-bold leading-none">{vyralScore}</p>
                <p className="font-mono text-[9px] text-muted-foreground">/100</p>
              </div>
            </div>
            <span className="font-mono text-[8px] text-primary border border-primary/40 rounded px-2 py-0.5 tracking-widest">
              TOP 1% CREATOR
            </span>
          </div>
        </div>

        {/* Verification Banner */}
        {profile && profile.verificationStatus !== "verified" && (
          <div className={`mb-6 rounded-lg border p-4 flex items-start gap-3 ${
            profile.verificationStatus === "pending"
              ? "bg-gold/5 border-gold/30"
              : profile.verificationStatus === "rejected"
              ? "bg-destructive/5 border-destructive/30"
              : "bg-primary/5 border-primary/30"
          }`}>
            <AlertCircle className={`w-4 h-4 mt-0.5 shrink-0 ${
              profile.verificationStatus === "pending" ? "text-gold" :
              profile.verificationStatus === "rejected" ? "text-destructive" : "text-primary"
            }`} />
            <div className="flex-1 min-w-0">
              {profile.verificationStatus === "pending" ? (
                <>
                  <p className="font-mono text-xs font-bold tracking-widest text-gold mb-0.5">VERIFICATION PENDING</p>
                  <p className="font-mono text-[9px] text-muted-foreground">Your profile is under review. You'll be notified once approved.</p>
                </>
              ) : profile.verificationStatus === "rejected" ? (
                <>
                  <p className="font-mono text-xs font-bold tracking-widest text-destructive mb-0.5">VERIFICATION REJECTED</p>
                  <p className="font-mono text-[9px] text-muted-foreground mb-2">
                    {(profile as any).verificationRejectionReason ?? "Your verification was not approved. Please update your profile and reapply."}
                  </p>
                  <button
                    onClick={() => submitForVerification.mutate()}
                    disabled={submitForVerification.isPending}
                    className="font-mono text-[9px] text-primary border border-primary/40 rounded px-2 py-1 hover:bg-primary/10 transition-colors disabled:opacity-50"
                  >
                    {submitForVerification.isPending ? "SUBMITTING…" : "REAPPLY FOR VERIFICATION"}
                  </button>
                </>
              ) : (
                <>
                  <p className="font-mono text-xs font-bold tracking-widest text-primary mb-0.5">GET VERIFIED</p>
                  <p className="font-mono text-[9px] text-muted-foreground mb-2">Verify your account to apply to campaigns and unlock full platform access.</p>
                  <button
                    onClick={() => submitForVerification.mutate()}
                    disabled={submitForVerification.isPending}
                    className="font-mono text-[9px] text-primary border border-primary/40 rounded px-2 py-1 hover:bg-primary/10 transition-colors disabled:opacity-50"
                  >
                    {submitForVerification.isPending ? "SUBMITTING…" : "SUBMIT FOR VERIFICATION"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Open Campaigns / Gigs */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-xs text-foreground tracking-widest font-bold uppercase">OPEN CAMPAIGNS</h2>
            <button
              onClick={() => setLocation("/creator/marketplace")}
              className="flex items-center gap-1.5 font-mono text-[9px] text-primary tracking-widest hover:underline"
            >
              VIEW ALL <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {!openCampaigns || openCampaigns.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-lg p-10 text-center">
              <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase mb-1">NO OPEN CAMPAIGNS YET</p>
              <p className="text-sm text-muted-foreground">Check back soon — brands will post gigs here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {openCampaigns.slice(0, 3).map((gig) => (
                <div
                  key={gig.id}
                  className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors flex flex-col gap-3 cursor-pointer"
                  onClick={() => setLocation(`/creator/campaigns/${gig.id}`)}
                >
                  {/* Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[7px] border border-border rounded px-1.5 py-0.5 text-muted-foreground tracking-widest uppercase">{gig.category}</span>
                    <span className="font-mono text-[7px] border border-border rounded px-1.5 py-0.5 text-muted-foreground tracking-widest uppercase">{gig.contentType?.replace("_"," ")}</span>
                    <span className="font-mono text-[8px] text-signal border border-signal/30 rounded px-1.5 py-0.5 ml-auto">₦{Number(gig.budget).toLocaleString()}</span>
                  </div>
                  {/* Title + desc */}
                  <div>
                    <h3 className="font-display text-lg tracking-wider text-foreground uppercase mb-1 hover:text-primary transition-colors">{gig.title}</h3>
                    <p className="font-mono text-[9px] text-muted-foreground leading-relaxed line-clamp-2">{gig.description ?? "No description provided."}</p>
                  </div>
                  {/* Deadline */}
                  <p className="font-mono text-[8px] text-muted-foreground">
                    Deadline: {new Date(gig.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                  {/* Actions */}
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleApply(gig.id)}
                      disabled={applyToCampaign.isPending}
                      className="flex-1 py-2 bg-primary text-primary-foreground font-mono text-[8px] tracking-widest rounded hover:bg-primary/90 transition-colors disabled:opacity-60"
                    >
                      {profile?.verificationStatus !== "verified" ? (
                        <span className="flex items-center justify-center gap-1"><Lock className="w-3 h-3" /> APPLY</span>
                      ) : "APPLY"}
                    </button>
                    <button
                      onClick={() => setLocation(`/creator/campaigns/${gig.id}`)}
                      className="px-3 py-2 border border-border font-mono text-[8px] tracking-widest text-muted-foreground hover:border-foreground hover:text-foreground rounded transition-colors"
                    >
                      VIEW →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Campaigns table — roster entries */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-mono text-xs text-foreground tracking-widest font-bold uppercase">MY CAMPAIGNS</h2>
          </div>

          {!myRoster || myRoster.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase mb-1">NOT YET ON ANY CAMPAIGNS</p>
              <p className="text-sm text-muted-foreground">Apply to open campaigns above to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {myRoster.map((entry: any) => {
                const sub = submissionByRoster[entry.id];
                const fee = Number(entry.creatorFee ?? 0);

                return (
                  <div key={entry.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      {/* Campaign name + meta */}
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs text-foreground font-bold uppercase truncate mb-1">
                          {entry.campaign?.title ?? "—"}
                        </p>
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDots[entry.status] ?? "bg-muted-foreground"}`} />
                            <span className={`font-mono text-[9px] tracking-widest uppercase ${statusColors[entry.status] ?? "text-muted-foreground"}`}>{entry.status}</span>
                          </div>
                          {fee > 0 && (
                            <span className="font-mono text-[9px] text-signal">₦{fee.toLocaleString()} FEE</span>
                          )}
                          {entry.campaign?.deadline && (
                            <span className="font-mono text-[9px] text-muted-foreground">
                              Due {new Date(entry.campaign.deadline).toLocaleDateString()}
                            </span>
                          )}
                          {/* Submission status */}
                          {sub && (
                            <span className={`font-mono text-[8px] border rounded px-1.5 py-0.5 tracking-widest ${
                              sub.draftStatus === "approved"            ? "text-signal border-signal/40" :
                              sub.draftStatus === "revision_requested"  ? "text-gold border-gold/40" :
                              sub.draftStatus === "pending"             ? "text-muted-foreground border-border" :
                              "text-muted-foreground border-border"
                            }`}>
                              DRAFT: {sub.draftStatus?.replace(/_/g, " ").toUpperCase()}
                            </span>
                          )}
                          {sub?.livePostUrl && (
                            <span className={`font-mono text-[8px] border rounded px-1.5 py-0.5 tracking-widest ${
                              sub.livePostStatus === "verified" ? "text-signal border-signal/40" : "text-gold border-gold/40"
                            }`}>
                              LIVE: {sub.livePostStatus?.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        {/* Invited → Accept / Decline */}
                        {entry.status === "invited" && (
                          <>
                            <button
                              onClick={() => acceptCampaign.mutate({ rosterId: entry.id })}
                              disabled={acceptCampaign.isPending}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-signal/10 border border-signal/40 text-signal font-mono text-[8px] tracking-widest rounded hover:bg-signal/20 transition-colors disabled:opacity-50"
                            >
                              <Check className="w-3 h-3" /> ACCEPT
                            </button>
                            <button
                              onClick={() => declineCampaign.mutate({ rosterId: entry.id })}
                              disabled={declineCampaign.isPending}
                              className="px-2.5 py-1.5 border border-destructive/40 text-destructive font-mono text-[8px] tracking-widest rounded hover:bg-destructive/10 transition-colors disabled:opacity-50"
                            >
                              DECLINE
                            </button>
                          </>
                        )}

                        {/* Accepted + no submission yet → Submit Draft */}
                        {entry.status === "accepted" && !sub && (
                          <button
                            onClick={() => { setDraftModal({ rosterId: entry.id, mode: "submit" }); setDraftUrl(""); setDraftThumb(""); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 border border-primary/40 text-primary font-mono text-[8px] tracking-widest rounded hover:bg-primary/20 transition-colors"
                          >
                            <Upload className="w-3 h-3" /> SUBMIT DRAFT
                          </button>
                        )}

                        {/* Revision requested → Resubmit */}
                        {sub?.draftStatus === "revision_requested" && (
                          <button
                            onClick={() => { setDraftModal({ rosterId: entry.id, mode: "resubmit", submissionId: sub.id }); setDraftUrl(""); setDraftThumb(""); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-gold/10 border border-gold/40 text-gold font-mono text-[8px] tracking-widest rounded hover:bg-gold/20 transition-colors"
                          >
                            <Upload className="w-3 h-3" /> RESUBMIT
                          </button>
                        )}

                        {/* Draft approved + no live post yet → Submit Live Post */}
                        {sub?.draftStatus === "approved" && !sub?.livePostUrl && (
                          <button
                            onClick={() => { setLiveModal({ submissionId: sub.id }); setLiveUrl(""); setLiveScreenshot(""); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-signal/10 border border-signal/40 text-signal font-mono text-[8px] tracking-widest rounded hover:bg-signal/20 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" /> SUBMIT LIVE POST
                          </button>
                        )}

                        {/* Message brand */}
                        <button
                          onClick={() => startConversation.mutate({ campaignId: entry.campaignId })}
                          disabled={startConversation.isPending}
                          title="Message brand"
                          className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Revision notes from advertiser */}
                    {sub?.advertiserNotes && sub.draftStatus === "revision_requested" && (
                      <div className="mt-3 border-l-2 border-gold pl-3">
                        <p className="font-mono text-[8px] text-gold tracking-widest mb-1">REVISION NOTES FROM BRAND</p>
                        <p className="font-mono text-[9px] text-foreground">{sub.advertiserNotes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Draft Submit / Resubmit Modal */}
      {draftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-xs text-foreground font-bold tracking-widest">
                {draftModal.mode === "resubmit" ? "RESUBMIT REVISED DRAFT" : "SUBMIT DRAFT CONTENT"}
              </p>
              <button onClick={() => setDraftModal(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="font-mono text-[9px] text-muted-foreground mb-4">
              Paste a link to your draft content (Google Drive, Dropbox, WeTransfer, etc.). Make sure it's publicly viewable.
            </p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase block mb-1.5">DRAFT URL *</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={draftUrl}
                  onChange={(e) => setDraftUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50"
                />
              </div>
              <div>
                <label className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase block mb-1.5">THUMBNAIL URL (optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={draftThumb}
                  onChange={(e) => setDraftThumb(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDraftSubmit}
                disabled={submitDraft.isPending || resubmitDraft.isPending}
                className="flex-1 py-2 bg-primary text-primary-foreground font-mono text-[9px] tracking-widest rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {(submitDraft.isPending || resubmitDraft.isPending) ? "SUBMITTING…" : "SUBMIT"}
              </button>
              <button onClick={() => setDraftModal(null)} className="px-4 py-2 border border-border font-mono text-[9px] text-muted-foreground hover:text-foreground rounded">
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Post Modal */}
      {liveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-xs text-foreground font-bold tracking-widest">SUBMIT LIVE POST</p>
              <button onClick={() => setLiveModal(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="font-mono text-[9px] text-muted-foreground mb-4">
              Your draft has been approved. Paste the live post URL after you publish it. The platform will verify it's publicly accessible.
            </p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase block mb-1.5">LIVE POST URL *</label>
                <input
                  type="url"
                  placeholder="https://instagram.com/p/..."
                  value={liveUrl}
                  onChange={(e) => setLiveUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50"
                />
              </div>
              <div>
                <label className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase block mb-1.5">SCREENSHOT URL (optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={liveScreenshot}
                  onChange={(e) => setLiveScreenshot(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleLiveSubmit}
                disabled={submitLivePost.isPending}
                className="flex-1 py-2 bg-signal text-background font-mono text-[9px] tracking-widest rounded hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitLivePost.isPending ? "SUBMITTING…" : "SUBMIT LIVE POST"}
              </button>
              <button onClick={() => setLiveModal(null)} className="px-4 py-2 border border-border font-mono text-[9px] text-muted-foreground hover:text-foreground rounded">
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
