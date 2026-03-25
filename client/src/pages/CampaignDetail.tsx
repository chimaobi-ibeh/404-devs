import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Eye, Flag, Filter, MessageSquare, CreditCard, CheckCircle2, XCircle, X, Check } from "lucide-react";
import { toast } from "sonner";

type TabKey = "ROSTER" | "CONTENT" | "ANALYTICS" | "PAYOUTS";

const statusColor: Record<string, string> = {
  invited: "text-muted-foreground",
  applied: "text-gold",
  accepted: "text-signal",
  declined: "text-destructive",
  completed: "text-primary",
};

const statusDot: Record<string, string> = {
  invited: "bg-muted-foreground",
  applied: "bg-gold",
  accepted: "bg-signal",
  declined: "bg-destructive",
  completed: "bg-primary",
};

export default function CampaignDetail() {
  const [, params] = useRoute("/brand/campaigns/:id");
  const campaignId = params?.id ? parseInt(params.id) : 0;
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabKey>("ROSTER");
  const [paymentBanner, setPaymentBanner] = useState<"success" | "failed" | null>(null);
  const [disputeModal, setDisputeModal] = useState<{ rosterId?: number } | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDesc, setDisputeDesc] = useState("");
  const [acceptModal, setAcceptModal] = useState<{ rosterId: number; creatorId: number } | null>(null);
  const [acceptFee, setAcceptFee] = useState("");

  // Read ?payment= query param set by the Interswitch callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("payment");
    if (p === "success" || p === "failed") {
      setPaymentBanner(p);
      // Clean the URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const { data: campaign, isLoading, refetch: refetchCampaign } = trpc.advertiser.getCampaign.useQuery({ id: campaignId });
  const { data: roster } = trpc.advertiser.getCampaignRoster.useQuery({ campaignId }, { enabled: !!campaignId });
  const { data: analytics } = trpc.advertiser.getCampaignAnalytics.useQuery({ campaignId }, { enabled: !!campaignId });
  const { data: contentSubmissions = [] } = trpc.advertiser.getContentSubmissions.useQuery({ campaignId }, { enabled: !!campaignId && activeTab === "CONTENT" });

  const launchCampaign = trpc.advertiser.launchCampaign.useMutation({
    onSuccess: () => { refetchCampaign(); },
    onError: (e) => toast.error(e.message),
  });

  const fundCampaign = trpc.advertiser.fundCampaign.useMutation({
    onSuccess: ({ redirectUrl }) => {
      window.location.href = redirectUrl;
    },
    onError: (e) => toast.error(e.message),
  });

  const startConversation = trpc.messaging.startConversation.useMutation({
    onSuccess: () => setLocation("/messages"),
  });

  const { refetch: refetchRoster } = trpc.advertiser.getCampaignRoster.useQuery({ campaignId }, { enabled: !!campaignId });

  const acceptRoster = trpc.advertiser.acceptRosterEntry.useMutation({
    onSuccess: () => {
      toast.success("Creator accepted!");
      setAcceptModal(null);
      setAcceptFee("");
      refetchRoster();
    },
    onError: (e) => toast.error(e.message),
  });

  const declineRoster = trpc.advertiser.declineRosterEntry.useMutation({
    onSuccess: () => { toast.success("Creator declined."); refetchRoster(); },
    onError: (e) => toast.error(e.message),
  });

  const createDispute = trpc.advertiser.createDispute.useMutation({
    onSuccess: () => {
      toast.success("Dispute filed. Admin will review within 24 hours.");
      setDisputeModal(null);
      setDisputeReason("");
      setDisputeDesc("");
    },
    onError: (e) => toast.error(e.message),
  });

  const tabs: TabKey[] = ["ROSTER", "CONTENT", "ANALYTICS", "PAYOUTS"];

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-8 space-y-4">
          <div className="h-10 w-64 bg-muted animate-pulse rounded" />
          <div className="h-6 w-40 bg-muted animate-pulse rounded" />
        </div>
      </AppLayout>
    );
  }

  if (!campaign) {
    return (
      <AppLayout>
        <div className="p-8 font-mono text-sm text-muted-foreground">CAMPAIGN NOT FOUND</div>
      </AppLayout>
    );
  }

  const campaignSlug = campaign.title.toUpperCase().replace(/\s+/g, "_");

  return (
    <AppLayout>
      <div className="p-8">
        {/* Payment banner */}
        {paymentBanner === "success" && (
          <div className="flex items-center gap-3 mb-6 p-4 bg-signal/10 border border-signal/30 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-signal shrink-0" />
            <p className="font-mono text-xs text-signal tracking-widest">PAYMENT SUCCESSFUL — CAMPAIGN IS NOW LIVE</p>
            <button onClick={() => setPaymentBanner(null)} className="ml-auto text-signal/60 hover:text-signal">✕</button>
          </div>
        )}
        {paymentBanner === "failed" && (
          <div className="flex items-center gap-3 mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <XCircle className="w-4 h-4 text-destructive shrink-0" />
            <p className="font-mono text-xs text-destructive tracking-widest">PAYMENT FAILED — PLEASE TRY AGAIN</p>
            <button onClick={() => setPaymentBanner(null)} className="ml-auto text-destructive/60 hover:text-destructive">✕</button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-[9px] text-signal border border-signal/40 rounded px-2 py-0.5 tracking-widest uppercase">
                ● OPERATIONAL
              </span>
              <span className="font-mono text-[9px] text-muted-foreground tracking-widest">
                CID: VY-{campaignId.toString().padStart(3, "0")}-QX
              </span>
            </div>
            <h1 className="font-display text-5xl tracking-wider text-foreground">{campaignSlug}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation(`/brand/campaigns/${campaignId}/edit`)}
              className="px-4 py-2 border border-border font-mono text-xs tracking-widest text-muted-foreground hover:border-foreground hover:text-foreground transition-colors rounded"
            >
              EDIT CAMPAIGN
            </button>
            {campaign.status === "draft" && (
              <button
                onClick={() => {
                  const callbackUrl = `${window.location.origin}/api/payment/callback`;
                  fundCampaign.mutate({ campaignId, callbackUrl });
                }}
                disabled={fundCampaign.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-mono text-xs tracking-widest rounded hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                <CreditCard className="w-3.5 h-3.5" />
                {fundCampaign.isPending ? "REDIRECTING…" : "FUND & LAUNCH"}
              </button>
            )}
            {campaign.status === "active" && (
              <span className="px-4 py-2 font-mono text-xs tracking-widest text-signal border border-signal/40 rounded">
                ● LIVE
              </span>
            )}
            {campaign.status !== "draft" && campaign.status !== "active" && (
              <span className="px-4 py-2 font-mono text-xs tracking-widest text-muted-foreground border border-border rounded uppercase">
                {campaign.status}
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-border mb-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 font-mono text-xs tracking-widest transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? "text-foreground border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Main Panel */}
          <div className="lg:col-span-2">
            {activeTab === "ROSTER" && (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <h2 className="font-mono text-xs text-foreground tracking-widest font-bold">
                    ACTIVE_ROSTER <span className="text-muted-foreground">[{roster?.length ?? 0}]</span>
                  </h2>
                  <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                    <Filter className="w-3 h-3" />
                    <span className="font-mono text-[9px] tracking-widest">FILTER</span>
                  </button>
                </div>

                {/* Table header */}
                <div className="grid grid-cols-4 px-5 py-2 border-b border-border">
                  {["CREATOR", "STATUS", "FEE", "ACTIONS"].map((h) => (
                    <p key={h} className="font-mono text-[8px] text-muted-foreground tracking-widest uppercase">{h}</p>
                  ))}
                </div>

                {/* Table rows */}
                {roster && roster.length > 0 ? (
                  <div className="divide-y divide-border">
                    {roster.map((entry) => (
                      <div key={entry.id} className="grid grid-cols-4 items-center px-5 py-3.5">
                        {/* Creator */}
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                            <span className="font-mono text-[8px] text-muted-foreground">
                              {entry.creatorId}
                            </span>
                          </div>
                          <div>
                            <p className="font-mono text-xs text-foreground font-bold">Creator #{entry.creatorId}</p>
                            <span className="font-mono text-[8px] text-muted-foreground border border-border/50 rounded px-1">
                              {entry.castingMode}
                            </span>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot[entry.status] ?? "bg-muted-foreground"}`} />
                          <span className={`font-mono text-[9px] tracking-widest ${statusColor[entry.status] ?? "text-muted-foreground"}`}>
                            {entry.status.toUpperCase()}
                          </span>
                        </div>

                        {/* Fee */}
                        <p className="font-mono text-sm text-foreground font-bold">₦{entry.creatorFee}</p>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {(entry.status === "applied" || entry.status === "invited") && (
                            <>
                              <button
                                onClick={() => setAcceptModal({ rosterId: entry.id, creatorId: entry.creatorId })}
                                className="flex items-center gap-1 px-2 py-1 bg-signal/10 border border-signal/40 text-signal font-mono text-[8px] tracking-widest rounded hover:bg-signal/20 transition-colors"
                              >
                                <Check className="w-3 h-3" /> ACCEPT
                              </button>
                              <button
                                onClick={() => declineRoster.mutate({ rosterId: entry.id })}
                                disabled={declineRoster.isPending}
                                className="px-2 py-1 border border-destructive/40 text-destructive font-mono text-[8px] tracking-widest rounded hover:bg-destructive/10 transition-colors disabled:opacity-40"
                              >
                                DECLINE
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setLocation(`/creator/profile/${entry.creatorId}`)}
                            title="View profile"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => startConversation.mutate({ campaignId, creatorProfileId: entry.creatorId })}
                            disabled={startConversation.isPending}
                            title="Message creator"
                            className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Report / open dispute"
                            onClick={() => setDisputeModal({ rosterId: entry.id })}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-8 text-center">
                    <p className="font-mono text-xs text-muted-foreground">No creators in roster yet.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "CONTENT" && (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h2 className="font-mono text-xs text-foreground tracking-widest font-bold">
                    CONTENT_SUBMISSIONS <span className="text-muted-foreground">[{contentSubmissions.length}]</span>
                  </h2>
                </div>
                {contentSubmissions.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <p className="font-mono text-xs text-muted-foreground">No content submissions yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {contentSubmissions.map((sub: any) => (
                      <div key={sub.id} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-xs font-bold text-foreground">Creator #{sub.creatorId}</span>
                              <span className={`font-mono text-[8px] border rounded px-1.5 py-0.5 tracking-widest uppercase ${
                                sub.draftStatus === "approved" ? "text-signal border-signal/40" :
                                sub.draftStatus === "revision_requested" ? "text-gold border-gold/40" :
                                "text-muted-foreground border-border"
                              }`}>{sub.draftStatus?.replace("_", " ") ?? "PENDING"}</span>
                            </div>
                            {sub.contentUrl && (
                              <a href={sub.contentUrl} target="_blank" rel="noopener noreferrer"
                                className="font-mono text-[9px] text-primary hover:underline break-all">
                                {sub.contentUrl}
                              </a>
                            )}
                            {sub.notes && (
                              <p className="font-mono text-[9px] text-muted-foreground mt-1">{sub.notes}</p>
                            )}
                          </div>
                          <p className="font-mono text-[8px] text-muted-foreground shrink-0">
                            {new Date(sub.submittedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "ANALYTICS" && (
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="font-mono text-xs text-foreground tracking-widest font-bold mb-4">ANALYTICS</h2>
                {analytics ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">Total Creators</p>
                      <p className="font-mono text-2xl text-foreground font-bold">{analytics.totalCreators}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">Accepted</p>
                      <p className="font-mono text-2xl text-signal font-bold">{analytics.acceptedCreators}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">Completed</p>
                      <p className="font-mono text-2xl text-primary font-bold">{analytics.completedCreators}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">Total Spent</p>
                      <p className="font-mono text-2xl text-foreground font-bold">₦{analytics.totalSpent}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">Total Budget</p>
                      <p className="font-mono text-2xl text-foreground font-bold">₦{analytics.totalBudget}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">Avg Engagement</p>
                      <p className="font-mono text-2xl text-foreground font-bold">{analytics.averageEngagementRate}%</p>
                    </div>
                  </div>
                ) : (
                  <p className="font-mono text-xs text-muted-foreground">No analytics data available yet.</p>
                )}
              </div>
            )}

            {activeTab === "PAYOUTS" && (
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="font-mono text-xs text-foreground tracking-widest font-bold mb-4">PAYOUTS</h2>
                <p className="font-mono text-xs text-muted-foreground">No payouts processed yet.</p>
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="space-y-4">
            {/* Stats */}
            <div className="bg-card border border-border rounded-lg p-5 space-y-4">
              <div>
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-1">TOTAL REACH</p>
                <p className="font-mono text-2xl text-foreground font-bold">{analytics?.totalReach ?? "—"}</p>
              </div>
              <div className="h-px bg-border" />
              <div>
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-1">COMPLETION</p>
                <p className="font-mono text-2xl text-signal font-bold">
                  {analytics
                    ? `${Math.round((analytics.completedCreators / Math.max(analytics.totalCreators, 1)) * 100)}% COMPLETE`
                    : "—"}
                </p>
              </div>
              <div className="h-px bg-border" />
              <div>
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-1">BUDGET</p>
                <p className="font-mono text-xl text-foreground font-bold">₦{campaign.budget}</p>
              </div>
              <div>
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-1">STATUS</p>
                <p className="font-mono text-xs text-foreground capitalize">{campaign.status}</p>
              </div>
            </div>

            {/* Campaign Info */}
            <div className="bg-black/50 rounded border border-border p-4">
              <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-3 uppercase">CAMPAIGN_INFO</p>
              <div className="space-y-1">
                <p className="font-mono text-[9px] text-muted-foreground">Status: <span className="text-foreground">{campaign.status.toUpperCase()}</span></p>
                <p className="font-mono text-[9px] text-muted-foreground">Mode: <span className="text-foreground">{campaign.castingMode}</span></p>
                <p className="font-mono text-[9px] text-muted-foreground">Deadline: <span className="text-foreground">{new Date(campaign.deadline).toLocaleDateString()}</span></p>
                {campaign.postingWindowStart && (
                  <p className="font-mono text-[9px] text-muted-foreground">Post from: <span className="text-foreground">{new Date(campaign.postingWindowStart).toLocaleDateString()}</span></p>
                )}
                {campaign.postingWindowEnd && (
                  <p className="font-mono text-[9px] text-muted-foreground">Post until: <span className="text-foreground">{new Date(campaign.postingWindowEnd).toLocaleDateString()}</span></p>
                )}
                {campaign.deliverables && (
                  <p className="font-mono text-[9px] text-muted-foreground mt-2">Deliverables: <span className="text-foreground">{campaign.deliverables}</span></p>
                )}
              </div>
            </div>

            {/* Find Creators button */}
            <button
              onClick={() => setLocation(`/brand/vyral-match/${campaignId}`)}
              className="w-full py-2.5 bg-primary text-primary-foreground font-mono text-xs tracking-widest rounded hover:bg-primary/90 transition-colors"
            >
              FIND CREATORS (VYRAL MATCH)
            </button>
          </div>
        </div>
      </div>

      {/* Accept Creator Modal */}
      {acceptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-xs text-foreground font-bold tracking-widest">ACCEPT CREATOR</p>
              <button onClick={() => { setAcceptModal(null); setAcceptFee(""); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="font-mono text-[9px] text-muted-foreground mb-4">
              Set the fee you'll pay this creator for completing the campaign deliverables.
            </p>
            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">₦</span>
              <input
                type="number"
                min="1"
                placeholder="e.g. 25000"
                value={acceptFee}
                onChange={(e) => setAcceptFee(e.target.value)}
                className="w-full pl-7 pr-3 py-2 bg-background border border-border rounded font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const fee = parseFloat(acceptFee);
                  if (!fee || fee <= 0) { toast.error("Enter a valid fee"); return; }
                  acceptRoster.mutate({ rosterId: acceptModal.rosterId, creatorFee: fee });
                }}
                disabled={acceptRoster.isPending}
                className="flex-1 py-2 bg-signal text-background font-mono text-[9px] tracking-widest rounded hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {acceptRoster.isPending ? "ACCEPTING…" : "CONFIRM & ACCEPT"}
              </button>
              <button
                onClick={() => { setAcceptModal(null); setAcceptFee(""); }}
                className="px-4 py-2 border border-border font-mono text-[9px] tracking-widest text-muted-foreground hover:text-foreground rounded"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {disputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-xs text-foreground font-bold tracking-widest">FILE A DISPUTE</p>
              <button onClick={() => setDisputeModal(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="font-mono text-[9px] text-muted-foreground mb-4">
              Disputes are reviewed by the Vyral admin team within 24 hours.
            </p>
            <input
              type="text"
              placeholder="Reason (e.g. Content not delivered)"
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              className="w-full bg-background border border-border rounded px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 mb-3"
            />
            <textarea
              placeholder="Describe the issue in detail…"
              value={disputeDesc}
              onChange={(e) => setDisputeDesc(e.target.value)}
              rows={3}
              className="w-full bg-background border border-border rounded px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 resize-none mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!disputeReason.trim()) { toast.error("Please enter a reason"); return; }
                  createDispute.mutate({ campaignId, rosterId: disputeModal.rosterId, reason: disputeReason, description: disputeDesc || undefined });
                }}
                disabled={createDispute.isPending}
                className="flex-1 py-2 bg-destructive text-destructive-foreground font-mono text-[9px] tracking-widest rounded hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {createDispute.isPending ? "FILING..." : "FILE DISPUTE"}
              </button>
              <button
                onClick={() => setDisputeModal(null)}
                className="px-4 py-2 border border-border font-mono text-[9px] tracking-widest text-muted-foreground hover:text-foreground rounded"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
