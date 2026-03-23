import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { toast } from "sonner";
import { Lock, ArrowLeft, Calendar, DollarSign, Tag, CheckCircle, XCircle } from "lucide-react";

export default function CreatorCampaignView() {
  const [, params] = useRoute("/creator/campaigns/:id");
  const campaignId = params?.id ? parseInt(params.id) : 0;
  const [, setLocation] = useLocation();

  const { data: campaign, isLoading } = trpc.advertiser.getCampaign.useQuery(
    { id: campaignId },
    { enabled: !!campaignId }
  );
  const { data: profile } = trpc.creator.getProfile.useQuery();
  const { data: myRoster = [] } = trpc.creator.getMyRosterEntries.useQuery();

  const applyToCampaign = trpc.creator.applyCampaign.useMutation({
    onSuccess: () => toast.success("Application submitted!"),
    onError: (err) => toast.error(err.message),
  });

  const isVerified = profile?.verificationStatus === "verified";
  const alreadyApplied = myRoster.some((r: any) => r.campaignId === campaignId);

  function handleApply() {
    if (!isVerified) {
      toast.error("You must be verified to apply to campaigns.");
      return;
    }
    applyToCampaign.mutate({ campaignId });
  }

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

  const hashtags: string[] = (() => {
    try { return JSON.parse(typeof campaign.requiredHashtags === "string" ? campaign.requiredHashtags : "[]"); } catch { return []; }
  })();

  const platforms: string[] = (() => {
    try { return JSON.parse((campaign as any).targetPlatforms ?? "[]"); } catch { return []; }
  })();

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-3xl">
        {/* Back */}
        <button
          onClick={() => setLocation("/creator/dashboard")}
          className="flex items-center gap-1.5 font-mono text-[9px] text-muted-foreground tracking-widest hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-3 h-3" /> BACK TO DASHBOARD
        </button>

        {/* Header */}
        <div className="bg-card border border-border rounded-lg p-6 mb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-mono text-[8px] text-signal border border-signal/40 rounded px-1.5 py-0.5 tracking-widest uppercase">
                  ● ACTIVE
                </span>
                <span className="font-mono text-[8px] text-muted-foreground border border-border rounded px-1.5 py-0.5 tracking-widest uppercase">
                  {campaign.category}
                </span>
                <span className="font-mono text-[8px] text-muted-foreground border border-border rounded px-1.5 py-0.5 tracking-widest uppercase">
                  {campaign.contentType?.replace("_", " ")}
                </span>
                <span className="font-mono text-[8px] text-muted-foreground border border-border rounded px-1.5 py-0.5 tracking-widest uppercase">
                  {campaign.castingMode?.replace("_", " ")}
                </span>
              </div>
              <h1 className="font-display text-3xl md:text-4xl tracking-wider text-foreground uppercase">
                {campaign.title}
              </h1>
            </div>

            {/* Apply button */}
            <div className="shrink-0">
              {alreadyApplied ? (
                <span className="inline-flex items-center gap-1.5 font-mono text-[9px] text-signal border border-signal/40 rounded px-4 py-2.5 tracking-widest">
                  <CheckCircle className="w-3 h-3" /> APPLIED
                </span>
              ) : (
                <button
                  onClick={handleApply}
                  disabled={applyToCampaign.isPending}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-primary text-primary-foreground font-mono text-xs tracking-widest rounded hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {!isVerified && <Lock className="w-3 h-3" />}
                  {applyToCampaign.isPending ? "APPLYING…" : "APPLY NOW"}
                </button>
              )}
            </div>
          </div>

          {!isVerified && (
            <p className="font-mono text-[9px] text-gold mt-3">
              ⚠ You need to be verified to apply. Go to your profile to submit for verification.
            </p>
          )}
        </div>

        {/* Key stats row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-3 h-3 text-signal" />
              <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">BUDGET</p>
            </div>
            <p className="font-mono text-xl font-bold text-signal">
              ${Number(campaign.budget).toLocaleString()}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">DEADLINE</p>
            </div>
            <p className="font-mono text-sm font-bold text-foreground">
              {new Date(campaign.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
          {platforms.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Tag className="w-3 h-3 text-muted-foreground" />
                <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase">PLATFORMS</p>
              </div>
              <p className="font-mono text-xs text-foreground capitalize">{platforms.join(", ")}</p>
            </div>
          )}
        </div>

        {/* Description */}
        {campaign.description && (
          <div className="bg-card border border-border rounded-lg p-6 mb-4">
            <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-3">ABOUT THIS CAMPAIGN</p>
            <p className="text-sm text-foreground leading-relaxed">{campaign.description}</p>
          </div>
        )}

        {/* Deliverables */}
        {campaign.deliverables && (
          <div className="bg-card border border-border rounded-lg p-6 mb-4">
            <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-3">DELIVERABLES</p>
            <p className="text-sm text-foreground leading-relaxed">{campaign.deliverables}</p>
          </div>
        )}

        {/* Posting window */}
        {(campaign.postingWindowStart || campaign.postingWindowEnd) && (
          <div className="bg-card border border-border rounded-lg p-6 mb-4">
            <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-3">POSTING WINDOW</p>
            <p className="font-mono text-xs text-foreground">
              {campaign.postingWindowStart
                ? new Date(campaign.postingWindowStart).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "—"}
              {" "} → {" "}
              {campaign.postingWindowEnd
                ? new Date(campaign.postingWindowEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "—"}
            </p>
          </div>
        )}

        {/* Content dos / don'ts */}
        {(campaign.contentDos || campaign.contentDonts) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {campaign.contentDos && (
              <div className="bg-card border border-border rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-3.5 h-3.5 text-signal" />
                  <p className="font-mono text-[9px] text-signal tracking-widest uppercase font-bold">DO</p>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{campaign.contentDos}</p>
              </div>
            )}
            {campaign.contentDonts && (
              <div className="bg-card border border-border rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  <XCircle className="w-3.5 h-3.5 text-destructive" />
                  <p className="font-mono text-[9px] text-destructive tracking-widest uppercase font-bold">DON'T</p>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{campaign.contentDonts}</p>
              </div>
            )}
          </div>
        )}

        {/* Required hashtags */}
        {hashtags.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-5 mb-4">
            <p className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase mb-3">REQUIRED HASHTAGS</p>
            <div className="flex flex-wrap gap-2">
              {hashtags.map((tag: string) => (
                <span key={tag} className="font-mono text-xs text-primary bg-primary/10 border border-primary/20 rounded px-2.5 py-1">
                  {tag.startsWith("#") ? tag : `#${tag}`}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Brand info */}
        <div className="bg-black/40 border border-border rounded-lg p-4 flex items-center justify-between">
          <p className="font-mono text-[9px] text-muted-foreground tracking-widest">POSTED BY BRAND #{campaign.advertiserId}</p>
          <button
            onClick={() => setLocation(`/brand/profile/${campaign.advertiserId}`)}
            className="font-mono text-[9px] text-primary tracking-widest hover:underline"
          >
            VIEW BRAND →
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
